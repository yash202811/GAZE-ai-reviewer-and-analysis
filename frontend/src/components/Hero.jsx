import Orb3D from "./Orb3D";
import Tilt from "./Tilt";

export default function Hero({ mood, chips, onSample, loading, hasData, lastRunLabel }) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8 lg:pt-14">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="fade-up" style={{ animationDelay: "0.05s" }}>
          <span className="glass-chip mb-5">
            <span className="pulse-dot pulse-dot--on" style={{ width: 6, height: 6 }} />
            Real-time sentiment intelligence
          </span>

          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.6rem]">
            Turn raw feedback into
            <br />
            <span className="text-gradient">crystal-clear insight</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-low">
            Paste feedback or drop a CSV — the Flask engine scores every item with
            VADER sentiment and renders a living, <strong style={{ color: "var(--ink-hi)" }}>3D</strong>{" "}
            view of how people feel.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button className="btn btn--primary" onClick={onSample} disabled={loading}>
              {loading && <span className="loader-ring" />}
              {loading ? "Analyzing…" : "✨ Try the sample dataset"}
            </button>
            {hasData && lastRunLabel && <span className="glass-chip">Last run · {lastRunLabel}</span>}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] font-medium text-low">
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Instant VADER scoring
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
              Flask · REST API
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
                <path d="M12 8v8M8.5 11h7" />
              </svg>
              3D glass UI
            </span>
          </div>
        </div>

        <div className="fade-up hidden lg:block" style={{ animationDelay: "0.18s" }}>
          <Tilt max={9} glare={false} scale={1}>
            <Orb3D
              size={290}
              mood={mood}
              chips={
                chips.length
                  ? chips
                  : [
                      { id: "c1", text: "feedback in", top: "-9%", left: "-36%", z: 70, delay: 0 },
                      { id: "c2", text: "insight out", top: "90%", left: "-34%", z: 110, delay: 1.1 },
                    ]
              }
            />
          </Tilt>
        </div>
      </div>
    </section>
  );
}
