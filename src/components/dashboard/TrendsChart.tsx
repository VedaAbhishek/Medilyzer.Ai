import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TrendsChart = ({ trends }: TrendsChartProps) => {
  if (trends.length === 0) return null;

  // Group by date, pivot marker names into columns
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Lab Trends</CardTitle>
      </CardHeader>
      <CardContent className="pl-2 pr-4 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(210 10% 45%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(210 10% 45%)" />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {markerNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TrendsChart;
