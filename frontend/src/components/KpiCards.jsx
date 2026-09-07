import { useEffect, useRef, useState } from "react";
import Tilt from "./Tilt";

function useCountUp(target, duration = 850) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

function Counter({ value }) {
  const n = useCountUp(value);
  return <>{n.toLocaleString()}</>;
}

const CARD_META = {
  positive: {
    label: "Positive",
    sub: "Happy & engaged",
    grad: "linear-gradient(135deg, #34d399, #059669)",
    stroke: "#34d399",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17l5-12 5 12" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
  neutral: {
    label: "Neutral",
    sub: "On the fence",
    grad: "linear-gradient(135deg, #94a3b8, #64748b)",
    stroke: "#94a3b8",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <path d="M9 20a4 4 0 0 1 6 0" opacity="0" />
      </svg>
    ),
  },
  negative: {
    label: "Negative",
    sub: "Needs attention",
    grad: "linear-gradient(135deg, #fb7185, #e11d48)",
    stroke: "#fb7185",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7l10 10" />
        <path d="M17 7l-10 10" />
      </svg>
    ),
  },
  total: {
    label: "Total",
    sub: "Feedback scored",
    grad: "linear-gradient(135deg, #67e8f9, #8b5cf6)",
    stroke: "#8b5cf6",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      </svg>
    ),
  },
};

const ORDER = ["positive", "neutral", "negative", "total"];

export default function KpiCards({ summary }) {
  const total = (summary?.positive || 0) + (summary?.neutral || 0) + (summary?.negative || 0);

  const cards = ORDER.map((key) => {
    const value = key === "total" ? total : summary?.[key] || 0;
    const share = total ? Math.round((value / total) * 100) : 0;
    const meta = CARD_META[key];
    return { key, value, share, meta };
  });

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(({ key, value, share, meta }, i) => (
        <div
          key={key}
          className="fade-up"
          style={{ animationDelay: `${0.08 + i * 0.07}s` }}
        >
          <Tilt max={7} scale={1}>
            <div className="glass tilt-card p-5">
              <div className="flex items-center justify-between">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-white"
                  style={{ background: meta.grad, boxShadow: `0 10px 24px -8px ${meta.stroke}` }}
                >
                  {meta.icon}
                </span>
                <span className="text-[11px] font-bold tracking-wider text-low">{share}%</span>
              </div>
              <div className="mt-4 font-display text-[34px] font-bold leading-none tracking-tight">
                <Counter value={value} />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--ink-hi)" }}>
                  {meta.label}
                </span>
                <span className="text-[11.5px] text-low">{meta.sub}</span>
              </div>
              <div
                className="bar-grow mt-4 h-1.5 overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(share, key === "total" ? 100 : 2)}%`,
                    background: meta.grad,
                    boxShadow: `0 0 12px ${meta.stroke}`,
                  }}
                />
              </div>
            </div>
          </Tilt>
        </div>
      ))}
    </div>
  );
}
