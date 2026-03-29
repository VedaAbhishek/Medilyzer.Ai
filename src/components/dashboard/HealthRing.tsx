import { useEffect, useState } from "react";

interface Marker {
  name: string;
  status: string | null;
}

interface HealthRingProps {
  markers: Marker[];
  loading: boolean;
}

const HealthRing = ({ markers, loading }: HealthRingProps) => {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    if (loading || markers.length === 0) return;
    setAnimProgress(0);
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      setAnimProgress(p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [markers, loading]);

  const size = 240;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const hasData = markers.length > 0;
  const normalCount = markers.filter(m => (m.status || "normal").toLowerCase() === "normal").length;
  const total = markers.length;
  const pct = total > 0 ? Math.round((normalCount / total) * 100) : 0;

  const getStatusMessage = (p: number) => {
    if (p >= 90) return { text: "You are doing great. Keep it up.", color: "#1D9E75" };
    if (p >= 70) return { text: "Most things look good. A few things need attention.", color: "#D97706" };
    if (p >= 50) return { text: "Some results need your attention. Talk to your doctor soon.", color: "#D97706" };
    return { text: "Several results need attention. Please see a doctor.", color: "#E24B4A" };
  };

  const getPctColor = (p: number) => {
    if (p >= 70) return "#1D9E75";
    if (p >= 50) return "#D97706";
    return "#E24B4A";
  };

  const status = getStatusMessage(pct);

  // Build segments
  const segments: { color: string; fraction: number }[] = [];
  if (hasData) {
    markers.forEach(m => {
      const s = (m.status || "normal").toLowerCase();
      const color = s === "normal" ? "#1D9E75" : s === "low" || s === "high" || s === "critical" ? "#E24B4A" : "#D3D1C7";
      segments.push({ color, fraction: 1 / total });
    });
  }

  const gap = total > 1 ? 0.008 : 0; // small gap between segments

  const showGlow = hasData && pct >= 80;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-[240px] h-[240px] rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="relative">
        {showGlow && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 40px 8px rgba(29, 158, 117, 0.25)",
            }}
          />
        )}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />

          {hasData ? (
            (() => {
              let offset = 0;
              return segments.map((seg, i) => {
                const segLen = (seg.fraction - gap) * circumference;
                const gapLen = gap * circumference;
                const visibleLen = segLen * animProgress;
                const dasharray = `${Math.max(visibleLen, 0)} ${circumference - Math.max(visibleLen, 0)}`;
                const rotation = -90 + offset * 360;
                offset += seg.fraction;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dasharray}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${cx} ${cy})`}
                    style={{ transition: "none" }}
                  />
                );
              });
            })()
          ) : (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#D3D1C7"
              strokeWidth={strokeWidth}
            />
          )}

          {/* Center text */}
          {hasData ? (
            <>
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                dominantBaseline="central"
                fill={getPctColor(pct)}
                fontSize="48"
                fontWeight="800"
                fontFamily="DM Sans, sans-serif"
              >
                {Math.round(pct * animProgress)}%
              </text>
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(215, 16%, 47%)"
                fontSize="13"
                fontWeight="500"
                fontFamily="DM Sans, sans-serif"
              >
                of your results are normal
              </text>
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(215, 16%, 47%)"
                fontSize="14"
                fontWeight="500"
                fontFamily="DM Sans, sans-serif"
              >
                Upload a report to see
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(215, 16%, 47%)"
                fontSize="14"
                fontWeight="500"
                fontFamily="DM Sans, sans-serif"
              >
                your health score
              </text>
            </>
          )}
        </svg>
      </div>

      {hasData && (
        <p
          className="text-lg font-medium text-center max-w-md"
          style={{ color: status.color }}
        >
          {status.text}
        </p>
      )}
    </div>
  );
};

export default HealthRing;
