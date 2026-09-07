# GAZE — frontend

Dark glassmorphic sentiment dashboard for GAZE.
Pure CSS 3D (tilt cards, orbit sphere, canvas starfield) — no extra dependencies.

## Run it together with the backend

**0. Optional — AI chat assistant (Gaze AI)**

The chat bubble in the bottom-right corner talks to NVIDIA's hosted LLMs through the Flask
proxy (`POST /chat` on the backend). To enable it, create `backend/.env` (copy
`backend/.env.example`) and add your free key from https://build.nvidia.com:

```
NVIDIA_API_KEY=nvapi-your-key-here
```

Then start (or restart) the backend so it loads the key. No key = the chat still opens, but
shows a friendly "Key needed" hint instead of answers.

**1. Backend (Flask, port 5000)** — from the `backend/` folder:

```bash
# first time only: create the env and install dependencies
python3 -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# .venv/bin/python -m pip install -r requirements.txt            # macOS/Linux

./.venv/Scripts/python.exe app.py                                # starts on http://127.0.0.1:5000
```

**2. Frontend (Vite dev server, port 5173)** — from the `frontend/` folder:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173 — the header shows a live **Engine online** badge that
polls `GET /health` on the Flask API every 5 seconds.

The API base URL defaults to `http://127.0.0.1:5000`. To point at another backend:

```bash
VITE_API_BASE=http://127.0.0.1:5001 npm run dev
```

## Scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm run dev`    | Start the Vite dev server          |
| `npm run lint`   | Run oxlint                         |
| `npm run build`  | Production build into `dist/`      |
| `npm run preview`| Serve the production build         |
