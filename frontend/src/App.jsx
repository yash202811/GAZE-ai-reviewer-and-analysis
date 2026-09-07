import { useCallback, useEffect, useMemo, useState } from "react";
import BackgroundFX from "./components/BackgroundFX";
import Header from "./components/Header";
import Hero from "./components/Hero";
import InputPanel from "./components/InputPanel";
import Steps from "./components/Steps";
import Footer from "./components/Footer";
import KpiCards from "./components/KpiCards";
import SentimentDonut from "./components/SentimentDonut";
import KeywordChart from "./components/KeywordChart";
import FeedbackTable from "./components/FeedbackTable";
import ChatWidget from "./components/ChatWidget";
import { analyzeFeedback, checkBackendHealth, describeError } from "./api";

const SAMPLE_SET = [
  { id: 1, text: "The new dashboard is absolutely brilliant — it saved our team hours every week!", category: "feature", date: "2026-09-04" },
  { id: 2, text: "Love the dark mode and the fast search. Huge improvement!", category: "ui", date: "2026-09-04" },
  { id: 3, text: "Support was friendly but I waited 40 minutes on hold, way too long.", category: "support", date: "2026-09-05" },
  { id: 4, text: "The app keeps crashing on startup — extremely frustrating!", category: "bug", date: "2026-09-05" },
  { id: 5, text: "Pricing feels too high for small teams like ours.", category: "pricing", date: "2026-09-06" },
  { id: 6, text: "It is okay I guess, nothing special. Does the job.", category: "general", date: "2026-09-06" },
  { id: 7, text: "Exporting reports to PDF is a fantastic addition, thank you!", category: "feature", date: "2026-09-06" },
  { id: 8, text: "The mobile app is slow and drains my battery.", category: "bug", date: "2026-09-07" },
  { id: 9, text: "Your onboarding videos are super clear and easy to follow.", category: "support", date: "2026-09-07" },
  { id: 10, text: "I hate that I cannot change my notification settings.", category: "ui", date: "2026-09-07" },
  { id: 11, text: "Overall a solid product, we will renew our plan.", category: "general", date: "2026-09-07" },
  { id: 12, text: "Meh. Works sometimes but I have seen better tools.", category: "general", date: "2026-09-07" },
];

function dominantMood(summary) {
  if (!summary) return "idle";
  const order = ["positive", "neutral", "negative"];
  let best = "idle";
  let bestN = -1;
  for (const k of order) {
    const n = summary[k] || 0;
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  return bestN > 0 ? best : "idle";
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState("checking");
  const [filter, setFilter] = useState("all");
  const [analyzedAt, setAnalyzedAt] = useState(null);

  const summary = data?.summary;
  const mood = dominantMood(summary);

  const orbChips = useMemo(() => {
    if (!summary) return [];
    const total = (summary.positive || 0) + (summary.neutral || 0) + (summary.negative || 0);
    if (!total) return [];
    const chips = [];
    const posPct = Math.round(((summary.positive || 0) / total) * 100);
    const negPct = Math.round(((summary.negative || 0) / total) * 100);
    if (posPct > 0)
      chips.push({ id: "pos", text: `${posPct}% positive`, top: "-12%", left: "-40%", z: 100, delay: 0, style: { color: "#6ee7b7", borderColor: "rgba(52,211,153,0.45)" } });
    if (negPct > 0)
      chips.push({ id: "neg", text: `${negPct}% negative`, top: "86%", left: "-38%", z: 130, delay: 1.4, style: { color: "#fda4af", borderColor: "rgba(251,113,133,0.45)" } });
    const topWord = data?.keywords?.[0]?.word;
    if (topWord) {
      chips.push({ id: "kw", text: `“${topWord}” trending`, top: "4%", left: "-52%", z: 60, delay: 0.6, style: { color: "#a5b4fc", borderColor: "rgba(139,92,246,0.45)" } });
    }
    return chips;
  }, [summary, data]);

  // Poll the Flask backend health endpoint
  useEffect(() => {
    let mounted = true;
    async function ping() {
      const ok = await checkBackendHealth();
      if (mounted) setHealth((prev) => (prev === (ok ? "online" : "offline") ? prev : ok ? "online" : "offline"));
    }
    ping();
    const id = setInterval(ping, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const run = useCallback(
    async (feedback) => {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeFeedback(feedback);
        setData(result);
        setFilter("all");
        setAnalyzedAt(Date.now());
      } catch (err) {
        setError(describeError(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const avgScore = useMemo(() => {
    if (!data?.results?.length) return 0;
    const sum = data.results.reduce((acc, r) => acc + (r.score || 0), 0);
    return sum / data.results.length;
  }, [data]);

  const timeLabel = analyzedAt
    ? new Date(analyzedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      <BackgroundFX />

      <div className="relative">
        <Header health={health} />

        <Hero
          mood={mood}
          chips={orbChips}
          onSample={() => run(SAMPLE_SET)}
          loading={loading}
          hasData={!!data}
          lastRunLabel={timeLabel}
        />

        <InputPanel
          onAnalyze={run}
          loading={loading}
          backendOffline={health === "offline"}
          error={error}
        />

        {data ? (
          <main className="relative z-10 mx-auto mt-14 w-full max-w-6xl px-5 sm:px-8">
            <div className="fade-up mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-low">
                  Live analysis
                </span>
                <h2 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  How your users <span className="text-gradient">really feel</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="glass-chip"
                  style={{
                    color: avgScore >= 0.05 ? "#6ee7b7" : avgScore <= -0.05 ? "#fda4af" : "#cbd5e1",
                    borderColor: "rgba(148,163,184,0.25)",
                    fontSize: 12.5,
                  }}
                >
                  Avg compound · {avgScore >= 0 ? "+" : ""}
                  {avgScore.toFixed(2)}
                </span>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setData(null);
                    setError(null);
                    setFilter("all");
                    setAnalyzedAt(null);
                  }}
                >
                  Reset view
                </button>
              </div>
            </div>

            <div className="pop-in">
              <KpiCards summary={summary} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <SentimentDonut summary={summary} />
              </div>
              <div className="lg:col-span-3">
                <KeywordChart keywords={data.keywords} />
              </div>
            </div>

            <div className="mt-4">
              <FeedbackTable results={data.results} filter={filter} onFilter={setFilter} />
            </div>
          </main>
        ) : (
          <Steps />
        )}

        <Footer />
      </div>

      <ChatWidget
        context={
          data
            ? {
                summary,
                total: data.results.length,
                avgScore: avgScore.toFixed(2),
                topKeywords: (data.keywords || []).slice(0, 5).map((k) => `${k.word} (${k.count})`).join(", "),
                negativeSamples: data.results
                  .filter((r) => r.sentiment === "negative")
                  .slice(0, 3)
                  .map((r) => r.text)
                  .join(" | "),
              }
            : null
        }
      />
    </>
  );
}
