export default function Footer() {
  return (
    <footer className="relative z-10 mx-auto mt-20 w-full max-w-6xl px-5 pb-10 sm:px-8">
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[12px] text-low"
        style={{ borderColor: "var(--line-soft)" }}
      >
        <span>
          GAZE — React · Vite · Tailwind
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="pulse-dot pulse-dot--on" style={{ width: 6, height: 6 }} />
          Sentiment engine: VADER · Flask API · CORS
        </span>
      </div>
    </footer>
  );
}
