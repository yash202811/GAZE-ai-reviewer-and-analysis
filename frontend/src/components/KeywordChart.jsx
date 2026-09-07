import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tip">
      <div style={{ fontWeight: 700 }}>“{label}”</div>
      <div>
        mentioned <span style={{ color: "#67e8f9", fontWeight: 700 }}>{d.value}</span> time{d.value === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function KeywordChart({ keywords = [] }) {
  const data = keywords.slice(0, 8);

  if (!data.length) {
    return (
      <div className="glass flex h-full min-h-[280px] flex-col items-center justify-center p-6 text-center">
        <h3 className="font-display text-lg font-bold tracking-tight">Top keywords</h3>
        <p className="mt-2 max-w-[240px] text-sm text-low">Not enough text to surface keyword trends yet.</p>
      </div>
    );
  }

  return (
    <div className="glass h-full p-6">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight">Top keywords</h3>
        <p className="text-[12.5px] text-low">Most repeated themes in your feedback</p>
      </div>

      <div className="mt-4" style={{ height: Math.max(220, data.length * 34) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 34, bottom: 0, left: 6 }}>
            <defs>
              <linearGradient id="kwGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="55%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="word"
              width={86}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a6adc8", fontSize: 12.5, fontWeight: 600 }}
            />
            <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.045)" }} />
            <Bar dataKey="count" fill="url(#kwGrad)" radius={[0, 8, 8, 0]} barSize={13} animationDuration={900}>
              <LabelList dataKey="count" position="right" fill="#c4b5fd" fontSize={12} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
