import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
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

    const { latitude, longitude } = parsed.data;
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) throw new Error("GEOAPIFY_API_KEY not set");

    const url = `https://api.geoapify.com/v2/places?categories=healthcare.hospital,healthcare.clinic_or_praxis&filter=circle:${longitude},${latitude},16000&limit=9&apiKey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const places = (data.features || []).map((f: any) => {
      const p = f.properties;
      const dist = p.distance; // meters
      return {
        name: p.name || "Medical Clinic",
        address: [p.address_line1, p.address_line2].filter(Boolean).join(", ") || p.formatted || "Address not available",
        distance_miles: dist ? +(dist / 1609.34).toFixed(1) : null,
        lat: p.lat,
        lon: p.lon,
      };
    });

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
