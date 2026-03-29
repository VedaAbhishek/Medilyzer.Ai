import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

interface TrendsChartProps {
  trends: TrendPoint[];
  markers: Marker[];
}

const friendlyNames: Record<string, string> = {
  glucose: "Blood Sugar", hba1c: "Avg Blood Sugar", tsh: "Thyroid",
  rbc: "Red Blood Cells", wbc: "White Blood Cells", hemoglobin: "Hemoglobin",
  hb: "Hemoglobin", b12: "Vitamin B12", "vitamin b12": "Vitamin B12",
  "vitamin d": "Vitamin D", cholesterol: "Cholesterol", ldl: "Bad Cholesterol",
  hdl: "Good Cholesterol", creatinine: "Kidney Function", iron: "Iron",
  platelets: "Platelets", ferritin: "Iron Stores", calcium: "Calcium",
  sodium: "Sodium", potassium: "Potassium", triglycerides: "Triglycerides",
  alt: "Liver (ALT)", ast: "Liver (AST)", bun: "Kidney Waste",
};

const getFriendlyName = (name: string) =>
  friendlyNames[name.toLowerCase().trim()] || name;

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "Low", className: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "High", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "Attention", className: "bg-red-100 text-red-800 border-red-300" },
};

const TrendsChart = ({ trends, markers }: TrendsChartProps) => {
  if (trends.length === 0) return null;

  const markerNames = [...new Set(trends.map((t) => t.name))];

  const cards = markerNames.map((name) => {
    const points = trends
      .filter((t) => t.name === name)
      .sort((a, b) => a.date.localeCompare(b.date));
    const uniqueDates = new Set(points.map((p) => p.date));
    return { name, points, uniqueDates: uniqueDates.size };
  }).filter((c) => c.uniqueDates >= 2).map(({ name, points }) => {
    const markerInfo = markers.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );
    const latest = points[points.length - 1];
    const prev = points[points.length - 2];
    const status = (markerInfo?.status || "normal").toLowerCase();
    const isNormal = status === "normal";
    const refMin = markerInfo?.ref_min;
    const refMax = markerInfo?.ref_max;

    // Determine trend
    let trend: "improving" | "declining" | "stable" = "stable";
    const pct = Math.abs((latest.value - prev.value) / (prev.value || 1)) * 100;
    if (pct >= 3) {
      if (status === "normal") {
        trend = latest.value > prev.value ? "improving" : "declining";
      } else if (status === "high") {
        trend = latest.value < prev.value ? "improving" : "declining";
      } else if (status === "low") {
        trend = latest.value > prev.value ? "improving" : "declining";
      }
    }

    return { name, latest, markerInfo, status, isNormal, refMin, refMax, trend };
  });

  // Sort: abnormal first
  cards.sort((a, b) => {
    if (a.isNormal === b.isNormal) return 0;
    return a.isNormal ? 1 : -1;
  });

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-base text-muted-foreground">
            Upload more reports over time and we will show you how your health is changing.
            Trends appear when you have results from at least 2 different visits.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => {
        const hasRange = c.refMin != null && c.refMax != null;
        const color = c.isNormal ? "#1D9E75" : "#E24B4A";
        const sConfig = statusConfig[c.status] || statusConfig.normal;

        // Calculate position on range bar
        let positionPct = 50;
        if (hasRange) {
          const range = c.refMax! - c.refMin!;
          const padding = range * 0.2;
          const barMin = c.refMin! - padding;
          const barMax = c.refMax! + padding;
          positionPct = Math.max(0, Math.min(100, ((c.latest.value - barMin) / (barMax - barMin)) * 100));
        }

        return (
          <Card key={c.name}>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                {getFriendlyName(c.name)}
              </h3>

              {/* Range bar */}
              {hasRange && (
                <div className="relative">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute h-2 rounded-full bg-emerald-200"
                      style={{
                        left: `${Math.max(0, ((c.refMin! - (c.refMin! - (c.refMax! - c.refMin!) * 0.2)) / ((c.refMax! + (c.refMax! - c.refMin!) * 0.2) - (c.refMin! - (c.refMax! - c.refMin!) * 0.2))) * 100)}%`,
                        width: `${((c.refMax! - c.refMin!) / ((c.refMax! + (c.refMax! - c.refMin!) * 0.2) - (c.refMin! - (c.refMax! - c.refMin!) * 0.2))) * 100}%`,
                      }}
                    />
                  </div>
                  {/* Dot indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
                    style={{
                      left: `${positionPct}%`,
                      transform: `translate(-50%, -50%)`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              )}

              {/* Value, range, badge row */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground" style={{ color }}>
                  {c.latest.value} <span className="text-xs text-muted-foreground font-normal">{c.markerInfo?.unit || ""}</span>
                </span>
                {hasRange && (
                  <span className="text-xs text-muted-foreground">
                    {c.refMin} – {c.refMax}
                  </span>
                )}
                <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${sConfig.className}`}>
                  {sConfig.label}
                </div>
              </div>

              {/* Trend arrow */}
              <div className="flex items-center gap-1 text-xs font-medium">
                {c.trend === "improving" && (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Improving</span>
                  </>
                )}
                {c.trend === "declining" && (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-red-500">Declining</span>
                  </>
                )}
                {c.trend === "stable" && (
                  <>
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Stable</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TrendsChart;
