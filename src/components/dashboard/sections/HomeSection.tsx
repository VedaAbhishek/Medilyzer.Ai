import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrendsChart from "@/components/dashboard/TrendsChart";
import HealthRing from "@/components/dashboard/HealthRing";
import MedicationSchedule from "@/components/dashboard/MedicationSchedule";
import { Printer, UserPen, ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

interface Medication {
  name: string;
  dosage: string | null;
  frequency: string | null;
}

interface HomeSectionProps {
  patient: { name: string; blood_type: string | null; conditions: string[] | null; allergies: string[] | null; dob?: string | null } | null;
  profileName: string;
  markers: Marker[];
  trends: TrendPoint[];
  summary: string | null;
  hasReports: boolean;
  loading: boolean;
  patientId: string | null;
  refetch: () => void;
  medications: Medication[];
}

const friendlyNames: Record<string, string> = {
  glucose: "Blood Sugar", hba1c: "Avg Blood Sugar", tsh: "Thyroid", rbc: "Red Blood Cells",
  wbc: "White Blood Cells", hemoglobin: "Hemoglobin", hb: "Hemoglobin", platelets: "Platelets",
  creatinine: "Kidney Function", bun: "Kidney Waste", alt: "Liver (ALT)", ast: "Liver (AST)",
  cholesterol: "Cholesterol", ldl: "Bad Cholesterol", hdl: "Good Cholesterol", triglycerides: "Triglycerides",
  b12: "Vitamin B12", "vitamin b12": "Vitamin B12", "vitamin d": "Vitamin D", iron: "Iron",
  ferritin: "Iron Stores", calcium: "Calcium", sodium: "Sodium", potassium: "Potassium",
};

const getFriendlyName = (name: string) => friendlyNames[name.toLowerCase().trim()] || name;

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "✅ Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "🔻 Low", className: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "🔺 High", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "⚠️ Attention", className: "bg-red-100 text-red-800 border-red-300" },
};

const computeAge = (dob: string | null | undefined): string | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return `${age} years old`;
};

interface HealthSummaryRow {
  name: string;
  firstValue: number;
  latestValue: number;
  unit: string | null;
  latestStatus: string | null;
  change: "improved" | "declined" | "stable";
}

const HomeSection = ({ patient, profileName, markers, trends, summary, hasReports, loading, patientId, medications }: HomeSectionProps) => {
  const age = computeAge(patient?.dob);
  const navigate = useNavigate();
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [healthRows, setHealthRows] = useState<HealthSummaryRow[]>([]);
  const [multipleReports, setMultipleReports] = useState(false);

  const handlePrint = () => window.print();

  // Build cross-report health summary from trends
  useEffect(() => {
    if (!patientId || trends.length === 0) return;

    // Group trends by marker name
    const byName = new Map<string, TrendPoint[]>();
    trends.forEach(t => {
      if (!byName.has(t.name)) byName.set(t.name, []);
      byName.get(t.name)!.push(t);
    });

    const uniqueDates = new Set(trends.map(t => t.date));
    setMultipleReports(uniqueDates.size > 1);

    const rows: HealthSummaryRow[] = [];
    byName.forEach((points, name) => {
      // Sort by date ascending
      const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const marker = markers.find(m => m.name === name);
      const isNormal = marker?.status?.toLowerCase() === "normal";

      let change: "improved" | "declined" | "stable" = "stable";
      if (sorted.length >= 2) {
        const diff = latest.value - first.value;
        if (Math.abs(diff) < 0.01) {
          change = "stable";
        } else if (isNormal) {
          change = "improved"; // ended normal
        } else {
          change = "declined";
        }
      }

      rows.push({
        name,
        firstValue: first.value,
        latestValue: latest.value,
        unit: marker?.unit || null,
        latestStatus: marker?.status || null,
        change: sorted.length < 2 ? "stable" : change,
      });
    });

    // Sort: abnormal first
    rows.sort((a, b) => {
      const aAbnormal = a.latestStatus?.toLowerCase() !== "normal" ? 0 : 1;
      const bAbnormal = b.latestStatus?.toLowerCase() !== "normal" ? 0 : 1;
      return aAbnormal - bAbnormal;
    });

    setHealthRows(rows);
  }, [patientId, trends, markers]);

  // Generate AI health summary
  useEffect(() => {
    if (!patientId || markers.length === 0) return;

    const generateSummary = async () => {
      const { data: existing } = await supabase
        .from("summaries")
        .select("plain_text")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing?.[0]?.plain_text) {
        setAiSummary(existing[0].plain_text);
        return;
      }

      setSummaryLoading(true);
      try {
        const { data: allMarkers } = await supabase
          .from("markers")
          .select("name, value, unit, status, ref_min, ref_max")
          .eq("patient_id", patientId)
          .order("date", { ascending: false })
          .limit(50);

        const { data: allMeds } = await supabase
          .from("medications")
          .select("name, dosage, frequency")
          .eq("patient_id", patientId);

        const { data, error } = await supabase.functions.invoke("ask-health-question", {
          body: {
            patient_id: patientId,
            messages: [{
              role: "user",
              content: `Generate a health summary. Here is my data:\n\nMarkers: ${JSON.stringify(allMarkers || [])}\n\nMedications: ${JSON.stringify(allMeds || [])}\n\nWrite a clear and honest health summary based only on this data. Structure in 3 short paragraphs: 1) What looks good (normal results), 2) What needs attention (abnormal results only if they exist), 3) One general suggestion. Maximum 120 words. Do not end with "Remember to talk to your doctor about this." for this response.`
            }],
          },
        });

        if (data instanceof ReadableStream) {
          const reader = data.getReader();
          const decoder = new TextDecoder();
          let result = "";
          let textBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });

            let idx: number;
            while ((idx = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, idx);
              textBuffer = textBuffer.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) result += content;
              } catch { /* ignore */ }
            }
          }

          if (result) {
            setAiSummary(result);
            await supabase.from("summaries").insert({ patient_id: patientId, plain_text: result });
          }
        }
      } catch (err) {
        console.error("Summary generation failed:", err);
      } finally {
        setSummaryLoading(false);
      }
    };

    generateSummary();
  }, [patientId, markers.length]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Card><CardContent className="p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-72" />
        </CardContent></Card>
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-8 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent></Card>
        ))}
      </div>
    );
  }

  const displaySummary = aiSummary || summary;

  return (
    <div className="space-y-8 print:space-y-6">
      {/* HERO — Health Overview Ring */}
      <Card>
        <CardContent className="p-8">
          <HealthRing markers={markers} loading={loading} />
        </CardContent>
      </Card>

      {/* SECTION 1 — Patient Profile Header */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-3xl font-bold text-foreground">{patient?.name || profileName}</h1>
                {age && <span className="text-lg text-muted-foreground">{age}</span>}
                {patient?.blood_type && (
                  <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                    Blood Type: {patient.blood_type}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {patient?.conditions && patient.conditions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Conditions</span>
                    {patient.conditions.map(c => (
                      <Badge key={c} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-sm">{c}</Badge>
                    ))}
                  </div>
                )}
                {patient?.allergies && patient.allergies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Allergies</span>
                    {patient.allergies.map(a => (
                      <Badge key={a} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 text-sm">{a}</Badge>
                    ))}
                  </div>
                )}
                {(!patient?.conditions || patient.conditions.length === 0) && (!patient?.allergies || patient.allergies.length === 0) && (
                  <p className="text-base text-muted-foreground">No conditions or allergies on record.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 shrink-0 self-start print:hidden">
              <Button variant="outline" onClick={() => navigate("/setup-profile")} className="gap-2">
                <UserPen className="h-4 w-4" /> Edit Profile
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Share with Doctor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 — AI Health Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-8 space-y-3">
          <h2 className="text-xl font-bold text-foreground">Your Overall Health Summary — Based on all your uploaded reports</h2>
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating your health summary...</span>
            </div>
          ) : (
            <>
              <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
                {displaySummary || "Upload a report to see your health summary."}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                This summary is based only on your uploaded reports. Always consult your doctor for medical advice.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3 — Trends (Collapsible) */}
      <div className="space-y-0">
        <button
          onClick={() => setTrendsOpen(!trendsOpen)}
          className="w-full flex items-center justify-between py-4 px-1 text-left"
        >
          <h2 className="text-2xl font-bold text-foreground">How Your Results Are Trending</h2>
          {trendsOpen ? <ChevronUp className="h-6 w-6 text-muted-foreground" /> : <ChevronDown className="h-6 w-6 text-muted-foreground" />}
        </button>
        {trendsOpen && (
          <div className="pt-2">
            {trends.length > 0 ? (
              <TrendsChart trends={trends} markers={markers} />
            ) : (
              <Card><CardContent className="p-8 text-center">
                <p className="text-base text-muted-foreground">Upload reports over time to see how your health is trending.</p>
              </CardContent></Card>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4 — Current Medications */}
      <MedicationSchedule medications={medications} patientId={patientId} />

      {/* SECTION 5 — Overall Health Summary Table (replaces Latest Test Results) */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-foreground">Overall Health Summary</h2>
        <Card>
          <CardContent className="p-6">
            {healthRows.length > 0 && multipleReports ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-sm font-medium text-muted-foreground py-3 pr-4">Marker</th>
                      <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">First Value</th>
                      <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Latest Value</th>
                      <th className="text-center text-sm font-medium text-muted-foreground py-3 px-4">Change</th>
                      <th className="text-right text-sm font-medium text-muted-foreground py-3 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthRows.map(row => {
                      const status = (row.latestStatus || "normal").toLowerCase();
                      const config = statusConfig[status] || statusConfig.normal;
                      return (
                        <tr key={row.name} className="border-b border-border last:border-0">
                          <td className="text-base font-medium text-foreground py-3 pr-4">{getFriendlyName(row.name)}</td>
                          <td className="text-right text-sm text-muted-foreground py-3 px-4">
                            {row.firstValue} {row.unit || ""}
                          </td>
                          <td className="text-right text-base font-semibold text-foreground py-3 px-4">
                            {row.latestValue} {row.unit || ""}
                          </td>
                          <td className="text-center py-3 px-4">
                            {row.change === "improved" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                                <TrendingUp className="h-4 w-4" /> Improving
                              </span>
                            ) : row.change === "declined" ? (
                              <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                                <TrendingDown className="h-4 w-4" /> Declining
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground text-sm font-medium">
                                <Minus className="h-4 w-4" /> Stable
                              </span>
                            )}
                          </td>
                          <td className="text-right py-3 pl-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
                              {config.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-base text-muted-foreground text-center py-4">
                {markers.length === 0
                  ? "Upload a lab report to see your results here."
                  : "Upload more reports over time to see how your health has changed."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomeSection;
