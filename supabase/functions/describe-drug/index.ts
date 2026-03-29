import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  medication_id: z.string().uuid(),
  medication_name: z.string().min(1),
  dosage: z.string().nullable().optional(),
  patient_id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { medication_id, medication_name, dosage, patient_id } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Check if description already exists
    const { data: existing } = await sb
      .from("drug_descriptions")
      .select("*")
      .eq("medication_id", medication_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const medLabel = dosage ? `${medication_name} ${dosage}` : medication_name;

    const prompt = `Explain this medication to a patient in plain English. No jargon. Write at an 8th grade reading level. Return ONLY valid JSON:
{
  "what_it_does": "one sentence explaining what condition it treats",
  "how_it_works": "one sentence explaining how it works in the body",
  "common_side_effects": ["3-4 short strings"],
  "what_to_avoid": "one sentence on food, drink or activities to avoid",
  "important_note": "Always consult your doctor before making any changes to your medication."
}

Medication: ${medLabel}`;

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

    const { data: saved, error: saveErr } = await sb.from("drug_descriptions").insert({
      medication_id,
      plain_description: `${result.what_it_does} ${result.how_it_works}`,
      side_effects: (result.common_side_effects || []).join(", "),
      avoid: result.what_to_avoid || null,
    }).select("*").single();

    if (saveErr) console.error("Save error:", saveErr);

    return new Response(JSON.stringify({ ...saved, _ai: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("describe-drug error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
