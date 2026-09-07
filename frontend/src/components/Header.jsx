function StatusPill({ health }) {
  const map = {
    checking: { cls: "pulse-dot--wait", label: "Connecting…", text: "Backend" },
    online: { cls: "pulse-dot--on", label: "Engine online", text: "Backend" },
    offline: { cls: "pulse-dot--off", label: "Engine offline", text: "Backend" },
  };
  const s = map[health] || map.checking;
  return (
    <span
      className="status-pill"
      title={
        health === "offline"
          ? "Flask API not reachable at http://127.0.0.1:5000 — run `python app.py` in /backend"
          : "Flask sentiment engine"
      }
    >
      <span className={`pulse-dot ${s.cls}`} />
      <span>
        {s.label}
        <span className="text-low" style={{ marginLeft: 6, fontWeight: 500 }}>
          · Flask · :5000
        </span>
      </span>
    </span>
  );
}

export default function Header({ health }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
      <div className="flex items-center gap-3.5">
        <img
          src="/gaze-icon.png"
          alt="GAZE logo"
          className="gaze-logo"
          draggable="false"
        />
        <div>
          <div className="font-display text-lg font-bold leading-tight tracking-tight">
            <span className="text-gradient" style={{ letterSpacing: "0.12em" }}>
              GAZE
            </span>
          </div>
          <div className="text-[11.5px] font-medium tracking-[0.22em] uppercase text-low">
            Sentiment analytics
          </div>
        </div>
      </div>

      <StatusPill health={health} />
    </header>
  );
}
