import { useCallback, useEffect, useRef, useState } from "react";
import { chatWithAssistant, fetchChatInfo } from "../api";

const QUICK_PROMPTS = [
  "How do users feel overall?",
  "Summarize the negative feedback",
  "What should we fix first?",
];

function renderRich(text) {
  // Minimal safe formatting: **bold** + line breaks + · bullets preserved.
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function ChatWidget({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [chatInfo, setChatInfo] = useState(null); // { keyConfigured, model }
  const intro = "Hi! I'm Gaze AI 🤖 — I can talk about this dashboard's sentiment numbers or answer general questions. Ask away!";
  const bodyRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    fetchChatInfo().then(setChatInfo);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, open]);

  // Abort any in-flight stream when the widget unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (raw) => {
      const text = String(raw || "").trim();
      if (!text || streaming) return;

      const userMsg = { role: "user", content: text };
      const history = [...messages, userMsg].slice(-14);
      const ctx = context
        ? Object.entries(context)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join("\n")
        : null;

      setMessages(history);
      setInput("");
      setError(null);
      setStreaming(true);
      const assistantIdx = history.length;
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        await chatWithAssistant({
          messages: history.map(({ role, content }) => ({ role, content })),
          context: ctx,
          signal: ctrl.signal,
          onDelta: (delta) =>
            setMessages((m) =>
              m.map((msg, i) => (i === assistantIdx ? { ...msg, content: msg.content + delta } : msg)),
            ),
        });
        setStreaming(false);
        abortRef.current = null;
      } catch (err) {
        if (err.name === "AbortError") return;
        const friendly =
          err.chatKind === "missing_key"
            ? "⚠️ No NVIDIA key yet — create `backend/.env` with `NVIDIA_API_KEY=nvapi-…` and restart Flask."
            : err.message || "Something went wrong talking to the AI.";
        setError(friendly);
        setMessages((m) =>
          m.map((msg, i) =>
            i === assistantIdx && !msg.content
              ? { ...msg, content: "", failed: true }
              : msg,
          ),
        );
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, context],
  );

  return (
    <>
      <button
        className={`chat-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        title="Ask Gaze AI — NVIDIA AI"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        <span className="chat-fab__pulse" aria-hidden="true" />
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="AI assistant">
          <div className="chat-head">
            <div className="flex items-center gap-2.5">
              <span className="chat-avatar">✦</span>
              <div>
                <div className="font-display text-[14px] font-bold leading-tight tracking-tight">
                  Gaze AI
                </div>
                <div className="text-[11px] text-low">Powered by NVIDIA</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="glass-chip"
                style={{
                  fontSize: 10.5,
                  padding: "2px 8px",
                  color: chatInfo?.keyConfigured ? "#6ee7b7" : "#fcd34d",
                  borderColor: chatInfo?.keyConfigured
                    ? "rgba(52,211,153,0.4)"
                    : "rgba(251,191,36,0.35)",
                }}
              >
                <span
                  className={`pulse-dot ${chatInfo?.keyConfigured ? "pulse-dot--on" : "pulse-dot--wait"}`}
                />
                {chatInfo?.keyConfigured ? "AI ready" : "Key needed"}
              </span>
            </div>
          </div>

          <div className="chat-body" ref={bodyRef}>
            <div className="chat-msg chat-msg--ai">
              {renderRich(intro)}
            </div>

            {messages.map((m, i) => {
              const last = i === messages.length - 1;
              return (
                <div key={i} className={`chat-msg chat-msg--${m.role}`}>
                  {m.role === "user" ? (
                    renderRich(m.content)
                  ) : last && streaming ? (
                    <>
                      {m.content ? renderRich(m.content) : ""}
                      <span className="chat-typing">
                        <i />
                        <i />
                        <i />
                      </span>
                    </>
                  ) : m.failed && !m.content ? null : (
                    renderRich(m.content || "")
                  )}
                </div>
              );
            })}

            {error && (
              <div
                className="text-[12px] leading-relaxed"
                style={{
                  color: "#fda4af",
                  background: "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.25)",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                {error}
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    className="glass-chip chat-chip"
                    onClick={() => send(q)}
                    disabled={streaming}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-foot">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Ask about the feedback…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              aria-label="Message Gaze AI"
            />
            {streaming ? (
              <button className="btn btn--ghost chat-send" onClick={stop} title="Stop generating">
                ■
              </button>
            ) : (
              <button
                className="btn btn--primary chat-send"
                onClick={() => send(input)}
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
