import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  file_url: z.string().url(),
  patient_id: z.string().uuid(),
});

const SYSTEM_PROMPT = `You are a medical data extraction assistant. Extract all lab markers and medications from the medical report text below. Return ONLY valid JSON with no explanation, no markdown, no code blocks. Use exactly this schema:
{
  "report_date": "YYYY-MM-DD string or null",
  "report_type": "bloodwork or prescription or other",
  "markers": [
    {
      "name": "string",
      "value": "number",
      "unit": "string",
      "ref_min": "number or null",
      "ref_max": "number or null",
      "status": "normal or low or high or critical"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string"
    }
  ],
  "plain_summary": "a single 2-3 sentence plain English summary of what these results mean for the patient, no jargon"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_url, patient_id } = parsed.data;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Download the PDF from storage
    // Extract the storage path from the full URL
    const urlObj = new URL(file_url);
    const pathMatch = urlObj.pathname.match(/\/object\/(?:public|sign)\/medical-records\/(.+)/);
    let pdfBytes: Uint8Array;

    if (pathMatch) {
      const storagePath = decodeURIComponent(pathMatch[1]);
      const { data: fileData, error: dlError } = await supabase.storage
        .from("medical-records")
        .download(storagePath);
      if (dlError || !fileData) {
        throw new Error(`Failed to download PDF: ${dlError?.message}`);
      }
      pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    } else {
      // Fallback: fetch directly
      const resp = await fetch(file_url);
      if (!resp.ok) throw new Error("Failed to fetch PDF from URL");
      pdfBytes = new Uint8Array(await resp.arrayBuffer());
    }

    // Convert to base64 in chunks to avoid stack overflow on large files
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const pdfBase64 = btoa(binary);

    // Call Lovable AI Gateway with PDF as inline data
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: "report.pdf",
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract all lab markers and medications from this medical report PDF. Return only valid JSON.",
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI API error ${aiResp.status}: ${errText}`);
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const extraction = JSON.parse(content);

    // Create a medical_record entry
    const { data: record, error: recErr } = await supabase
      .from("medical_records")
      .insert({
        patient_id,
        type: extraction.report_type || "other",
        file_url,
        raw_text: content,
        upload_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (recErr) throw new Error(`Failed to save record: ${recErr.message}`);

    const recordId = record.id;
    const reportDate = extraction.report_date || new Date().toISOString().split("T")[0];

    // Save markers
    const markers = (extraction.markers || []).map((m: any) => ({
      patient_id,
      record_id: recordId,
      name: m.name,
      value: m.value,
      unit: m.unit || null,
      ref_min: m.ref_min ?? null,
      ref_max: m.ref_max ?? null,
      status: m.status || null,
      date: reportDate,
    }));

    if (markers.length > 0) {
      const { error: mErr } = await supabase.from("markers").insert(markers);
      if (mErr) throw new Error(`Failed to save markers: ${mErr.message}`);
    }

    // Save medications
    const meds = (extraction.medications || []).map((m: any) => ({
      patient_id,
      record_id: recordId,
      name: m.name,
      dosage: m.dosage || null,
      frequency: m.frequency || null,
      start_date: reportDate,
    }));

    if (meds.length > 0) {
      const { error: medErr } = await supabase.from("medications").insert(meds);
      if (medErr) throw new Error(`Failed to save medications: ${medErr.message}`);
    }

    // Save summary
    if (extraction.plain_summary) {
      const { error: sumErr } = await supabase.from("summaries").insert({
        patient_id,
        record_id: recordId,
        plain_text: extraction.plain_summary,
      });
      if (sumErr) throw new Error(`Failed to save summary: ${sumErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        markers_count: markers.length,
        medications_count: meds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-medical-pdf error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
