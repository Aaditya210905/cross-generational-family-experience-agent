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
