import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Marker {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
}

interface MetricCardsProps {
  markers: Marker[];
  loading: boolean;
}

const friendlyNames: Record<string, string> = {
  glucose: "Blood Sugar",
  hba1c: "Average Blood Sugar (3 months)",
  tsh: "Thyroid Level",
  rbc: "Red Blood Cells",
  wbc: "White Blood Cells",
  hemoglobin: "Hemoglobin",
  hb: "Hemoglobin",
  platelets: "Platelets",
  creatinine: "Kidney Function",
  bun: "Kidney Waste Level",
  alt: "Liver Health (ALT)",
  ast: "Liver Health (AST)",
  cholesterol: "Cholesterol",
  ldl: "Bad Cholesterol",
  hdl: "Good Cholesterol",
  triglycerides: "Triglycerides",
  b12: "Vitamin B12",
  "vitamin b12": "Vitamin B12",
  "vitamin d": "Vitamin D",
  iron: "Iron Level",
  ferritin: "Iron Stores",
  calcium: "Calcium",
  sodium: "Sodium",
  potassium: "Potassium",
};

const getFriendlyName = (name: string) => {
  const key = name.toLowerCase().trim();
  return friendlyNames[key] || name;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "✅ This is Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "🔻 This is Low", className: "bg-red-50 text-red-700 border-red-200" },
  high: { label: "🔺 This is High", className: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "⚠️ Needs Attention", className: "bg-red-100 text-red-800 border-red-300" },
};

const MetricCards = ({ markers, loading }: MetricCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (markers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {markers.slice(0, 8).map((m) => {
        const status = (m.status || "normal").toLowerCase();
        const config = statusConfig[status] || statusConfig.normal;
        return (
          <Card key={m.name} className="overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <p className="text-base font-semibold text-muted-foreground">
                {getFriendlyName(m.name)}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {m.value}{" "}
                <span className="text-base font-normal text-muted-foreground">{m.unit}</span>
              </p>
              <div
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold ${config.className}`}
              >
                {config.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricCards;
