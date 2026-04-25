# RebarGuard — Architecture

## Layers

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 16)                   │
│  ├─ /                landing                                    │
│  ├─ /upload          müteahhit: PDF project upload              │
│  ├─ /dashboard       belediye: pending inspections table        │
│  └─ /inspection/new  live agent debate + 3D overlay + score     │
│  Components:                                                    │
│   - AgentDebateFeed (motion, animated feed from SSE)            │
│   - ScorePanel      (circular score + category bars)            │
│   - ThreeOverlay    (plan vs. site in Three.js)                 │
└────────────────────────────────────────────────────────────────┘
                       ▲
                       │ REST + SSE
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│  Routers:                                                        │
│   - POST /api/projects        PDF → StructuralPlan               │
│   - GET  /api/projects        list                               │
│   - GET  /api/projects/:id    detail                             │
│   - POST /api/inspections/stream  (SSE — AgentMessage stream)    │
│                                                                  │
│  Services:                                                       │
│   - InspectionOrchestrator  runs 7-agent debate                  │
│                                                                  │
│  Agents (each an async skill):                                   │
│   - PlanParserAgent     Kimi-VL → StructuralPlan (Phase 1)       │
│   - GeometryAgent       deterministic plan-vs-site diff          │
│   - CodeAgent           TBDY 2018 rule-engine + RAG (Day 7)      │
│   - FraudAgent          EXIF + reference-marker + hash-dup       │
│   - RiskAgent           AFAD zone × soil × floors                │
│   - MaterialAgent       Kimi-VL closeup → steel class + rust     │
│   - CoverAgent          Kimi-VL with marker → paspayı            │
│   - ModeratorAgent      Hermes 4 JSON debate → final verdict     │
│                                                                  │
│  Vision:                                                         │
│   - KimiVisionClient    Moonshot OpenAI-compat, JSON-mode calls  │
│                                                                  │
│  Reasoning:                                                      │
│   - HermesClient        Nous Portal OpenAI-compat                │
└────────────────────────────────────────────────────────────────┘
                       ▲
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Nous Portal    Moonshot API    AFAD (stub)
   (Hermes 4)     (Kimi-VL)       (demo hardcode)
```

## Data flow — Phase 1 (Project ingestion)

1. Contractor uploads approved PDF to `POST /api/projects`.
2. `PlanParserAgent` rasterizes pages via `pdf2image + poppler`.
3. For each page, `KimiVisionClient.analyze_image` is called with `PLAN_PARSE_PROMPT`.
4. Per-page JSONs are merged into `StructuralPlan`.
5. Project is stored (in-memory for Day 1-2; Supabase Day 11+).

## Data flow — Phase 2 (Site inspection)

1. Municipal engineer (or contractor awaiting approval) calls `POST /api/inspections/stream` with photos + project_id + column_id.
2. Backend spawns `InspectionOrchestrator`:
   a. Kimi-VL detects rebar per photo → `RebarDetection[]`.
   b. `asyncio.gather` runs Geometry + Code + Fraud + Risk in parallel.
   c. Material + Cover run (or no-op if photos absent).
   d. `ModeratorAgent` sends the 6 reports to Hermes 4 → final verdict + score.
3. Each stage emits an `AgentMessage` through the async generator.
4. FastAPI SSE endpoint forwards each message to the frontend.

## Why Hermes Agent + Kimi K2.6 + Hermes 4 (hybrid)

| Role | Model | Why |
|------|-------|-----|
| Agentic orchestration, vision (PDF + site photos + material + cover) | **Kimi K2.6** via Nous Portal (`moonshotai/kimi-k2.6`) | $0 on Nous Portal free tier. Native vision (MoonViT). Explicitly recommended by Nous Portal as an agentic model. Kimi-track eligibility. |
| Deep reasoning: Moderator verdict synthesis + CodeAgent violation narrative | **Hermes-4-70B** via Nous Portal ($0.05 in / $0.20 out per 1M) | Hybrid-thinking reasoning model, Nous-branded. Single-shot synthesis is its sweet spot. Moderator is where verdict correctness matters most. |
| Orchestration glue | **Hermes Agent** framework (Nous) | Skill system, FTS5 memory, subagent parallelism. Hackathon host's own product. |
| Reasoning fallback | Hermes-4-405B ($0.09/$0.37) | Optional — switch via `HERMES_REASONING_MODEL` env for frontier-depth demo scenario. |
| Vision fallback | Moonshot direct API | Set `VISION_BACKEND=moonshot` if Nous Portal multimodal proves unreliable. |

**Design principle:** agentic models (Kimi K2.6) run in loops with tools; reasoning models (Hermes 4) think deeply in one shot. Use each for what it's best at. Nous Portal's UI explicitly warns against using Hermes 4 as the main agentic loop — we follow that guidance.

## Scoring algorithm

```
category_score(severity) = {"low": 90, "medium": 70, "high": 45, "critical": 15}[severity]
risk_score = 100 - (risk_multiplier - 1) * 40   # clipped [0,100]
overall = mean(category_scores) / risk_multiplier   # clipped [0,100]
```

Hermes 4 reviews and may adjust; heuristic is fallback when Hermes response is malformed.

## Security & privacy

- Photos + PDFs are ephemeral on the backend (temp dirs); Supabase Storage later.
- No personal data beyond uploader role (Supabase Auth).
- Keys in `.env` only, `.gitignore`'d.
