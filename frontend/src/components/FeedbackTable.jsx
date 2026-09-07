import { useMemo } from "react";

function ScoreBadge({ score }) {
  const abs = Math.abs(score);
  const cls =
    abs < 0.05
      ? { color: "#cbd5e1", borderColor: "rgba(148,163,184,0.3)" }
      : score > 0
        ? { color: "#6ee7b7", borderColor: "rgba(52,211,153,0.35)" }
        : { color: "#fda4af", borderColor: "rgba(251,113,133,0.35)" };

  return (
    <span
      className="inline-flex min-w-[74px] items-center gap-1 justify-center rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums"
      style={{
        ...cls,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid",
      }}
    >
      {score > 0.05 ? "▲" : score < -0.05 ? "▼" : "◆"} {score >= 0 ? "+" : ""}
      {score.toFixed(2)}
    </span>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "positive", label: "Positive" },
  { key: "neutral", label: "Neutral" },
  { key: "negative", label: "Negative" },
];

export default function FeedbackTable({ results = [], filter, onFilter }) {
  const counts = useMemo(() => {
    const c = { all: results.length, positive: 0, neutral: 0, negative: 0 };
    for (const r of results) c[r.sentiment] = (c[r.sentiment] || 0) + 1;
    return c;
  }, [results]);

  const rows = useMemo(
    () => (filter === "all" ? results : results.filter((r) => r.sentiment === filter)),
    [results, filter],
  );

  const hasCategory = results.some((r) => r.category);
  const hasDate = results.some((r) => r.date);

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-0">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">Feedback items</h3>
          <p className="text-[12.5px] text-low">
            {rows.length} of {results.length} scored rows
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? "is-active" : ""}`}
              onClick={() => onFilter(f.key)}
            >
              {f.label}
              <span style={{ opacity: 0.75, fontSize: 11.5 }}>{counts[f.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Feedback</th>
              <th>Sentiment</th>
              <th>Score</th>
              {hasCategory && <th>Category</th>}
              {hasDate && <th>Date</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.id}-${i}`}>
                <td style={{ color: "var(--ink-low)", fontWeight: 600 }}>{r.id}</td>
                <td>
                  <span className="text-cell" title={r.text}>
                    {r.text || <span className="text-low">—</span>}
                  </span>
                </td>
                <td>
                  <span className={`tag tag--${r.sentiment || "neutral"}`}>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "currentColor", boxShadow: "0 0 6px currentColor" }}
                    />
                    {r.sentiment}
                  </span>
                </td>
                <td>
                  <ScoreBadge score={r.score || 0} />
                </td>
                {hasCategory && (
                  <td>
                    {r.category ? <span className="tag tag--cat">{r.category}</span> : <span className="text-low">—</span>}
                  </td>
                )}
                {hasDate && (
                  <td>
                    {r.date ? <span className="tag tag--date">{r.date}</span> : <span className="text-low">—</span>}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5 + (hasCategory ? 1 : 0) + (hasDate ? 1 : 0)} className="py-8 text-center text-low">
                  No {filter !== "all" ? `${filter} ` : ""}items in this batch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
