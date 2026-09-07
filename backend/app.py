import json
import os
import re
from collections import Counter

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()  # reads NVIDIA_API_KEY from backend/.env when present

app = Flask(__name__)
CORS(app)  # allows React (different port) to call this API

analyzer = SentimentIntensityAnalyzer()

STOPWORDS = set("""
the a an and or but of to in on for with is was were are be been being
this that it its i we you they he she was as at by from not no
""".split())


def classify(score):
    if score >= 0.05:
        return "positive"
    elif score <= -0.05:
        return "negative"
    return "neutral"


def extract_keywords(texts, top_n=10):
    words = []
    for text in texts:
        tokens = re.findall(r"[a-zA-Z']+", text.lower())
        words.extend(w for w in tokens if w not in STOPWORDS and len(w) > 2)
    counts = Counter(words)
    return [{"word": w, "count": c} for w, c in counts.most_common(top_n)]


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    feedback = data.get("feedback", [])

    results = []
    summary = {"positive": 0, "negative": 0, "neutral": 0}
    all_texts = []

    for item in feedback:
        text = item.get("text", "")
        all_texts.append(text)
        scores = analyzer.polarity_scores(text)
        sentiment = classify(scores["compound"])
        summary[sentiment] += 1

        result = {
            "id": item.get("id"),
            "text": text,
            "sentiment": sentiment,
            "score": round(scores["compound"], 2),
        }
        if "category" in item:
            result["category"] = item["category"]
        if "date" in item:
            result["date"] = item["date"]
        results.append(result)

    keywords = extract_keywords(all_texts)

    return jsonify({
        "results": results,
        "summary": summary,
        "keywords": keywords
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


NVIDIA_BASE = os.environ.get("NVIDIA_BASE", "https://integrate.api.nvidia.com/v1").rstrip("/")
DEFAULT_MODEL = "openai/gpt-oss-20b"

# Keys from build.nvidia.com are granted per model ("function not found for account"
# when a model isn't available to the key), so the proxy tries candidates in order.
FALLBACK_MODELS = [
    "openai/gpt-oss-20b",
    "minimaxai/minimax-m3",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "google/gemma-3-12b-it",
    "mistralai/mistral-nemotron",
    "deepseek-ai/deepseek-v4-flash-0731",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "microsoft/phi-3.5-moe-instruct",
]
_working_model = {"name": None}  # cached after the first successful call


def nvidia_key():
    return os.environ.get("NVIDIA_API_KEY", "").strip()


def nvidia_model():
    return os.environ.get("NVIDIA_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def build_system_message(context):
    parts = [
        "You are Gaze AI, the assistant inside GAZE, a sentiment-analysis dashboard. "
        "Answer in clear, friendly English and keep responses concise (2-6 sentences unless depth is requested). "
        "If you are given dashboard numbers, use them to answer questions like how users feel or what to fix first."
    ]
    if context:
        parts.append(f"Current dashboard state (from the live analysis):\n{context}")
    return {"role": "system", "content": "\n\n".join(parts)}


@app.route("/api/chat/info", methods=["GET"])
def chat_info():
    return jsonify({
        "keyConfigured": bool(nvidia_key()),
        "model": nvidia_model(),
        "activeModel": _working_model["name"],
        "defaultModel": DEFAULT_MODEL,
        "endpoint": f"{NVIDIA_BASE}/chat/completions",
        "baseOverride": bool(os.environ.get("NVIDIA_BASE")),
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    messages = body.get("messages") or []
    context = body.get("context")
    stream = bool(body.get("stream"))

    key = nvidia_key()
    if not key:
        return jsonify({
            "error": "missing_key",
            "message": "NVIDIA_API_KEY is not set. Create backend/.env with NVIDIA_API_KEY=nvapi-... then restart Flask.",
        }), 503

    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    # Prefer the env-picked model, then any previously confirmed working model,
    # then walk the fallback list (NVIDIA returns 404 for models a key can't use).
    candidates = [nvidia_model()]
    if _working_model["name"]:
        candidates.insert(0, _working_model["name"])
    for m in FALLBACK_MODELS:
        if m not in candidates:
            candidates.append(m)

    upstream = None
    last_detail = ""
    for attempt in candidates:
        payload = {
            "model": attempt,
            "messages": [build_system_message(context)] + (messages or [])[:20],
            "temperature": 0.4,
            "max_tokens": 900,
            "stream": stream,
        }
        try:
            candidate_resp = requests.post(
                f"{NVIDIA_BASE}/chat/completions",
                headers=headers,
                json=payload,
                stream=stream,
                timeout=150,
            )
        except requests.RequestException as exc:
            return jsonify({"error": "network", "message": f"Could not reach NVIDIA API: {exc}"}), 502

        if candidate_resp.status_code == 404:
            candidate_resp.close()
            try:
                last_detail = candidate_resp.json().get("detail") or candidate_resp.json().get("message", "")
            except Exception:
                last_detail = candidate_resp.text[:300]
            continue  # this key isn't entitled to that model — try the next one
        upstream = candidate_resp
        _working_model["name"] = attempt
        break

    if upstream is None:
        return jsonify({
            "error": "upstream_404",
            "message": (
                "Your NVIDIA key can't access any of the tried models. "
                "Generate a key from a model's page at build.nvidia.com "
                f"and set NVIDIA_MODEL in backend/.env. Last error: {last_detail[:200]}"
            ),
        }), 502

    if upstream.status_code != 200:
        detail = ""
        try:
            detail = upstream.json().get("message") or upstream.json().get("error", "")
        except Exception:
            detail = upstream.text[:300]
        hint = (
            " Check that the key in backend/.env is valid (nvapi-...) and has access to the model."
            if upstream.status_code in (401, 403)
            else ""
        )
        return jsonify({
            "error": f"upstream_{upstream.status_code}",
            "message": f"NVIDIA API error {upstream.status_code}: {detail}{hint}",
        }), 502

    if not stream:
        try:
            data = upstream.json()
            return jsonify({"reply": data["choices"][0]["message"]["content"]})
        except Exception:
            return jsonify({"error": "bad_response", "message": "Unexpected response shape from NVIDIA API."}), 502

    def generate():
        try:
            for line in upstream.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if not line.startswith("data:"):
                    continue
                chunk = line[5:].strip()
                if chunk == "[DONE]":
                    break
                try:
                    delta = json.loads(chunk)["choices"][0].get("delta", {}).get("content")
                except Exception:
                    continue
                if delta:
                    yield f"data: {json.dumps({'content': delta})}\n\n"
        finally:
            upstream.close()

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
