import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Marker {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
}

export function usePatientData() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get or create patient record
    let { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!patient) {
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({ user_id: user.id, name: user.user_metadata?.name || "Patient" })
        .select("id")
        .single();
      patient = newPatient;
    }

    if (patient) {
      setPatientId(patient.id);

      // Fetch latest markers (most recent date first, deduplicated by name)
      const { data: markerRows } = await supabase
        .from("markers")
        .select("name, value, unit, status, date")
        .eq("patient_id", patient.id)
        .order("date", { ascending: false })
        .limit(50);

      if (markerRows && markerRows.length > 0) {
        const seen = new Set<string>();
        const latest: Marker[] = [];
        for (const m of markerRows) {
          if (!seen.has(m.name)) {
            seen.add(m.name);
            latest.push({ name: m.name, value: Number(m.value), unit: m.unit, status: m.status });
          }
        }
        setMarkers(latest);
      } else {
        setMarkers([]);
      }

      // Fetch latest summary
      const { data: summaryRows } = await supabase
        .from("summaries")
        .select("plain_text")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(1);

      setSummary(summaryRows?.[0]?.plain_text || null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { patientId, markers, summary, loading, refetch: fetchData };
}
