# RebarGuard

**Multi-agent AI inspector for reinforced-concrete construction.** Photos in, compliance scores
out. Gates concrete-pour approval against Turkish seismic codes (TBDY 2018 —
*Türkiye Bina Deprem Yönetmeliği*; TS 500 — concrete design rules).

→ **Try it live:** [rebarguard.vercel.app](https://rebarguard.vercel.app)
→ **Repo:** [github.com/Himess/rebarguard](https://github.com/Himess/rebarguard)

Built for the [Hermes Agent Creative Hackathon 2026](https://x.com/NousResearch) on
**[Hermes Agent](https://github.com/NousResearch/hermes-agent)** (Nous Research) +
**[Kimi K2.5](https://platform.moonshot.ai/)** (Moonshot).

[![MIT](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009485?style=flat-square)
![Hermes Agent](https://img.shields.io/badge/Hermes%20Agent-v0.10-FF6A1F?style=flat-square)
![Kimi K2.5](https://img.shields.io/badge/Kimi%20K2.5-vision-3B9EFF?style=flat-square)
![GPG](https://img.shields.io/badge/commits-100%25%20verified-2ea44f?style=flat-square)

---

## The problem

In Turkey, concrete has rigorous on-site inspection (embedded chips, GPS-tracked core samples,
engineer-authenticated photos). **Rebar does not.** Once concrete pours, the steel inside is
invisible forever — and it's where earthquakes win or lose. Rebar theft, wrong spacing, missing
stirrups, and undersized diameters are a silent structural risk.

The Kahramanmaraş 2023 earthquake collapsed 58,500 buildings. A lot of them had steel on paper
that never made it into the mold.

## The system

1. Municipality-approved structural drawing (PDF) → **Kimi K2.5** parses → structured plan JSON
   with columns, beams, slabs, shear walls, stairs, and all metadata (city, soil class, seismic
   zone, floor count, footprint).
2. Contractor uploads site photos **before each pour** → **Kimi K2.5** detects the rebar layout,
   measures cover, reads steel class from rib pattern, counts stirrups.
3. **Nine Hermes-orchestrated agents debate in real time** (SSE-streamed to the browser):
   - `PlanParser` · `GeometryAgent` · `CodeAgent` · `FraudAgent` · `SeismicRiskAgent`
   - `MaterialAgent` · `CoverAgent` · `Moderator` · `Belediye Agent`
4. Score + category bars + 3D overlay of plan vs. site → **pour-gate** decision
   (`APPROVE` / `CONDITIONAL` / `REJECT`).
5. Every citation (`TBDY 7.3.4.2`, `TS 500 7.6`, …) is clickable and loads the actual article
   text from the curated RAG — no hallucinated code references.

## Stack

| Layer | Choice |
|-------|--------|
| Orchestration | **Hermes Agent** (Python CLI, subprocess bridge) |
| Vision + agentic | **Kimi K2.5** via Nous Portal subscription ($0/1M on Basic plan) |
| Reasoning synthesis | **Hermes 4 70B** (Moderator + Belediye narrative) |
| Backend | FastAPI + SSE (`sse-starlette`) + Pydantic v2 |
| Frontend | Next.js 16 (App Router) + React 19 + Three.js + Tailwind v4 (OKLCH) |
| PDF | `pdf2image` + Poppler |
| Regulations | Curated `Article` DB + prompt-whitelist to prevent hallucinated citations |
| Deploy | Vercel (frontend) + Fly.io (backend, Frankfurt) |

## Screenshots

> Full shots land with the demo video; live URL lets you poke around now.

| Landing — "Once concrete pours, the rebar is invisible" | 9-agent live debate + score |
|---|---|
| [rebarguard.vercel.app](https://rebarguard.vercel.app) | [/inspection/new](https://rebarguard.vercel.app/inspection/new) |
| Quick photo scan (bbox callouts + TBDY article modal) | Demo scenarios (happy / conditional / reject) |
| [/quick](https://rebarguard.vercel.app/quick) | [/demo](https://rebarguard.vercel.app/demo) |

## Run locally

```bash
git clone https://github.com/Himess/rebarguard
cd rebarguard

# Frontend (http://localhost:3000)
cd frontend && pnpm install && pnpm dev

# Backend (http://localhost:8000) — requires Hermes Agent CLI + Nous Portal OAuth
cd ../backend && uv sync
# One-time: bash ../scripts/setup-hermes.sh
uv run uvicorn rebarguard.main:app --reload --host 0.0.0.0 --port 8000
```

For the full deploy path (Fly.io + Vercel + Hermes OAuth device flow), see **[DEPLOY.md](./DEPLOY.md)**.

## Try it without running a backend

Every page has a sensible offline fallback:

- `/quick` — drops a pre-labelled demo finding set if the backend is unreachable.
- `/demo` — three scenario cards (approve / conditional / reject) with expected verdicts.
- `/dashboard` — shows an `OFFLINE` badge but doesn't crash.

## Repo map

```
backend/
  src/rebarguard/
    agents/           9 agents (Kimi vision + Hermes 4 reasoning + deterministic)
    hermes_runtime/   Subprocess bridge to `hermes chat` CLI (subscription path)
    rag/              Curated TBDY + TS 500 article DB + prompt whitelist
    routers/          /api/projects · /api/inspections · /api/quick · /api/regulations · /api/demo
    schemas/          Pydantic v2 models (StructuralPlan, AgentMessage, …)
    services/         InspectionOrchestrator (SSE-streamed 9-agent debate)
    vision/           Kimi K2.5 client + prompts
  tests/              Schema + geometry unit tests + HTTP smoke tests + RAG whitelist tests
  Dockerfile          Python 3.11 + uv + poppler + Hermes Agent CLI (Fly target)
  fly.toml            fra region · 1 CPU / 1 GB · auto-suspend · hermes_data volume

frontend/
  app/
    page.tsx          Landing: hero + agent ring + stats
    quick/            Single-photo Kimi scanner with SVG bbox callouts
    dashboard/        Public project board + seed Fıstık CTA
    inspection/new/   60% 3D hero + live 9-agent SSE debate + verdict cinema
    demo/             Three curated scenarios (mat / column / wall)
    agents/           The debate flow — cards + numbered steps
    styleguide/       Design system spec (OKLCH tokens, Plex Sans/Mono)
  components/         TopNav, DebateStream, ScorePanel, ClaudeBuildingViewer, VerdictCinema, ArticleModal, …
  lib/                api.ts (REST + SSE client), agents.ts (catalogue)

data/
  regulations/        TBDY 2018 PDF (AFAD, 7.1 MB)
  rebar_photos/       Real Fıstık Ağacı site photos (anonymized)
  sample_projects/    Turkish structural PDFs for PlanParser validation

docs/                 Architecture + scope decisions
scripts/              Dev probes (`_*.sh`, gitignored) + public setup helpers
skills/               Custom Hermes Agent SKILL.md files (PlanParser, InspectRebar, Moderate)
CLAUDE.md             Full project handoff + day-by-day decision log
plan.md               16-day timeline
DEPLOY.md             Vercel + Fly.io deploy runbook
AUDIT.md              Pre-submission audit (backend, frontend, deploy, docs)
```

## Hackathon tracks

- **Main Track** — Hermes Agent orchestrating a 9-agent debate on real structural-engineering
  data, SSE-streamed to a Three.js building viewer.
- **Kimi Track** — Kimi K2.5 handles every vision call (plan parsing, rebar detection, material
  class, concrete cover). Every `AgentMessage.evidence.model` field carries
  `moonshotai/kimi-k2.5` or `Hermes-4-70B` so the demo video is self-documenting proof.

## Judging criteria self-assessment

- **Usefulness** — real regulation, real data (1340 Ada 43 Parsel project in Istanbul, engineer
  Ferhat Baş), real photos. Output is quantified: score 0–100 with category bars, missing-rebar
  counts, ₺ fraud estimate, % seismic-capacity loss.
- **Creativity** — structural engineering reframed through the creative-software axis:
  interactive 3D building, live agent debate as a media artifact, curated regulation RAG with
  clickable article modals.
- **Presentation** — pixel-perfect OKLCH design system (see `/styleguide`), IBM Plex typography,
  `VerdictCinema` reveal animation, `ArticleModal` EN/TR toggle.

## License

[MIT](./LICENSE) © 2026 Himess
