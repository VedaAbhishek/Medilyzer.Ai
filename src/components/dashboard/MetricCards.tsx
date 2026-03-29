import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const statusColor: Record<string, string> = {
  normal: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  low: "bg-red-100 text-red-700 hover:bg-red-100",
  high: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  critical: "bg-red-200 text-red-800 hover:bg-red-200",
};

const dummyMarkers: Marker[] = [
  { name: "Hemoglobin", value: 11.2, unit: "g/dL", status: "low" },
  { name: "Blood Glucose", value: 98, unit: "mg/dL", status: "normal" },
  { name: "Vitamin B12", value: 186, unit: "pg/mL", status: "low" },
  { name: "TSH", value: 3.1, unit: "mIU/L", status: "normal" },
];

const MetricCards = ({ markers, loading }: MetricCardsProps) => {
  const display = markers.length > 0 ? markers.slice(0, 8) : dummyMarkers;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-5 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {display.map((m) => {
        const status = (m.status || "normal").toLowerCase();
        return (
          <Card key={m.name}>
            <CardContent className="p-5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{m.name}</p>
              <p className="text-2xl font-bold text-foreground">
                {m.value} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
              </p>
              <Badge className={`border-0 text-xs font-semibold capitalize ${statusColor[status] || statusColor.normal}`}>
                {status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricCards;
