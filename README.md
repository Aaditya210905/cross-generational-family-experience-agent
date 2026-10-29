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
