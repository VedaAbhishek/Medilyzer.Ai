import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReportCard from "./ReportCard";

interface Report {
  id: string;
  file_url: string | null;
  type: string;
  upload_date: string;
  raw_text: string | null;
}

interface ReportsListProps {
  patientId: string | null;
  onDeleteComplete: () => void;
}

const ReportsList = ({ patientId, onDeleteComplete }: ReportsListProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("medical_records")
      .select("id, file_url, type, upload_date, raw_text")
      .eq("patient_id", patientId)
      .order("upload_date", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [patientId]);

  if (loading) {
    return <p className="text-base text-muted-foreground">Loading…</p>;
  }

  if (reports.length === 0) {
    return <p className="text-base text-muted-foreground">No reports uploaded yet</p>;
  }

  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          patientId={patientId!}
          onDeleteComplete={() => {
            fetchReports();
            onDeleteComplete();
          }}
        />
      ))}
    </div>
  );
};

export default ReportsList;
