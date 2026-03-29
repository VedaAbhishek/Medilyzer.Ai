import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const data = months.map((month, i) => ({
  month,
  B12: Math.round(320 - i * 12 + (Math.random() * 10 - 5)),
  Hemoglobin: +(12.8 - i * 0.14 + (Math.random() * 0.3 - 0.15)).toFixed(1),
}));

const TrendsChart = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold">Lab Trends — Last 12 Months</CardTitle>
    </CardHeader>
    <CardContent className="pl-2 pr-4 pb-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210 10% 45%)" />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(210 10% 45%)" label={{ value: "B12 (pg/mL)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(210 10% 45%)" } }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(210 10% 45%)" label={{ value: "Hb (g/dL)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "hsl(210 10% 45%)" } }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line yAxisId="left" type="monotone" dataKey="B12" stroke="hsl(155 71% 37%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line yAxisId="right" type="monotone" dataKey="Hemoglobin" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default TrendsChart;
