import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  record_id: z.string().uuid(),
  patient_id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { record_id, patient_id } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: summaries }, { data: markers }, { data: medications }] = await Promise.all([
      supabase.from("summaries").select("plain_text").eq("record_id", record_id).eq("patient_id", patient_id),
      supabase.from("markers").select("name, value, unit, status").eq("record_id", record_id).eq("patient_id", patient_id),
      supabase.from("medications").select("name, dosage, frequency").eq("patient_id", patient_id),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const reportData = {
      summary: summaries?.[0]?.plain_text || "No summary available",
      markers: markers || [],
      medications: medications || [],
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Based on this medical report, what type of specialist would be most appropriate for a second opinion? Consider the diagnoses, test results, and medications.

Return ONLY valid JSON:
{
  "specialty": "string e.g. Cardiologist",
  "search_term": "string — keyword to search for this doctor type",
  "reason": "one plain English sentence explaining why this specialist is appropriate"
}`,
          },
          {
            role: "user",
            content: `Report data: ${JSON.stringify(reportData)}`,
          },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
