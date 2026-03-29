import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  symptoms_text: z.string().min(1),
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

    const { symptoms_text, patient_id } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: markers } = await supabase
      .from("markers")
      .select("name, value, unit, status")
      .eq("patient_id", patient_id)
      .order("date", { ascending: false })
      .limit(20);

    const { data: medications } = await supabase
      .from("medications")
      .select("name, dosage, frequency")
      .eq("patient_id", patient_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

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
            content: `You are a medical navigation assistant. Based on the patient's symptoms and lab results, recommend the most appropriate medical specialist.

Do not diagnose. Only recommend a specialist type.

Return ONLY valid JSON:
{
  "specialty": "string e.g. Endocrinologist",
  "search_term": "string — the exact specialty keyword to search for nearby e.g. endocrinologist",
  "reason": "one plain English sentence, no jargon",
  "urgency": "routine or soon or urgent",
  "urgency_note": "one plain English sentence"
}`,
          },
          {
            role: "user",
            content: `Patient symptoms: ${symptoms_text}\n\nPatient lab results: ${JSON.stringify(markers || [])}\n\nPatient medications: ${JSON.stringify(medications || [])}`,
          },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(content);

    await supabase.from("symptom_checks").insert({
      patient_id,
      symptoms_text,
      recommended_specialty: result.specialty,
      ai_reasoning: JSON.stringify(result),
    });

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
