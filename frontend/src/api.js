import axios from "axios";

// Defaults to the Flask backend on localhost:5000.
// Override at dev time with:  VITE_API_BASE=http://localhost:5001 npm run dev
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || "http://127.0.0.1:5000";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});

export { API_BASE };

export async function analyzeFeedback(feedback) {
  const response = await client.post("/analyze", { feedback });
  return response.data;
}

export async function checkBackendHealth() {
  try {
    const response = await client.get("/health", { timeout: 4000 });
    return response.status === 200 && response.data?.status === "ok";
  } catch {
    return false;
  }
}

// Stream a chat completion from the Flask proxy (which calls NVIDIA).
// Calls onDelta(text) as tokens arrive; resolves with the full reply text.
export async function chatWithAssistant({ messages, context, onDelta, signal }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context: context || null, stream: true }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    const e = new Error("Can't reach the backend — is Flask running on port 5000?");
    e.chatKind = "offline";
    throw e;
  }

  if (!res.ok) {
    let kind = `http_${res.status}`;
    let message = `The server answered HTTP ${res.status}.`;
    try {
      const body = await res.json();
      if (body.error) kind = body.error;
      if (body.message) message = body.message;
    } catch {
      /* non-JSON error body */
    }
    const e = new Error(message);
    e.chatKind = kind;
    throw e;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        if (typeof obj.content === "string" && obj.content) {
          full += obj.content;
          onDelta?.(obj.content);
        }
      } catch {
        /* ignore partial frames */
      }
    }
  }
  return full;
}

export async function fetchChatInfo() {
  try {
    const res = await fetch(`${API_BASE}/chat/info`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { keyConfigured: false, model: null };
    return await res.json();
  } catch {
    return { keyConfigured: false, model: null };
  }
}

export function describeError(err) {
  if (!err) return "Something went wrong.";
  if (err.code === "ECONNABORTED") {
    return "The request timed out — the analysis took too long.";
  }
  if (err.response) {
    if (err.response.status >= 500) return "Backend error — check the Flask logs for a traceback.";
    return `Backend rejected the request (HTTP ${err.response.status}).`;
  }
  if (err.message && /Network Error|ERR_CONNECTION_REFUSED|Failed to fetch/i.test(err.message)) {
    return "Can't reach the backend. Start it with `python app.py` inside /backend on port 5000.";
  }
  return err.message || "Something went wrong.";
}
