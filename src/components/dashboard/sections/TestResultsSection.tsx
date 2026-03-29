import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus, Pill } from "lucide-react";
import { format } from "date-fns";

interface TestResultsSectionProps {
  patientId: string | null;
}

interface Report {
  id: string;
  file_url: string | null;
  type: string;
  upload_date: string;
}

interface Marker {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
  ref_min: number | null;
  ref_max: number | null;
  date: string | null;
  record_id: string | null;
}

interface Medication {
  name: string;
  dosage: string | null;
}

const friendlyNames: Record<string, string> = {
  glucose: "Blood Sugar", hba1c: "Average Blood Sugar (3 months)", tsh: "Thyroid Level",
  rbc: "Red Blood Cells", wbc: "White Blood Cells", hemoglobin: "Hemoglobin", hb: "Hemoglobin",
  platelets: "Platelets", creatinine: "Kidney Function", bun: "Kidney Waste Level",
  alt: "Liver Health (ALT)", ast: "Liver Health (AST)", cholesterol: "Cholesterol",
  ldl: "Bad Cholesterol", hdl: "Good Cholesterol", triglycerides: "Triglycerides",
  b12: "Vitamin B12", "vitamin b12": "Vitamin B12", "vitamin d": "Vitamin D",
  iron: "Iron Level", ferritin: "Iron Stores", calcium: "Calcium", sodium: "Sodium", potassium: "Potassium",
};

const getFriendlyName = (name: string) => friendlyNames[name.toLowerCase().trim()] || name;

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "✅ This is Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "🔻 This is Low", className: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "🔺 This is High", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "⚠️ Needs Attention", className: "bg-red-100 text-red-800 border-red-300" },
};

const COLORS = ["hsl(155 71% 37%)", "hsl(0 84% 60%)", "hsl(220 70% 55%)", "hsl(35 90% 55%)", "hsl(280 60% 55%)", "hsl(180 60% 40%)"];

const getFileName = (url: string | null) => {
  if (!url) return "Report";
  try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Report"); } catch { return "Report"; }
};

const TestResultsSection = ({ patientId }: TestResultsSectionProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportMarkers, setReportMarkers] = useState<Marker[]>([]);
  const [reportMedications, setReportMedications] = useState<Medication[]>([]);
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      setLoadingReports(true);
      const [{ data: reps }, { data: mkrs }] = await Promise.all([
        supabase.from("medical_records").select("id, file_url, type, upload_date").eq("patient_id", patientId).order("upload_date", { ascending: false }),
        supabase.from("markers").select("name, value, unit, status, ref_min, ref_max, date, record_id").eq("patient_id", patientId).order("date", { ascending: false }).limit(200),
      ]);
      setReports(reps || []);
      setAllMarkers((mkrs || []).map(m => ({ ...m, value: Number(m.value), ref_min: m.ref_min ? Number(m.ref_min) : null, ref_max: m.ref_max ? Number(m.ref_max) : null })));
      setLoadingReports(false);
    };
    load();
  }, [patientId]);

  useEffect(() => {
    if (!selectedReportId || !patientId) { setReportMarkers([]); setReportMedications([]); return; }
    const load = async () => {
      setLoadingDetails(true);
      const [{ data: mkrs }, { data: meds }] = await Promise.all([
        supabase.from("markers").select("name, value, unit, status, ref_min, ref_max, date, record_id").eq("record_id", selectedReportId),
        supabase.from("medications").select("name, dosage").eq("record_id", selectedReportId),
      ]);
      setReportMarkers((mkrs || []).map(m => ({ ...m, value: Number(m.value), ref_min: m.ref_min ? Number(m.ref_min) : null, ref_max: m.ref_max ? Number(m.ref_max) : null })));
      setReportMedications(meds || []);
      setLoadingDetails(false);
    };
    load();
  }, [selectedReportId, patientId]);

  // Build trend chart data for markers in the selected report
  const selectedMarkerNames = new Set(reportMarkers.map(m => m.name));
  const trendMarkers = allMarkers.filter(m => selectedMarkerNames.has(m.name) && m.date);
  const byDate = new Map<string, Record<string, number | string>>();
  for (const t of trendMarkers) {
    if (!byDate.has(t.date!)) byDate.set(t.date!, { date: t.date! });
    byDate.get(t.date!)![t.name] = t.value;
  }
  const chartData = [...byDate.values()].sort((a, b) => (a.date as string).localeCompare(b.date as string));
  const markerNames = [...selectedMarkerNames];
  const hasMultiplePoints = chartData.length > 1;

  // Trend indicators
  const getTrend = (name: string) => {
    const points = trendMarkers.filter(m => m.name === name).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (points.length < 2) return "stable";
    const last = points[points.length - 1].value;
    const prev = points[points.length - 2].value;
    const status = (points[points.length - 1].status || "normal").toLowerCase();
    if (status === "normal") {
      if (last > prev) return "improving";
      if (last < prev) return "declining";
      return "stable";
    }
    // If abnormal, moving toward normal range is improving
    if (status === "high") return last < prev ? "improving" : last > prev ? "declining" : "stable";
    if (status === "low") return last > prev ? "improving" : last < prev ? "declining" : "stable";
    return "stable";
  };

  if (loadingReports) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-foreground">My Test Results</h2>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-foreground">My Test Results</h2>

      {/* Report dropdown */}
      <Select value={selectedReportId || ""} onValueChange={(v) => setSelectedReportId(v)}>
        <SelectTrigger className="w-full max-w-lg text-base h-12">
          <SelectValue placeholder="Select a report to view its details" />
        </SelectTrigger>
        <SelectContent>
          {reports.map((r) => (
            <SelectItem key={r.id} value={r.id} className="text-base py-3">
              {getFileName(r.file_url)} — {format(new Date(r.upload_date), "MMM d, yyyy")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedReportId && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Select a report above to view its details</p>
          </CardContent>
        </Card>
      )}

      {selectedReportId && loadingDetails && (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {selectedReportId && !loadingDetails && (
        <div className="space-y-10">
          {/* SECTION 1 — Trends */}
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-foreground">How My Results Are Changing</h3>
            {hasMultiplePoints ? (
              <>
                <Card>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 13 }} stroke="hsl(210 10% 45%)" />
                        <YAxis tick={{ fontSize: 13 }} stroke="hsl(210 10% 45%)" />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} formatter={(v: string) => getFriendlyName(v)} />
                        {markerNames.map((name, i) => (
                          <Line key={name} type="monotone" dataKey={name} name={getFriendlyName(name)} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  {markerNames.map((name) => {
                    const trend = getTrend(name);
                    const latest = reportMarkers.find(m => m.name === name);
                    return (
                      <div key={name} className="flex items-center justify-between py-2 px-4 rounded-lg bg-card border border-border">
                        <span className="text-base font-medium text-foreground">{getFriendlyName(name)}</span>
                        <div className="flex items-center gap-3">
                          {trend === "improving" && <ArrowUp className="h-5 w-5 text-emerald-600" />}
                          {trend === "declining" && <ArrowDown className="h-5 w-5 text-red-600" />}
                          {trend === "stable" && <Minus className="h-5 w-5 text-muted-foreground" />}
                          <span className="text-base font-semibold text-foreground">{latest?.value} {latest?.unit || ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-base text-muted-foreground">Upload more reports over time to see how your results are changing</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* SECTION 2 — Medications */}
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-foreground">Current Medications</h3>
            {reportMedications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-base text-muted-foreground">No medications found in this report</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-3">
                  {reportMedications.map((med, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Pill className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-foreground">{med.name}</p>
                        {med.dosage && <p className="text-sm text-muted-foreground">{med.dosage}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* SECTION 3 — Test Results */}
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-foreground">Latest Test Results</h3>
            {reportMarkers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-base text-muted-foreground">No test results found in this report</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reportMarkers.map((m, i) => {
                  const status = (m.status || "normal").toLowerCase();
                  const config = statusConfig[status] || statusConfig.normal;
                  return (
                    <Card key={i}>
                      <CardContent className="p-5 flex items-center justify-between gap-4">
                        <p className="text-base font-medium text-foreground flex-1">{getFriendlyName(m.name)}</p>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{m.value} <span className="text-sm font-normal text-muted-foreground">{m.unit || ""}</span></p>
                          {m.ref_min != null && m.ref_max != null && (
                            <p className="text-xs text-muted-foreground">Normal range: {m.ref_min} – {m.ref_max} {m.unit || ""}</p>
                          )}
                        </div>
                        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${config.className}`}>
                          {config.label}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultsSection;
