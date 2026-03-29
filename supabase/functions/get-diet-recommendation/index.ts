import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({ patient_id: z.string().uuid() });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { patient_id } = parsed.data;

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get abnormal markers
    const { data: abnormalMarkers } = await sb
      .from("markers")
      .select("name, value, unit, status, date")
      .eq("patient_id", patient_id)
      .in("status", ["low", "high", "Low", "High"])
      .order("date", { ascending: false })
      .limit(20);

    // Get medications
    const { data: meds } = await sb
      .from("medications")
      .select("name, dosage, frequency")
      .eq("patient_id", patient_id);

    if ((!abnormalMarkers || abnormalMarkers.length === 0) && (!meds || meds.length === 0)) {
      return new Response(JSON.stringify({ recommendations: [], disclaimer: "No abnormal markers found. Keep up the good work!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const patientData = JSON.stringify({ abnormal_markers: abnormalMarkers, medications: meds });

    const prompt = `A patient has the following abnormal lab results and medications. Generate specific, actionable dietary recommendations. Be specific about food names. Explain in one sentence why each food helps. Do not give generic advice. Return ONLY valid JSON:
{
  "recommendations": [
    {
      "nutrient": "string",
      "reason": "one sentence explaining why this matters for their specific results",
      "foods": ["4-5 specific food names"],
      "tip": "one practical tip"
    }
  ],
  "disclaimer": "These suggestions support your health but do not replace medical advice. Discuss with your doctor."
}

Patient data: ${patientData}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(content);

    // Save to diet_recommendations
    await sb.from("diet_recommendations").insert({
      patient_id,
      content: JSON.stringify(result),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diet-rec error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
