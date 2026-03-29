import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Marker {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
  ref_min: number | null;
  ref_max: number | null;
}

interface TrendPoint {
  date: string;
  name: string;
  value: number;
}

interface PatientInfo {
  id: string;
  name: string;
  blood_type: string | null;
  conditions: string[] | null;
  allergies: string[] | null;
  dob: string | null;
}

interface MedicationInfo {
  name: string;
  dosage: string | null;
}

export function usePatientData() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [medications, setMedications] = useState<MedicationInfo[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [hasReports, setHasReports] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get or create patient record
    let { data: patientRow } = await supabase
      .from("patients")
      .select("id, name, blood_type, conditions, allergies, dob")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!patientRow) {
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({ user_id: user.id, name: user.user_metadata?.name || "Patient" })
        .select("id, name, blood_type, conditions, allergies, dob")
        .single();
      patientRow = newPatient;
    }

    if (patientRow) {
      setPatientId(patientRow.id);
      setPatient(patientRow);

      // Check if any medical records exist
      const { count } = await supabase
        .from("medical_records")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientRow.id);

      setHasReports((count ?? 0) > 0);

      // Fetch latest markers (deduplicated by name)
      const { data: markerRows } = await supabase
        .from("markers")
        .select("name, value, unit, status, date, ref_min, ref_max")
        .eq("patient_id", patientRow.id)
        .order("date", { ascending: false })
        .limit(50);

      if (markerRows && markerRows.length > 0) {
        const seen = new Set<string>();
        const latest: Marker[] = [];
        for (const m of markerRows) {
          if (!seen.has(m.name)) {
            seen.add(m.name);
            latest.push({ name: m.name, value: Number(m.value), unit: m.unit, status: m.status, ref_min: m.ref_min ? Number(m.ref_min) : null, ref_max: m.ref_max ? Number(m.ref_max) : null });
          }
        }
        setMarkers(latest);

        // Build trend data from all markers
        const trendPoints: TrendPoint[] = markerRows.map((m) => ({
          date: m.date || "",
          name: m.name,
          value: Number(m.value),
        }));
        setTrends(trendPoints);
      } else {
        setMarkers([]);
        setTrends([]);
      }

      // Fetch medications
      const { data: medRows } = await supabase
        .from("medications")
        .select("name, dosage")
        .eq("patient_id", patientRow.id);
      setMedications(medRows || []);

      // Fetch latest summary
      const { data: summaryRows } = await supabase
        .from("summaries")
        .select("plain_text")
        .eq("patient_id", patientRow.id)
        .order("created_at", { ascending: false })
        .limit(1);

      setSummary(summaryRows?.[0]?.plain_text || null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { patientId, patient, markers, trends, summary, hasReports, loading, medications, refetch: fetchData };
}
