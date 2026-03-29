import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Marker {
  name: string;
  value: number;
  unit: string;
  status: "Normal" | "Low" | "High";
}

const markers: Marker[] = [
  { name: "Hemoglobin", value: 11.2, unit: "g/dL", status: "Low" },
  { name: "Blood Glucose", value: 98, unit: "mg/dL", status: "Normal" },
  { name: "Vitamin B12", value: 186, unit: "pg/mL", status: "Low" },
  { name: "TSH", value: 3.1, unit: "mIU/L", status: "Normal" },
];

const statusColor: Record<string, string> = {
  Normal: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  Low: "bg-red-100 text-red-700 hover:bg-red-100",
  High: "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

const MetricCards = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {markers.map((m) => (
      <Card key={m.name}>
        <CardContent className="p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{m.name}</p>
          <p className="text-2xl font-bold text-foreground">
            {m.value} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
          </p>
          <Badge className={`border-0 text-xs font-semibold ${statusColor[m.status]}`}>
            {m.status}
          </Badge>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default MetricCards;
