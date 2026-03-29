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

    const [{ data: allMarkers }, { data: meds }, { data: patientRow }] = await Promise.all([
      sb.from("markers").select("name, value, unit, status, ref_min, ref_max, date").eq("patient_id", patient_id).order("date", { ascending: false }).limit(50),
      sb.from("medications").select("name, dosage, frequency").eq("patient_id", patient_id),
      sb.from("patients").select("diet_preferences").eq("id", patient_id).maybeSingle(),
    ]);

    if ((!allMarkers || allMarkers.length === 0) && (!meds || meds.length === 0)) {
      return new Response(JSON.stringify({ deficiencies: [], foods_to_eat: [], foods_to_avoid: [], meal_plan: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dietPrefs = patientRow?.diet_preferences;
    const dietPrefsText = dietPrefs
      ? `\n\nPatient diet preferences: ${JSON.stringify(dietPrefs)}\nIMPORTANT: All food recommendations and meal plans MUST respect these dietary preferences. Do not suggest foods that conflict with the patient's diet type, food allergies, or cuisine preferences.`
      : "";

    const prompt = `Based on this patient's lab results and medications, generate a personalised food guide.

Return ONLY valid JSON:
{
  "deficiencies": [
    { "nutrient": "string", "level": "string e.g. Hb 11.2", "severity": "low or medium or high" }
  ],
  "foods_to_eat": [
    { "emoji": "string", "name": "string", "reason": "string max 5 words", "nutrients": ["string"], "serving": "string e.g. 80-100g" }
  ],
  "foods_to_avoid": [
    { "emoji": "string", "name": "string", "reason": "string max 5 words", "nutrients": ["string"] }
  ],
  "meal_plan": {
    "monday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "tuesday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "wednesday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "thursday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "friday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "saturday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" },
    "sunday": { "breakfast": "string", "lunch": "string", "snack": "string", "dinner": "string" }
  }
}

RULES:
- Use everyday food names only. No medical terms. No jargon.
- Each reason must be EXACTLY 5 words or fewer in plain English.
- Pick a single relevant food emoji for each item
- Include 8-12 foods in each list
- Base all recommendations strictly on the patient's actual lab data
- Do not invent deficiencies not present in the data
- Use only foods from credible nutrition sources
- IMPORTANT: The nutrients array for each food MUST contain the nutrient names it is rich in (e.g. ["Iron", "B12", "Folate"])

Patient markers: ${JSON.stringify(allMarkers)}
Patient medications: ${JSON.stringify(meds)}${dietPrefsText}`;

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
