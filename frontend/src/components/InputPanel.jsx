import { useRef, useState } from "react";
import Papa from "papaparse";

const SAMPLE_LINES = [
  "The new dashboard is absolutely brilliant — saved us hours every week!",
  "Support team was friendly but the wait time was way too long.",
  "App keeps crashing on startup, extremely frustrating.",
  "Love the dark mode and the fast search. Great update!",
  "It's okay, nothing special. Does the job.",
  "Pricing feels too high for small teams like ours.",
];

const TEXT_ALIASES = new Set([
  "text",
  "feedback",
  "feedbacktext",
  "userfeedback",
  "customerfeedback",
  "comment",
  "comments",
  "message",
  "review",
  "reviews",
  "description",
  "content",
  "body",
  "remark",
  "remarks",
  "note",
  "notes",
  "response",
  "suggestion",
  "suggestions",
  "whatdoyouthink",
  "feedbackcomments",
]);

const CATEGORY_ALIASES = new Set([
  "category",
  "categorie",
  "cat",
  "type",
  "topic",
  "theme",
  "label",
  "tags",
  "department",
]);

const DATE_ALIASES = new Set([
  "date",
  "day",
  "datetime",
  "timestamp",
  "created",
  "createdat",
  "submitted",
  "submittedat",
  "submittedon",
  "posted",
  "postedat",
  "postedon",
  "createdon",
  "feedbackdate",
  "reviewdate",
]);

// Lowercase, strip BOM/quotes/extra whitespace and collapse separators.
function normKey(k) {
  return String(k || "")
    .replace(/^\uFEFF/, "")
    .replace(/["'\u201c\u201d]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}

// Pick which columns of the parsed header row hold text / category / date.
function pickColumns(keys) {
  const textKey = keys.find((k) => TEXT_ALIASES.has(normKey(k))) || null;
  const categoryKey = keys.find((k) => CATEGORY_ALIASES.has(normKey(k))) || null;
  const dateKey = keys.find((k) => DATE_ALIASES.has(normKey(k))) || null;
  return { textKey, categoryKey, dateKey };
}

// Guess the most text-like column (longest average content) when no header matched.
function guessTextKey(rows) {
  const keys = Object.keys(rows[0] || {});
  let best = keys[0];
  let bestLen = -1;
  for (const k of keys) {
    let len = 0;
    let n = 0;
    for (const row of rows.slice(0, 50)) {
      const v = String(row[k] ?? "").trim();
      if (v) {
        len += v.length;
        n += 1;
      }
    }
    const avg = n ? len / n : 0;
    if (avg > bestLen) {
      bestLen = avg;
      best = k;
    }
  }
  return best;
}

function buildItems(rows, { textKey, categoryKey, dateKey }) {
  const items = [];
  for (const raw of rows) {
    const text = String(raw[textKey] ?? "").trim();
    if (!text) continue;
    items.push({
      id: items.length + 1,
      text,
      ...(categoryKey && String(raw[categoryKey] ?? "").trim()
        ? { category: String(raw[categoryKey]).trim() }
        : {}),
      ...(dateKey && String(raw[dateKey] ?? "").trim()
        ? { date: String(raw[dateKey]).trim() }
        : {}),
    });
  }
  return items;
}

function countPasted(lines) {
  return lines.map((l) => l.trim()).filter(Boolean).length;
}

export default function InputPanel({ onAnalyze, loading, backendOffline, error }) {
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState(null);
  const [isOver, setIsOver] = useState(false);
  const [fileMsg, setFileMsg] = useState(null); // { tone: "ok"|"warn"|"error", text }
  const fileRef = useRef(null);

  const itemCount = countPasted(pasted.split("\n"));

  function submitLines(lines) {
    const items = lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: i + 1, text }));
    if (items.length) onAnalyze(items);
  }

  function handlePaste() {
    submitLines(pasted.split("\n"));
  }

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setFileMsg(null);

    const analyze = (items, note) => {
      if (items.length) {
        if (note) setFileMsg({ tone: "ok", text: note });
        onAnalyze(items);
      }
    };

    // Treat every line as one feedback item (headerless list or single-column CSV).
    const parseHeaderless = () => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (res) => {
          const items = [];
          for (const row of res.data || []) {
            if (!row || !row.length) continue;
            const text = String(row[0] ?? "")
              .replace(/^\uFEFF/, "")
              .trim();
            if (!text) continue;
            items.push({ id: items.length + 1, text });
          }
          // If the file really had a header like "text"/"feedback", drop that lone label row.
          if (items.length > 1 && TEXT_ALIASES.has(normKey(items[0].text))) items.shift();
          if (items.length) {
            analyze(items, "No header row detected — every line was treated as one feedback item.");
          } else {
            setFileMsg({
              tone: "error",
              text: `“${file.name}” has no readable rows.`,
            });
          }
        },
        error: () =>
          setFileMsg({
            tone: "error",
            text: `Couldn't read “${file.name}”. Make sure it's a valid .csv file.`,
          }),
      });
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || []).filter((r) => r && Object.keys(r).length);
        if (!rows.length) {
          setFileMsg({
            tone: "error",
            text: `“${file.name}” has no readable rows.`,
          });
          return;
        }

        const keys = Object.keys(rows[0]);
        const { textKey, categoryKey, dateKey } = pickColumns(keys);

        // Recognized header — clean, standard parse.
        if (textKey) {
          analyze(buildItems(rows, { textKey, categoryKey, dateKey }));
          return;
        }

        // A single unnamed column is treated as a plain list of feedback lines
        // (re-parsed headerless so the first line is never swallowed as a header).
        if (keys.length === 1) {
          parseHeaderless();
          return;
        }

        // Multi-column file whose text header didn't match an alias: guess the
        // fullest-looking column so rows are scored instead of rejected.
        const guess = guessTextKey(rows);
        const items = buildItems(rows, {
          textKey: guess,
          categoryKey,
          dateKey,
        });
        if (items.length) {
          analyze(
            items,
            `Couldn't match a text column — used column “${guess}” as the feedback. Rename it “text” for a clean match.`,
          );
        } else {
          parseHeaderless();
        }
      },
      error: () =>
        setFileMsg({
          tone: "error",
          text: `Couldn't read “${file.name}”. Make sure it's a valid .csv file.`,
        }),
    });
  }

  return (
    <section className="relative z-10 mx-auto mt-12 w-full max-w-6xl px-5 sm:px-8">
      <div className="tilt-wrap">
        <div className="glass-strong tilt-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Analyze feedback
              </h2>
              <p className="mt-1 text-sm text-low">
                One item per line, or upload a CSV with <code className="glass-chip" style={{ margin: "0 2px", padding: "1px 7px", fontSize: 11.5 }}>text</code>{" "}
                (+ optional <code className="glass-chip" style={{ margin: "0 2px", padding: "1px 7px", fontSize: 11.5 }}>category</code>,{" "}
                <code className="glass-chip" style={{ margin: "0 2px", padding: "1px 7px", fontSize: 11.5 }}>date</code> columns).
              </p>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setPasted(SAMPLE_LINES.join("\n"))}
              disabled={loading}
              title="Fill the textarea with sample feedback"
            >
              Paste sample lines
            </button>
          </div>

          {backendOffline && (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]"
              style={{
                borderColor: "rgba(251, 113, 133, 0.35)",
                background: "rgba(251, 113, 133, 0.08)",
                color: "#fecdd3",
              }}
            >
              <span className="pulse-dot pulse-dot--off" style={{ marginTop: 4 }} />
              <span>
                <strong>Backend offline.</strong> Start the Flask API (<code>python app.py</code> inside{" "}
                <code>backend/</code>, port 5000), then retry. Pasted rows are still analysed on submit once it is up.
              </span>
            </div>
          )}

          {error && (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]"
              style={{
                borderColor: "rgba(251, 146, 60, 0.4)",
                background: "rgba(251, 146, 60, 0.09)",
                color: "#fed7aa",
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-3">
              <textarea
                className="field"
                rows={8}
                placeholder={
                  "The new dashboard is brilliant — saved us hours!\nApp keeps crashing on startup, extremely frustrating.\nIt's okay, nothing special…"
                }
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  if (fileName) setFileName(null);
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handlePaste();
                  }
                }}
                aria-label="Feedback text"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[12px] text-low">
                  {itemCount > 0 ? (
                    <>
                      <strong style={{ color: "var(--ink-hi)" }}>{itemCount}</strong> item
                      {itemCount === 1 ? "" : "s"} ready ·{" "}
                      <span className="inline-flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Ctrl/⌘ + Enter to run
                      </span>
                    </>
                  ) : (
                    "Nothing to analyze yet"
                  )}
                </span>
                <button
                  className="btn btn--primary"
                  onClick={handlePaste}
                  disabled={loading || itemCount === 0}
                >
                  {loading && <span className="loader-ring" />}
                  {loading ? "Scoring…" : "Analyze sentiment"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div
                className={`dropzone flex flex-col items-center justify-center gap-2 px-6 py-7 text-center ${
                  isOver ? "is-over" : ""
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsOver(true);
                }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                <div className="text-sm font-semibold" style={{ color: "var(--ink-hi)" }}>
                  {fileName ? `Parsed ${fileName}` : "Drop a CSV here"}
                </div>
                <div className="text-[12px] text-low">…or click to browse</div>
                <div className="glass-chip" style={{ marginTop: 4, fontSize: 11 }}>
                  .csv only
                </div>
              </div>

              {fileMsg && (
                <div
                  className="text-[12px] leading-relaxed"
                  style={{
                    color:
                      fileMsg.tone === "error"
                        ? "#fda4af"
                        : fileMsg.tone === "warn"
                          ? "#fcd34d"
                          : "#6ee7b7",
                  }}
                >
                  {fileMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
