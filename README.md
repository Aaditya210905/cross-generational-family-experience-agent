# 🏠 FusionAI — Family Activity Recommender

> Cross-Generational Family Experience Agent — An AI-powered recommendation engine that finds activities, movies, and restaurants the *whole family* will enjoy, bridging generational taste gaps using Qloo's cultural taste graph.

## The Problem

Planning family activities across generations is hard. Grandma loves classic cinema, Dad enjoys action thrillers, and the teenager wants anime. Finding something *everyone* genuinely enjoys — not just tolerates — requires understanding taste at a deeper level than "pick the average."

## How It Works

1. **Tell us about your family** — Add 2–6 members with their generation and preferences
2. **We understand each person** — Preferences are resolved to real entities via Qloo's taste graph
3. **Smart candidate retrieval** — Per-person and combined queries surface bridge candidates
4. **Fairness-aware ranking** — No one gets steamrolled; the algorithm ensures minimum satisfaction
5. **Constraint filtering** — Hard/soft/unverified constraints shape the final list
6. **Transparent explanations** — See *why* each recommendation works for each person
7. **Feedback loop** — React to results and get refined recommendations

## Architecture

```
User Input → Entity Resolution (A) → Candidate Pool → Group Ranking (B) → Constraints (B) → Explanations (B) → Results UI (B)
                                         ↑                                                                           ↓
                                    Feedback Loop ←──────────────────────────────────────────────────────── Feedback (B)
```

### Group Scoring Formula

```
group_score = α × weighted_avg + (1 − α) × min_score + bridge_bonus
```

Where:
- **α (blend_ratio)**: Controls balance between average satisfaction and minimum satisfaction. Default: `0.7`
- **weighted_avg**: `Σ(w_i × score_i) / Σ(w_i)` — weighted average of all members' normalized scores
- **min_score**: The lowest individual score across all members — ensures no one is completely ignored
- **bridge_bonus**: `β × (overlapping_members / total_members)` when ≥2 members share tag overlap with the candidate. Default β: `0.05`

### Constraint Engine

| Type | Examples | Behavior |
|------|----------|----------|
| **Hard** | Dietary restrictions, at-home/outing, category | Item removed, shown as filtered |
| **Soft** | Budget, energy, time, mobility | Score penalty + warning badge |
| **Unverified** | Accessibility, specific allergens | "Please verify" badge |

### Data Source Labels
- 🟢 **Live Qloo** — Fresh API response
- 🟡 **Cached Qloo** — Cached within TTL
- 🔵 **Fallback** — Generated from local data when API unavailable

### Explanation Layer
1. Build structured evidence packet per candidate
2. Prompt LLM with evidence only — no hallucination possible
3. Validate output against evidence (entity/theme mention check)
4. Template-based fallback if LLM fails — demo never breaks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Qloo Integration | httpx (async), tenacity (retries) |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| LLM | OpenAI / Claude (structured output, custom base URL support) |
| Deployment | Vercel (frontend), Railway/Render (backend) |

## Setup

```bash
# Backend
conda create -p venv python==3.12
conda activate ./venv
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QLOO_API_KEY` | Qloo hackathon API key |
| `QLOO_BASE_URL` | Qloo hackathon base URL |
| `OPENAI_API_KEY` | OpenAI / LLM API key |
| `OPENAI_BASE_URL` | Custom LLM base URL (Gemini, Groq, OpenRouter, Ollama) |
| `LLM_MODEL` | LLM model name (default: `gpt-4o-mini`) |
| `APP_ENV` | Environment (`development` / `production`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `RATE_LIMIT_PER_MINUTE` | API rate limit (default: 30) |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (Person A) |
| POST | `/resolve` | Entity resolution via Qloo (Person A) |
| POST | `/retrieve` | Candidate retrieval via Qloo (Person A) |
| GET | `/api/health` | Health check (system) |
| POST | `/api/recommend` | Full pipeline: rank → constrain → explain |
| POST | `/api/feedback` | Submit feedback, get adjustments |
| GET | `/api/stream/{family_id}` | SSE progress events |
| GET | `/api/demo-families` | Load demo family data |

## Limitations
- Qloo affinity scores for cross-member candidates may be estimated (rank-based imputation)
- Constraint verification relies on available metadata — some constraints marked "unverified"
- LLM explanations validated against evidence but tone may vary
- Group scoring is our algorithm, not Qloo's — clearly labeled in UI

## Attribution
- **Powered by [Qloo](https://qloo.com)** — Cultural taste intelligence API
- Qloo provides entity resolution, taste affinities, and cultural graph data
- Group ranking, constraint filtering, and explanations are our original algorithms
- Built for the Qloo Hackathon 2026

## License

MIT
