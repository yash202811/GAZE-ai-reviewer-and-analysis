const STEPS = [
  {
    n: "01",
    title: "Paste or upload",
    body: "Type feedback — one item per line — or drop a CSV with text, category and date columns.",
    grad: "linear-gradient(135deg, #22d3ee, #6366f1)",
  },
  {
    n: "02",
    title: "Flask engine scores it",
    body: "Every item is sent to the local Flask API and graded with VADER sentiment analysis.",
    grad: "linear-gradient(135deg, #818cf8, #c084fc)",
  },
  {
    n: "03",
    title: "A living 3D view",
    body: "KPIs count up, the orb recolors to the dominant mood, and keywords rise from the data.",
    grad: "linear-gradient(135deg, #c084fc, #e879f9)",
  },
];

export default function Steps() {
  return (
    <section className="relative z-10 mx-auto mt-16 w-full max-w-6xl px-5 sm:px-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, var(--line))" }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-low">How it works</span>
        <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--line), transparent)" }} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.n} className="fade-up" style={{ animationDelay: `${0.1 + i * 0.09}s` }}>
            <div className="glass h-full p-6 transition-transform duration-300 hover:-translate-y-1.5">
              <span
                className="font-display inline-grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold"
                style={{
                  background: s.grad,
                  color: "#fff",
                  boxShadow: "0 12px 26px -10px rgba(0,0,0,0.6)",
                  transform: "perspective(400px) rotateX(18deg)",
                }}
              >
                {s.n}
              </span>
              <h3 className="font-display mt-4 text-[16px] font-bold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-low">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
