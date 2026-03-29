import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TrendsChart from "@/components/dashboard/TrendsChart";
import HealthRing from "@/components/dashboard/HealthRing";
import { Printer, Pill, TrendingUp, TrendingDown, Minus, FileText, UserPen } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  normal: { label: "✅ This is Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "🔻 This is Low", className: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "🔺 This is High", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "⚠️ Needs Attention", className: "bg-red-100 text-red-800 border-red-300" },
};

const computeAge = (dob: string | null | undefined): string | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return `${age} years old`;
};

const getTrendDirection = (name: string, trends: TrendPoint[]) => {
  const points = trends.filter(t => t.name === name).sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < 2) return null;
  const last = points[points.length - 1].value;
  const prev = points[points.length - 2].value;
  const diff = last - prev;
  const pct = Math.abs(diff / (prev || 1)) * 100;
  if (pct < 3) return "stable";
  // For most markers, lower = declining, higher = increasing
  // Status-aware: if status is "low", going down is bad; if "high", going up is bad
  return diff > 0 ? "up" : "down";
};

const HomeSection = ({ patient, profileName, markers, trends, summary, hasReports, loading, medications }: HomeSectionProps) => {
  const age = computeAge(patient?.dob);
  const navigate = useNavigate();
  const trendMarkers = [...new Set(trends.map(t => t.name))].filter(name =>
    trends.filter(t => t.name === name).length > 1
  );

  const handlePrint = () => window.print();

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
                <UserPen className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Share with Doctor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 — Plain Language Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-8 space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Your Health Summary</h2>
          <p className="text-lg leading-relaxed text-foreground">
            {summary || "Upload a report to see your health summary."}
          </p>
        </CardContent>
      </Card>

      {/* SECTION 3 — Trends */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-foreground">How Your Results Are Trending</h2>
        {trends.length > 0 ? (
          <>
            <TrendsChart trends={trends} />
            {trendMarkers.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {trendMarkers.map(name => {
                      const direction = getTrendDirection(name, trends);
                      const latest = trends.filter(t => t.name === name).sort((a, b) => b.date.localeCompare(a.date))[0];
                      const marker = markers.find(m => m.name === name);
                      return (
                        <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-base font-medium text-foreground">{getFriendlyName(name)}</span>
                          <div className="flex items-center gap-3">
                            {direction === "up" && <TrendingUp className="h-5 w-5 text-emerald-600" />}
                            {direction === "down" && <TrendingDown className="h-5 w-5 text-red-600" />}
                            {direction === "stable" && <Minus className="h-5 w-5 text-muted-foreground" />}
                            <span className="text-base font-semibold text-foreground">
                              {latest?.value} <span className="text-sm font-normal text-muted-foreground">{marker?.unit || ""}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-base text-muted-foreground">Upload lab reports to see your trends.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SECTION 4 — Current Medications */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-foreground">Current Medications</h2>
        <Card>
          <CardContent className="p-6">
            {medications.length > 0 ? (
              <div className="space-y-3">
                {medications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Pill className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-base font-medium text-foreground">{med.name}</span>
                    {med.dosage && (
                      <span className="text-sm text-muted-foreground">— {med.dosage}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground text-center py-4">No medications on record yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5 — Latest Test Results */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-foreground">Latest Test Results</h2>
        <Card>
          <CardContent className="p-6">
            {markers.length > 0 ? (
              <div className="space-y-3">
                {markers.map(m => {
                  const status = (m.status || "normal").toLowerCase();
                  const config = statusConfig[status] || statusConfig.normal;
                  return (
                    <div key={m.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-base font-medium text-foreground">{getFriendlyName(m.name)}</span>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-semibold text-foreground">
                            {m.value} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
                          </span>
                          {m.ref_min != null && m.ref_max != null && (
                            <p className="text-xs text-muted-foreground">
                              Normal range: {m.ref_min} – {m.ref_max} {m.unit || ""}
                            </p>
                          )}
                        </div>
                        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}>
                          {config.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-base text-muted-foreground text-center py-4">Upload a lab report to see your results here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomeSection;
