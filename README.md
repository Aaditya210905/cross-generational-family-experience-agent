# 🏠 FamilyFusion AI

**Cross-Generational Family Experience Agent** — An AI-powered recommendation engine that finds activities, movies, and restaurants the *whole family* will enjoy, bridging generational taste gaps using Qloo's taste intelligence.

## The Problem

Planning family activities across generations is hard. Grandma loves classic cinema, Dad enjoys action thrillers, and the teenager wants anime. Finding something *everyone* genuinely enjoys — not just tolerates — requires understanding taste at a deeper level than "pick the average."

## How It Works

1. **Tell us about your family** — Add 2–4 members with their generation and preferences
2. **We understand each person** — Preferences are resolved to real entities via Qloo's taste graph
3. **Smart candidate retrieval** — Per-person and combined queries surface bridge candidates
4. **Fairness-aware ranking** — No one gets steamrolled; the algorithm ensures minimum satisfaction
5. **Transparent explanations** — See *why* each recommendation works for each person

## Architecture

```
User Input → Entity Resolution (Qloo Search) → Retrieval (Qloo Insights)
    → Candidate Pool → Group Ranking → Constraint Filtering
    → Grounded Explanations (LLM) → Results + Feedback Loop
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Qloo Integration | httpx (async), tenacity (retries) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| LLM | Claude / OpenAI (structured output) |
| Deployment | Vercel (frontend), Railway/Render (backend) |

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # Set backend URL
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QLOO_API_KEY` | Qloo hackathon API key |
| `QLOO_BASE_URL` | Qloo hackathon base URL |
| `LLM_API_KEY` | Claude or OpenAI API key |
| `LLM_PROVIDER` | `claude` or `openai` |

## Powered By

- [Qloo](https://qloo.com) — Cultural AI / Taste Intelligence
- Built for the Qloo Hackathon 2026

## License

MIT

# FusionAI — Family Activity Recommender

> Helping multi-generational families find activities everyone actually enjoys, powered by Qloo's cultural taste graph.

## Architecture

```
User Input → Entity Resolution (A) → Candidate Pool → Group Ranking (B) → Constraints (B) → Explanations (B) → Results UI (B)
                                         ↑                                                                           ↓
                                    Feedback Loop ←──────────────────────────────────────────────────────── Feedback (B)
```

## Person B Territory

### Group Scoring Formula

The group score for each candidate is computed as:

```
group_score = α × weighted_avg + (1 − α) × min_score + bridge_bonus
```

Where:
- **α (blend_ratio)**: Controls balance between average satisfaction and minimum satisfaction. Default: `0.7`
- **weighted_avg**: `Σ(w_i × score_i) / Σ(w_i)` — weighted average of all members' normalized scores
- **min_score**: The lowest individual score across all members — ensures no one is completely ignored
- **bridge_bonus**: `β × (overlapping_members / total_members)` when ≥2 members share tag overlap with the candidate. Default β: `0.05`

### Why This Works
- **An item everyone likes a bit** beats **an item two love and one hates**
- **Bridge items** (connecting across generations) get a small boost
- **Diversity pass** removes near-duplicates (Jaccard similarity > 0.7) from the final list

### Constraint Engine

| Type | Examples | Behavior |
|------|----------|----------|
| **Hard** | Dietary restrictions, at-home/outing, category | Item removed, shown as filtered |
| **Soft** | Budget, energy, time, mobility | Score penalty + warning badge |
| **Unverified** | Accessibility, specific allergens | "Please verify" badge |

### Data Source Labels
Every result is labeled with its data source:
- 🟢 **Live Qloo** — Fresh API response
- 🟡 **Cached Qloo** — Cached within TTL
- 🔵 **Fallback** — Generated from local data when API unavailable

### Explanation Layer
1. Build structured evidence packet per candidate
2. Prompt LLM with evidence only — no hallucination possible
3. Validate output against evidence (entity/theme mention check)
4. Template-based fallback if LLM fails — demo never breaks

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

## API Routes (Person B)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
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
