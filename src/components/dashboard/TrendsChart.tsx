import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TrendPoint {
  date: string;
  name: string;
  value: number;
}

interface TrendsChartProps {
  trends: TrendPoint[];
}

const COLORS = [
  "hsl(155 71% 37%)",
  "hsl(0 84% 60%)",
  "hsl(220 70% 55%)",
  "hsl(35 90% 55%)",
  "hsl(280 60% 55%)",
  "hsl(180 60% 40%)",
];

const friendlyNames: Record<string, string> = {
  glucose: "Blood Sugar",
  hba1c: "Avg Blood Sugar",
  tsh: "Thyroid",
  rbc: "Red Blood Cells",
  wbc: "White Blood Cells",
  hemoglobin: "Hemoglobin",
  hb: "Hemoglobin",
  b12: "Vitamin B12",
  "vitamin b12": "Vitamin B12",
  "vitamin d": "Vitamin D",
  cholesterol: "Cholesterol",
  ldl: "Bad Cholesterol",
  hdl: "Good Cholesterol",
  creatinine: "Kidney Function",
  iron: "Iron",
};

const getFriendlyName = (name: string) => friendlyNames[name.toLowerCase().trim()] || name;

const TrendsChart = ({ trends }: TrendsChartProps) => {
  if (trends.length === 0) return null;

  const markerNames = [...new Set(trends.map((t) => t.name))];
  const byDate = new Map<string, Record<string, number | string>>();

  for (const t of trends) {
    if (!byDate.has(t.date)) byDate.set(t.date, { date: t.date });
    byDate.get(t.date)![t.name] = t.value;
  }

  const chartData = [...byDate.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">How My Results Are Changing</h2>
      <Card>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 13 }} stroke="hsl(210 10% 45%)" />
              <YAxis tick={{ fontSize: 13 }} stroke="hsl(210 10% 45%)" />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 14 }} />
              <Legend wrapperStyle={{ fontSize: 14 }} formatter={(value: string) => getFriendlyName(value)} />
              {markerNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={getFriendlyName(name)}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendsChart;
