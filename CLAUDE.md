# CLAUDE.md — RebarGuard Project Handoff

> **Purpose of this file:** If this session closes, the next Claude session reads this file FIRST and picks up without losing context. All decisions, architecture, tools, progress, and next steps live here. Keep it updated.

---

## Mission (1-sentence)

**RebarGuard** is a multi-agent AI inspector for reinforced-concrete construction sites that analyzes rebar workmanship from photos + approved structural drawings, scores compliance with Turkish codes (TBDY 2018 / TS 500), and gates the concrete-pour approval — built on **Hermes Agent (Nous Research) + Kimi-VL (Moonshot)** for the **Hermes Agent Creative Hackathon 2026**.

## Hackathon context

- **Event:** Hermes Agent Creative Hackathon
- **Sponsors:** Nous Research + Kimi/Moonshot
- **Prize pool:** $25K total ($15K Main + $5K Kimi + $5K Kimi credits)
- **Target:** Main 1st ($10K) + Kimi 1st ($3.5K) — dual-track eligibility
- **Deadline:** Sunday, May 3, 2026 (EOD)
- **Start date:** April 18, 2026
- **Budget days:** 16
- **Submission:** Tweet demo video tagging @NousResearch + writeup + link to Nous Discord `creative-hackathon-submissions`
- **Discount code:** `HERMESAGENT0010` (Nous Portal — first 250 users)
- **Judges evaluate:** creativity, usefulness, presentation

## Why this project wins

1. **Real-world stakes** — earthquake safety in Turkey (Kahramanmaraş 2023 framing for the video, not as a core feature)
2. **Different domain** — most submissions will be chatbots / creative writing / image-gen; structural-engineering multi-agent system stands out
3. **Quantified output** — "4 rebars missing, ~₺48K fraud, ~18% seismic-capacity loss" — concrete numbers hit harder than vibes
4. **Dual-model architecture** — Hermes (reasoning/orchestration) + Kimi-VL (vision/OCR) visibly showcased → eligible for BOTH tracks
5. **Multi-agent debate visualization** — Hermes 4's tool-calling strength is literally displayed on screen

## Stack decisions (LOCKED)

| Layer | Tech | Why |
|-------|------|-----|
| Orchestrator agent | **Hermes Agent framework** (Python) | Multi-agent native, model-agnostic, skill system, memory |
| Reasoning model | **Hermes 4 70B** via Nous Portal API | Trained on agentic traces, strong tool use, hackathon-branded |
| Vision model | **Kimi-VL** (A3B-Instruct) via Moonshot API | MoonViT native-resolution encoder, strong OCR, cheap ($0.60/M in, $2.50/M out), Kimi track qualifier |
| Backend | **FastAPI** (Python 3.11+) | Native Hermes integration, async-first |
| Frontend | **Next.js 16** (App Router, React 19) | Modern, Vercel deploy, familiar |
| 3D viewer | **Three.js** + react-three-fiber | Rebar schematic vs. site-photo overlay |
| Styling | **Tailwind CSS v4** | |
| Motion | **Motion / GSAP / Lenis** | Demo polish |
| Database | **Supabase** (Postgres + Storage) | Project files, photos, audit history |
| Auth | Supabase Auth, roles: Müteahhit / Belediye / İnşaat Mühendisi | |
| Regulations RAG | **pgvector** on Supabase | TBDY 2018 + TS 500 chunks |
| Deploy | Vercel (frontend) + Modal or Fly.io (backend) | |

## User decisions (recorded verbatim)

- **User:** Hackathon'a birincilik hedefliyoruz. "Yetişmez" deme.
- **User:** Hermes kullanalım. Nous Portal $10 free tier mevcut.
- **User:** Kahramanmaraş vakasını çekirdek feature yapma — sadece demo videosunda bahset.
- **User:** Rebar dataset: open-source scrape + Kahramanmaraş açık veri + birkaç foto kullanıcıdan.
- **User:** TBDY 2018 + TS 500'ü Claude indirsin.
- **User:** Tech stack (Next.js 16 + FastAPI + Supabase + Three.js) onaylı.
- **User:** 7 agent olsun (4 yerine).
- **User:** Claude durmadan çalışsın, tek sessionda 2-3 günlük iş.
- **User:** No Claude AI / Co-Authored-By references in commits/PRs (global preference).
- **User:** Turkish-speaking, prefers direct communication.

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js 16 + React 19 + Three.js + Tailwind v4)      │
│  Routes:                                                          │
│   /              landing + pitch                                  │
│   /upload        müteahhit: proje PDF + saha foto yükle          │
│   /dashboard     belediye: pending inspections, approve/reject    │
│   /inspection/:id  canlı agent debate + 3D overlay viewer        │
└──────────────────────────────────────────────────────────────────┘
                          ↕ REST + SSE (streaming debate)
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI)                                                │
│                                                                   │
│  PHASE 1 — Project Ingestion  (once per building)                │
│    POST /api/projects                                            │
│      Kimi-VL parse PDF drawing →                                  │
│      Hermes skill `parse_structural_plan` →                       │
│      structured JSON (kolonlar, donatı şemaları, kesitler)       │
│                                                                   │
│  PHASE 2 — Site Inspection  (per floor, before pour)             │
│    POST /api/inspections                                          │
│      Kimi-VL analyze site photos → detection JSON                 │
│      Hermes orchestrator runs 7-agent debate:                     │
│       ┌─ GeometryAgent    site vs. plan diff                      │
│       ├─ CodeAgent        TBDY 2018 / TS 500 RAG compliance       │
│       ├─ FraudAgent       EXIF, ref markers, inconsistency        │
│       ├─ RiskAgent        AFAD zone + soil class + floor → mult   │
│       ├─ MaterialAgent    rebar class (S420, B500C), corrosion    │
│       ├─ CoverAgent       paspayı (concrete cover) check          │
│       └─ Moderator        debate final → score + report           │
│    SSE stream agent messages → frontend live                      │
│                                                                   │
│  PHASE 3 — Approval Gate                                          │
│    POST /api/inspections/:id/approve                              │
│      score ≥ threshold + human engineer signature → "pour ok"    │
└──────────────────────────────────────────────────────────────────┘
                          ↕
     ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
     │ Supabase      │   │ AFAD API      │   │ Nous Portal   │
     │ (projects,    │   │ (deprem zone, │   │ (Hermes 4 70B)│
     │  photos,      │   │  zemin sınıf) │   └───────────────┘
     │  audit log,   │   └───────────────┘   ┌───────────────┐
     │  pgvector)    │                       │ Moonshot API  │
     └───────────────┘                       │ (Kimi-VL)     │
                                             └───────────────┘
```

## The 7 agents (detailed)

1. **PlanParserAgent** (Phase 1) — Kimi-VL reads approved PDF structural drawing, emits structured JSON schema. Handles Turkish technical drawing conventions.
2. **GeometryAgent** (Phase 2) — Takes Kimi-VL site-photo detection output + PlanParser JSON → computes diff (rebar count, spacing, diameter, stirrup ratio, vertical/horizontal arrangement).
3. **CodeAgent** (Phase 2) — RAG against TBDY 2018 + TS 500 pgvector index. Checks: min rebar ratio, stirrup spacing in confinement zones, seismic detailing (Bölüm 7).
4. **FraudAgent** (Phase 2) — EXIF timestamp & geolocation validation, reference-marker presence, cross-photo consistency, prior-photo hash check.
5. **RiskAgent** (Phase 2) — Queries AFAD earthquake-zone API for coordinates → soil class + PGA → computes risk multiplier for scoring.
6. **MaterialAgent** (Phase 2) — Detects rebar class markings (S420, B500C), corrosion/rust level, surface condition.
7. **CoverAgent** (Phase 2) — Concrete cover (paspayı) check — estimates distance from rebar to form surface using reference markers.
8. **ModeratorAgent** — Not counted in the 7. Consumes other agents' outputs, orchestrates a debate round (each agent can challenge), produces final score + structured report + recommendation (APPROVE / CONDITIONAL / REJECT).

## Data assets

- **Regulations:**
  - `data/regulations/TBDY_2018.pdf` ✅ DOWNLOADED (7.1 MB, from AFAD)
  - `data/regulations/TS_500.pdf` ⏳ TODO (TSE paywall risk — fallback: academic summaries, İMO ders notları)
- **Rebar dataset sources (open):**
  - Roboflow Universe `isupervision/rebar-counting` (250 images + pretrained model)
  - Roboflow Universe `Mohxfas/rebar-counting-e01uk` v15 (238 images)
  - Roboflow Universe `hof/rebar` (250 images)
  - Roboflow Universe `robobond/rebar-segment-ysgc1-ogrpj` (100 images, spacing/intersection focus)
- **Sample projects:** TODO — find 3-4 real Turkish reinforced-concrete structural drawing PDFs (academic course material, open project portfolios)
- **Kahramanmaraş open data:** TODO — AFAD post-earthquake damage reports for demo-video narrative

## Timeline (16 days — April 18 → May 3, 2026)

| Day | Date | Milestone | Status |
|-----|------|-----------|--------|
| 1-2 | Apr 18-19 | Setup: folders, CLAUDE.md, repo init, downloads, API keys, Kimi-VL smoke-test | 🔄 IN PROGRESS |
| 3-4 | Apr 20-21 | PlanParserAgent (Phase 1) — PDF → structured JSON on 3-4 real drawings | |
| 5-6 | Apr 22-23 | GeometryAgent + Kimi-VL rebar detection pipeline; build/source 10-15 site photos | |
| 7-8 | Apr 24-25 | CodeAgent (TBDY/TS500 RAG), FraudAgent, RiskAgent as Hermes skills | |
| 9-10 | Apr 26-27 | MaterialAgent, CoverAgent, Moderator + debate orchestration + scoring | |
| 11-12 | Apr 28-29 | Frontend: upload, dashboard, agent-debate live feed (SSE) | |
| 13 | Apr 30 | Three.js 3D overlay viewer | |
| 14 | May 1 | Demo data curation (happy path + fraud case + Kahramanmaraş narrative), end-to-end polish | |
| 15 | May 2 | 3-min demo video shoot + edit + writeup | |
| 16 | May 3 | Buffer + submission (Discord + Twitter @NousResearch tag) | |

## Current state (update every session)

- **Last updated:** 2026-04-18 (Day 1, session 1)
- **Current day:** 1 of 16
- **Active task:** Initial scaffold + documentation
- **Completed:**
  - Folder structure created
  - TBDY 2018 PDF downloaded
  - CLAUDE.md + plan.md drafted
- **Blocked/waiting on user:**
  - Nous Portal API key (user said $10 free tier available — key needed in `.env.local`)
  - Moonshot/Kimi API key (`platform.moonshot.ai`)
  - Supabase project URL + anon key (or defer until needed)
  - GitHub repo creation decision (suggested: `github.com/Himess/rebarguard`)

## Environment setup (for future Claude / future me)

### Prerequisites
- Python 3.11+ with `uv`
- Node.js 20+ with pnpm or npm
- Git

### Install
```bash
# Backend
cd backend
uv sync

# Frontend
cd frontend
pnpm install

# Hermes Agent framework
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### Env vars (create `backend/.env`)
```
NOUS_PORTAL_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AFAD_API_BASE=https://tdth.afad.gov.tr
```

### Run (dev)
```bash
# Backend
cd backend && uvicorn rebarguard.main:app --reload --port 8000

# Frontend
cd frontend && pnpm dev
```

## Rules / non-negotiables

- **No Claude AI / Co-Authored-By in commits or PRs.** User's standing preference.
- **Turkish-language UI** (müteahhit / belediye audience). English comments in code OK.
- **Hermes must be visibly center-stage** in the demo video — we're in their hackathon.
- **Kimi usage must be provable** in the demo video for Kimi-track eligibility (show model name in logs / on screen).
- **No mocks in final demo** — real API calls, real Hermes 4, real Kimi-VL. Happy path + fraud case must both run live.
- **Time is the scarcest resource.** Scope creep = death. If a feature isn't in the timeline table, don't build it.

## Open questions (track here, close as decided)

- [ ] GitHub repo name final: `rebarguard` or something Turkish (`donatibekci`, `demirdenetci`)?
- [ ] Demo video hosting: raw Twitter/X upload or YouTube link?
- [ ] Deploy destination for demo: self-hosted backend or Modal/Fly.io?
- [ ] TS 500 source — paid TSE version vs. open academic summary?
- [ ] Name for demo building/project in walkthrough?

## Research findings (reference)

### Hermes Agent framework
- Python (87.5%), TypeScript (8.2%). MIT. ~98.2K ⭐
- Model-agnostic; `hermes model` switches providers
- 40+ built-in tools, delegates/parallelizes isolated subagents
- FTS5 session search + agent-curated memory
- Compatible with `agentskills.io` open standard
- Install via `curl ... install.sh | bash`

### Hermes 4
- **70B** (Llama-3.1-70B base, hybrid-mode reasoning) — our default via Nous Portal
- **35B A3B** (MoE, 3B active, 128K context, runs on RTX 4090 Q4KM)
- Training: ~5M samples / ~60B tokens, mostly agentic traces, 40+ tools
- VLLM built-in tool parser `hermes`; SGLang `qwen25`

### Kimi-VL + Kimi K2.5
- **Kimi-VL-A3B-Instruct:** MoE, 2.8B active, 128K context, MoonViT native-res encoder
- Strong OCR: InfoVQA 83.2, ScreenSpot-Pro 34.5
- **Kimi K2.5** (Jan 2026): adds video + Agent Swarm (100 parallel agents)
- API: `platform.moonshot.ai`, OpenAI/Anthropic-compatible
- Pricing: $0.60/M input, $2.50/M output

---

**For the next Claude picking this up:** read this file top-to-bottom, then `plan.md` for day-by-day execution detail, then scan `docs/` for any architecture deep-dives. After that, check git log + last commit to see what was shipped. Start with "Current state" section's Active task.
