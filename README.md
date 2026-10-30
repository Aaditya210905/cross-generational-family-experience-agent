<p align="center">
  <img src="FamilyFusion Home Emblem.png" alt="FamilyFusion Logo" width="420" />
</p>

<h3 align="center">AI-Powered Family Activity Recommender</h3>

<p align="center">
  <em>Find experiences every generation loves — powered by Qloo Taste AI™ and LLM-grounded explanations.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Qloo_Taste_AI™-Integrated-f59e0b" alt="Qloo" />
  <img src="https://img.shields.io/badge/LLM-GPT--4o_|_Gemini_|_Groq-8b5cf6" alt="LLM" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.12-3776ab?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 🎯 The Problem

**Family outings shouldn't start with an argument.**

Every multigenerational family knows the struggle: Grandma wants a classic film, Dad craves sushi, the teen wants escape rooms, and the 8-year-old just wants pizza. Current recommendation engines are built for *individuals* — they collapse when you need to satisfy a grandparent, a parent, a teen, and a child *simultaneously*.

Existing solutions either:
- 🚫 Optimize for one person and ignore everyone else
- 🚫 Pick the lowest-common-denominator (nobody's actually happy)
- 🚫 Lack real cultural taste intelligence — they guess instead of *understanding*

## 💡 Our Solution

**FamilyFusion** is a **multi-agent AI system** that maps the cultural taste profiles of every family member onto Qloo's Taste AI™ knowledge graph, then finds the *Pareto-optimal intersection* — activities, restaurants, and films that genuinely resonate across generational divides.

It doesn't just find something "okay for everyone." It finds **bridge experiences** — items that connect a grandmother's love of classic storytelling with a teenager's appetite for adventure, grounded in real cultural affinity data from Qloo's 575M+ entity graph.

---

## ✨ Key Features

### 🧬 Cross-Generational Taste Mapping
Each family member's preferences are resolved into verified Qloo entities via semantic search, LLM-powered query expansion, and confidence scoring. Free-text input like *"Bollywood classics"* or *"cozy Italian food"* is transformed into structured cultural vectors.

### ⚖️ Fairness-Aware Group Ranking Algorithm
Our custom scoring engine ensures **no family member is ignored**:

```
group_score = α × weighted_avg + (1 − α) × min_score + bridge_bonus
```

| Parameter | Purpose | Default |
|---|---|---|
| `α` (blend_ratio) | Balance between average and minimum satisfaction | 0.7 |
| `β` (bridge_bonus) | Boost for items that resonate across ≥2 generations | 0.05 |
| Diversity threshold | Jaccard dedup to prevent homogeneous results | 0.7 |
| Min-satisfaction floor | Heavy penalty if any member scores below this | 0.15 |

The algorithm guarantees that even the "weakest match" member is explicitly surfaced — along with an honest, warm explanation of *why* it still works for them.

### 🌉 Bridge Discovery Engine
The most innovative feature: **bridge items** are experiences where cultural signals from different generations unexpectedly overlap. A Studio Ghibli film that connects a grandparent's love of hand-drawn artistry with a child's love of animated adventures. A fusion restaurant where traditional recipes meet modern presentation. These are scored with an explicit **bridge bonus** and highlighted in the UI.

### 🛡️ Deterministic Constraint Engine
Real-world constraints (budget, dietary restrictions, mobility, energy level, time) are enforced **deterministically** — no LLM hallucination for pass/fail decisions:

| Constraint Type | Behavior | Example |
|---|---|---|
| **HARD** | Item removed entirely | Dietary violation, at-home only |
| **SOFT** | Score penalty + warning badge | Over budget, high energy |
| **UNVERIFIED** | "Please check" advisory | Cannot verify accessibility |

### 💡 LLM-Grounded Explanations
Every recommendation includes a warm, human-readable explanation — but the LLM is **strictly grounded** in an evidence packet. It can only reference facts that exist in the data. If validation fails, the system falls back to template-based explanations. Zero hallucinated facts about venues, prices, or hours.

### 🔄 Interactive Feedback Loop
Users can react to recommendations (👍 Like, 👎 Dislike, 🔄 Too Similar, or free-text steering like *"something less intense"*), which feeds back into the next recommendation cycle via structured `AdjustmentSet` objects. The LLM parses natural language feedback into structured filters — validated against an allowed list.

### 📡 Real-Time Agent Trace (SSE)
A live **Server-Sent Events** stream shows the multi-agent pipeline executing in real time:

```
🔍 Resolving preferences → 📊 Querying taste profiles → 🔄 Applying feedback
→ ⚖️ Fairness-optimized scoring → 🛡️ Verifying constraints → 💡 Grounded explanations
```

The UI renders each step with progress bars, status icons, and expandable detail panels — giving judges and users full transparency into the AI reasoning process.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│  ┌───────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────────┐   │
│  │  Welcome   │ │   Members    │ │Preferences │ │  Constraints  │   │
│  │  Screen    │ │   Screen     │ │  Screen    │ │    Screen     │   │
│  └───────────┘ └──────────────┘ └────────────┘ └───────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Results Screen + Agent Trace + Feedback           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                    React Context (Global State)                     │
│                    SSE Stream ← /api/stream/{id}                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST + SSE
┌──────────────────────────────▼──────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                     │
│                                                                     │
│  ┌─────────────────── Pipeline Orchestrator ──────────────────────┐ │
│  │                                                                 │ │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │ │
│  │  │ Entity   │  │ Retrieval │  │ Feedback │  │   Group      │  │ │
│  │  │Resolver  │→ │  Engine   │→ │ Handler  │→ │   Scorer     │  │ │
│  │  └────┬─────┘  └─────┬─────┘  └──────────┘  └──────┬───────┘  │ │
│  │       │              │                              │          │ │
│  │       ▼              ▼                              ▼          │ │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │ │
│  │  │   LLM    │  │   Qloo    │  │Constraint│  │     LLM      │  │ │
│  │  │ Expander │  │  Client   │  │  Engine  │  │  Explainer   │  │ │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Memory Cache │  │  Rate Limiter│  │   Progress Event Hub     │  │
│  │  (TTL-based) │  │  (per-IP)    │  │   (SSE pub/sub)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │      Qloo Taste AI™ API         │
              │   575M+ entities · 7T+ signals  │
              │   Cultural affinity graph        │
              └─────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16.4, React 19, TypeScript | Server components, Turbopack, type safety |
| **Styling** | Tailwind CSS 4.0, Custom design system | Warm editorial aesthetic, responsive, accessible |
| **Backend** | FastAPI, Python 3.12, Pydantic v2 | Async-native, auto-generated OpenAPI docs, strict validation |
| **Taste Intelligence** | Qloo Taste AI™ API | 575M+ cultural entities, real affinity scoring |
| **LLM Layer** | OpenAI / Gemini / Groq / Ollama (swappable) | Grounded explanations, query expansion, feedback parsing |
| **Streaming** | Server-Sent Events (SSE) | Real-time pipeline progress without WebSocket complexity |
| **Caching** | In-memory TTL cache | Saves API quota, sub-millisecond reads |
| **HTTP Client** | httpx + tenacity | Async requests with exponential backoff + retry |
| **Deployment** | Docker + Docker Compose | One-command reproducible setup |
| **Testing** | pytest + pytest-asyncio | Unit tests for scorer, constraints, feedback, explainer |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.12+** and **Node.js 18+**
- **Qloo API Key** (from the hackathon portal)
- **LLM API Key** (OpenAI, Gemini, Groq, or local Ollama)

### 1. Clone & Configure

```bash
git clone https://github.com/your-team/FusionAI.git
cd FusionAI

# Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
cd backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:3000** — the wizard will guide you through the full experience.

### 🐳 Docker (Alternative)

```bash
docker-compose up --build
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:3000
```

---

## 📖 User Journey — 5-Step Wizard

### Step 0 — Welcome & Category Selection
Choose a recommendation domain: **Movies & Shows**, **Restaurants & Food**, or **Activities & Outings**. Pre-built demo families are available for instant exploration.

### Step 1 — Family Members
Add 2–6 family members with generation labels (grandparent, parent, young adult, teen, child). Each member gets a weighted voice in the group scoring.

### Step 2 — Taste Signals
For each member, add likes and dealbreakers as free-text. Suggestions are contextual to the chosen category. Input is resolved against Qloo's entity graph with confidence chips — ambiguous matches can be confirmed, replaced, or removed.

### Step 3 — Constraints
Configure real-world filters: budget band, energy level, dietary restrictions, mobility notes, location, at-home preference, and time available. Hard constraints remove items; soft constraints apply penalties with warning badges.

### Step 4 — Results & Feedback
The multi-agent pipeline runs with a live agent trace. Results are ranked cards showing:
- **Group consensus score** (animated score ring)
- **Per-person match bars** with avatar emojis
- **Bridge themes** connecting generations
- **Grounded explanation** from the LLM
- **Constraint badges** (pass/warning/fail/unverified)
- **Confidence notes** on data quality
- **Interactive feedback** buttons for iterative refinement

---

## 🧠 How the AI Pipeline Works

### Stage 1: Entity Resolution
```
"Bollywood classics" → LLM expansion → ["Dilwale Dulhania", "Lagaan", ...]
                     → Qloo Search → verified entity IDs + confidence scores
```

### Stage 2: Candidate Retrieval
- Per-member Qloo Insights queries (individual taste signals)
- Combined query (pooled signals for bridge candidates)
- Merge + deduplicate + score imputation for missing pairs
- Normalize all scores to `[0, 1]` per person

### Stage 3: Fairness-Aware Ranking
- Weighted average across all members
- Minimum-satisfaction guarantee (no one ignored)
- Bridge bonus for cross-generational connectors
- Jaccard-based diversity pass (no clone results)

### Stage 4: Constraint Filtering
- Deterministic keyword-based rules (no LLM)
- Hard/soft/unverified classification
- Score penalties for soft violations

### Stage 5: Grounded Explanations
- Evidence packet built from scoring data only
- LLM generates warm, 1–2 sentence explanations
- Output validation: every entity/theme must exist in evidence
- Template fallback if validation fails

### Stage 6: Feedback Integration
- Like → seed signal boost
- Dislike → exclusion set
- Too Similar → diversity weight increase
- Free text → LLM-parsed structured adjustments

---

## 📁 Project Structure

```
FusionAI/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # App entry, CORS, rate limiting, routes
│   ├── config.py               # Unified settings from environment
│   ├── pipeline/
│   │   └── orchestrator.py     # 6-stage pipeline coordinator + SSE hub
│   ├── resolution/
│   │   └── resolver.py         # Entity resolution (text → Qloo entities)
│   ├── retrieval/
│   │   └── engine.py           # Candidate pool builder (Qloo Insights)
│   ├── ranking/
│   │   └── scorer.py           # Fairness-aware group scoring algorithm
│   ├── constraints/
│   │   └── engine.py           # Deterministic constraint enforcement
│   ├── explain/
│   │   ├── llm_explainer.py    # LLM-grounded explanation generator
│   │   ├── evidence.py         # Evidence packet builder
│   │   └── templates.py        # Template fallback explanations
│   ├── feedback/
│   │   └── handler.py          # Feedback → AdjustmentSet converter
│   ├── llm/
│   │   └── client.py           # Central LLM service (multi-provider)
│   ├── qloo/
│   │   └── client.py           # Qloo API client (retries, caching)
│   ├── cache/
│   │   └── memory_cache.py     # TTL-based in-memory cache
│   ├── models/                 # Pydantic models (entities, candidates)
│   ├── routes/                 # FastAPI route handlers
│   │   ├── resolve.py          # POST /api/resolve
│   │   ├── retrieve.py         # POST /api/retrieve
│   │   ├── recommend.py        # POST /api/recommend
│   │   ├── feedback.py         # POST/GET/DELETE /api/feedback
│   │   ├── stream.py           # GET /api/stream/{family_id} (SSE)
│   │   ├── demo.py             # GET /api/demo-families
│   │   └── health.py           # GET /api/health
│   └── tests/                  # Unit + integration tests
├── contracts/                  # Shared Pydantic models (frontend ↔ backend)
│   ├── models.py               # 460+ lines of typed data contracts
│   └── demo_families.py        # Pre-built demo family profiles
├── frontend/                   # Next.js 16 frontend
│   ├── src/app/
│   │   ├── page.tsx            # Main wizard shell + header
│   │   ├── layout.tsx          # Root layout, fonts, metadata
│   │   └── globals.css         # 550+ line design system
│   ├── src/components/
│   │   ├── WelcomeScreen.tsx   # Category + demo selector
│   │   ├── MembersScreen.tsx   # Family member builder
│   │   ├── PreferencesScreen.tsx # Taste input + entity resolution UI
│   │   ├── ConstraintsScreen.tsx # Bento-grid constraint controls
│   │   ├── ResultsScreen.tsx   # Pipeline runner + results display
│   │   ├── AgentTrace.js       # Live SSE pipeline visualization
│   │   ├── ResultCard.js       # Ranked result card with breakdown
│   │   ├── ScoreRing.js        # Animated SVG consensus ring
│   │   └── MatchBar.js         # Per-person score bar
│   └── src/lib/
│       ├── types.ts            # TypeScript type definitions
│       ├── api.ts              # API client (fetch + SSE)
│       └── store.tsx           # React Context global state
├── Dockerfile                  # Backend container
├── docker-compose.yml          # Full-stack orchestration
├── requirements.txt            # Python dependencies
└── .env.example                # Environment variable template
```

---

## 🔑 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/resolve` | Resolve free-text preferences into Qloo entities |
| `POST` | `/api/retrieve` | Build scored candidate pool from resolved entities |
| `POST` | `/api/recommend` | Full pipeline: resolve → retrieve → rank → constrain → explain |
| `POST` | `/api/feedback` | Submit reactions, get structured adjustments |
| `GET` | `/api/feedback/{id}` | Get current adjustment set for a family |
| `DELETE` | `/api/feedback/{id}` | Clear all feedback for a family |
| `GET` | `/api/stream/{id}` | SSE stream for real-time pipeline progress |
| `GET` | `/api/demo-families` | List pre-built demo family profiles |
| `GET` | `/api/health` | Health check with configuration status |

Full interactive docs available at **http://localhost:8000/docs** (Swagger UI) and **http://localhost:8000/redoc** (ReDoc).

---

## 🧪 Testing

```bash
# Run all backend tests
cd backend
pytest -v

# Specific test suites
pytest ranking/test_scorer.py -v          # Group scoring algorithm
pytest constraints/test_constraints.py -v  # Constraint engine
pytest feedback/test_feedback.py -v        # Feedback handler
pytest explain/test_explain.py -v          # Explanation layer
pytest tests/test_live_pipeline.py -v      # Live integration tests
```

---

## 🌍 LLM Provider Flexibility

FamilyFusion supports **any OpenAI-compatible LLM** via a single environment variable:

| Provider | `OPENAI_BASE_URL` | `LLM_MODEL` |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | Any model |
| Local Ollama | `http://localhost:11434/v1` | `llama3.1` |

All LLM calls have **deterministic fallbacks** — the app works without any LLM configured, using template-based explanations and keyword expansion.

---

## 🔮 What Makes This Different

| Feature | Traditional Recommenders | FamilyFusion |
|---|---|---|
| **Audience** | Single user | Multi-generational group (2–6 people) |
| **Fairness** | Majority rules | Min-satisfaction guarantee + weighted consensus |
| **Cultural depth** | Collaborative filtering | Qloo's 575M-entity cultural knowledge graph |
| **Transparency** | Black box | Live agent trace + grounded explanations |
| **Constraints** | Basic filters | Hard/soft/unverified with deterministic enforcement |
| **Adaptability** | Static results | Interactive feedback loop with iterative refinement |
| **Bridge Discovery** | ❌ | ✅ Identifies cross-generational cultural connectors |
| **Explainability** | ❌ | ✅ Per-person reasons with evidence grounding |

---

## 👥 Team

Built with ❤️ for the Qloo Hackathon 2026.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
