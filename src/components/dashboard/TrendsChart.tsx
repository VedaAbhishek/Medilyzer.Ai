import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Area, AreaChart,
  ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
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

const getTrend = (points: TrendPoint[]) => {
  if (points.length < 2) return "insufficient";
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1].value;
  const prev = sorted[sorted.length - 2].value;
  const pct = Math.abs((last - prev) / (prev || 1)) * 100;
  if (pct < 3) return "stable";
  return last > prev ? "up" : "down";
};

const TrendsChart = ({ trends, markers }: TrendsChartProps) => {
  if (trends.length === 0) return null;

  const markerNames = [...new Set(trends.map((t) => t.name))];

  // Only include markers with 2+ data points on different dates
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
    const status = (markerInfo?.status || "normal").toLowerCase();
    const isNormal = status === "normal";
    const color = isNormal ? "#1D9E75" : "#E24B4A";
    const lightColor = isNormal ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.1)";
    const trend = getTrend(points);

    const values = points.map((p) => p.value);
    const refMin = markerInfo?.ref_min;
    const refMax = markerInfo?.ref_max;
    const allVals = [
      ...values,
      ...(refMin != null ? [refMin] : []),
      ...(refMax != null ? [refMax] : []),
    ];
    const yMin = Math.floor(Math.min(...allVals) * 0.9);
    const yMax = Math.ceil(Math.max(...allVals) * 1.1);

    return {
      name,
      points,
      latest,
      markerInfo,
      status,
      isNormal,
      color,
      lightColor,
      trend,
      yMin,
      yMax,
      refMin,
      refMax,
    };
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
      {cards.map((c) => (
        <Card key={c.name}>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">
              {getFriendlyName(c.name)}
            </h3>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={c.points}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`fill-${c.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={c.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <YAxis
                    domain={[c.yMin, c.yMax]}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(210 10% 75%)"
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9 }}
                    stroke="hsl(210 10% 75%)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid hsl(210 10% 90%)",
                    }}
                    formatter={(val: number) => [
                      `${val} ${c.markerInfo?.unit || ""}`,
                      getFriendlyName(c.name),
                    ]}
                  />
                  {c.refMin != null && (
                    <ReferenceLine
                      y={c.refMin}
                      stroke="hsl(210 10% 80%)"
                      strokeDasharray="4 4"
                    />
                  )}
                  {c.refMax != null && (
                    <ReferenceLine
                      y={c.refMax}
                      stroke="hsl(210 10% 80%)"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={c.color}
                    strokeWidth={2}
                    fill={`url(#fill-${c.name})`}
                    dot={{ r: 3, fill: c.color }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xl font-bold"
                  style={{ color: c.color }}
                >
                  {c.latest?.value}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {c.markerInfo?.unit || ""}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium">
                {c.trend === "up" && (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Improving</span>
                  </>
                )}
                {c.trend === "down" && (
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
                {c.trend === "insufficient" && (
                  <span className="text-muted-foreground">Not enough data</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TrendsChart;
