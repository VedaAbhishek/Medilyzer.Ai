import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-client-version",
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

    const { data: abnormalMarkers } = await sb
      .from("markers")
      .select("name, value, unit, status, date")
      .eq("patient_id", patient_id)
      .in("status", ["low", "high", "Low", "High"])
      .order("date", { ascending: false })
      .limit(20);

    const { data: meds } = await sb
      .from("medications")
      .select("name, dosage, frequency")
      .eq("patient_id", patient_id);

    if ((!abnormalMarkers || abnormalMarkers.length === 0) && (!meds || meds.length === 0)) {
      return new Response(JSON.stringify({ foods_to_eat: [], foods_to_avoid: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const patientData = JSON.stringify({ abnormal_markers: abnormalMarkers, medications: meds });

    const prompt = `A patient has these abnormal lab results and medications. Generate two lists of specific foods.

RULES:
- Use everyday food names only. No medical terms. No jargon.
- Each reason must be EXACTLY 5 words or fewer in plain English. Examples: "Boosts your B12 levels", "Helps lower blood sugar", "Good for your liver"
- Pick a single relevant food emoji for each item
- Include 8-12 foods in each list
- Do NOT use terms like "hepatoprotective", "anti-inflammatory", "polyphenols", "ALT", "AST", "CRP", "ESR", "TSH"
- Use words like "blood sugar" not "glucose", "thyroid" not "TSH", "liver health" not "hepatic function"

Return ONLY valid JSON in this exact format:
{
  "foods_to_eat": [
    { "emoji": "🥦", "name": "Broccoli", "reason": "Helps lower blood sugar" }
  ],
  "foods_to_avoid": [
    { "emoji": "🍩", "name": "Donuts", "reason": "Spikes your blood sugar" }
  ]
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
