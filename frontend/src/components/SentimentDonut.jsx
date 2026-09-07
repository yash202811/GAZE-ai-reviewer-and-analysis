import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const SERIES = [
  { key: "positive", color: "#34d399", gradId: "gPos" },
  { key: "neutral", color: "#94a3b8", gradId: "gNeu" },
  { key: "negative", color: "#fb7185", gradId: "gNeg" },
];

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tip">
      <div style={{ textTransform: "capitalize", fontWeight: 700 }}>{d.name}</div>
      <div>
        <span style={{ color: "#67e8f9", fontWeight: 700 }}>{d.value}</span> item{d.value === 1 ? "" : "s"} ·{" "}
        <span style={{ color: "#a5b4fc" }}>{d.payload.share}%</span>
      </div>
    </div>
  );
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

export default function SentimentDonut({ summary }) {
  const total = (summary?.positive || 0) + (summary?.neutral || 0) + (summary?.negative || 0);
  const counter = useCountUp(total);

  const data = SERIES.map((s) => {
    const value = summary?.[s.key] || 0;
    return {
      ...s,
      name: s.key,
      value,
      share: total ? Math.round((value / total) * 100) : 0,
    };
  }).filter((d) => d.value > 0);

  const positiveRate = total ? Math.round(((summary?.positive || 0) / total) * 100) : 0;
  const dominant = data.length ? data.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  return (
    <div className="glass h-full p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">Sentiment mix</h3>
          <p className="text-[12.5px] text-low">VADER compound scores across items</p>
        </div>
        <span className="glass-chip" style={{ color: "#6ee7b7", borderColor: "rgba(52,211,153,0.3)" }}>
          {positiveRate}% positive
        </span>
      </div>

      <div className="relative mt-2" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="gPos" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="gNeu" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="gNeg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="94%"
              paddingAngle={3}
              cornerRadius={6}
              stroke="rgba(5,6,15,0.6)"
              strokeWidth={2}
              animationDuration={900}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={`url(#${d.gradId})`} />
              ))}
            </Pie>
            <Tooltip content={<ChartTip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[30px] font-bold leading-none tracking-tight">
            {counter.toLocaleString()}
          </span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-low">
            {dominant ? `${dominant.name} leader` : "items"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {data.map((d) => (
          <div
            key={d.key}
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: "var(--line-soft)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
              <span className="text-[11px] font-medium capitalize text-low">{d.name}</span>
            </div>
            <div className="mt-0.5 font-display text-base font-bold" style={{ color: "var(--ink-hi)" }}>
              {d.share}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
