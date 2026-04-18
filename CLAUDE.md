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
| Orchestrator framework | **Hermes Agent** (Python, Nous Research) | Multi-agent native, model-agnostic, skill system, memory; install `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash` |
| Agentic + Vision model | **Kimi K2.5** (`moonshotai/kimi-k2.5`) via **Nous Portal** | **$0 / 1M tokens on Nous Portal free tier.** Vision-capable (K2.5 adds image+video). Covers BOTH Main and Kimi tracks. Nous Portal explicitly recommends agentic models (Kimi K2.5 / GPT-5.4 / GLM 5 / Claude) over Hermes 4 for Hermes Agent |
| Reasoning fallback | **Hermes-4-70B** via Nous Portal ($0.05 in / $0.20 out per 1M) | Dedicated reasoning when Kimi K2.5 orchestration needs a hybrid-thinking boost |
| Vision fallback | **Kimi K2.5** direct via Moonshot API | If Nous Portal multimodal proves unreliable — set `VISION_BACKEND=moonshot` |
| Backend | **FastAPI** (Python 3.11+) | Async-first, SSE streaming |
| Frontend | **Next.js 16** (App Router, React 19) | Modern, Vercel deploy |
| 3D viewer | **Three.js** + react-three-fiber | Rebar schematic vs. site-photo overlay |
| Styling | **Tailwind CSS v4** | |
| Motion | **Motion** | Agent debate animations |
| Database | **Supabase** (Postgres + Storage) | Project files, photos, audit history |
| Auth | Supabase Auth, roles: Contractor / Municipality / Engineer | |
| Regulations RAG | **pgvector** on Supabase | TBDY 2018 + TS 500 chunks |
| Deploy | Vercel (frontend) + Modal or Fly.io (backend) | |

### Why NOT Hermes 4 as primary model
Nous Portal's own UI warns: *"Hermes 4 models are not recommended for use in Hermes Agent. Use an agentic model from the list above."* Hermes 4 is a frontier reasoning model; the Hermes Agent framework is tuned for tool-calling agentic models (Kimi K2.5, GPT-5.4, GLM 5, Claude). We follow the sanctioned path.

## User decisions (recorded verbatim)

- Target: hackathon 1st place. "Won't finish in time" is not an acceptable answer.
- Nous Portal subscription acquired by user (free tier available). **Kimi K2.5 via Nous Portal is $0/1M — use as primary model for both agentic orchestration and vision.**
- Kahramanmaraş framing belongs in the demo video intro only, NOT as a core feature.
- Rebar dataset: open-source (Roboflow Universe) + Kahramanmaraş open data + user-supplied photos.
- TBDY 2018 + TS 500: downloaded by Claude (TBDY done, TS 500 deferred to academic fallback).
- Tech stack (Next.js 16 + FastAPI + Supabase + Three.js) approved.
- **7 agents** + Moderator (not 4).
- Claude works continuously, 2-3 days of progress per session.
- **No Claude AI / Co-Authored-By references in commits/PRs** (global user preference).
- User is Turkish-speaking; **project code/UI/docs are English**. Claude replies to user in Turkish in conversation.

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

## The 7 agents (with model attribution)

| # | Agent | Phase | Model | Role |
|---|-------|-------|-------|------|
| 1 | **PlanParserAgent** | 1 | `moonshotai/kimi-k2.5` | Reads approved PDF drawing → structured column schedule JSON |
| 2 | **GeometryAgent** | 2 | deterministic (no LLM) | Plan vs. site detection diff (count, spacing, diameter, stirrups) |
| 3 | **CodeAgent** | 2 | rule engine + **Hermes 4 70B** narrative | TBDY 2018 / TS 500 compliance (Day 7 adds RAG). Hermes 4 generates the violation-narrative when there are failures |
| 4 | **FraudAgent** | 2 | deterministic | EXIF timestamp, geolocation, reference marker, hash-dup |
| 5 | **RiskAgent** | 2 | deterministic (AFAD table) | Zone × soil × floors → risk multiplier |
| 6 | **MaterialAgent** | 2 | `moonshotai/kimi-k2.5` | Rebar class (S420, B500C), corrosion, surface condition from close-up |
| 7 | **CoverAgent** | 2 | `moonshotai/kimi-k2.5` | Concrete cover (paspayı) estimation from site photo with reference marker |
| — | **ModeratorAgent** | post | **Hermes 4 70B** | Synthesizes 6 reports → final verdict (approve/conditional/reject) + score + narrative |

**Why Hermes 4 70B on Moderator + CodeAgent narrative:** these are deep-reasoning, single-shot synthesis tasks — the `hybrid-thinking` strength of Hermes 4. Kimi K2.5 is the agentic (tool-calling) model, Hermes 4 is the reasoner. Both visible on screen = triple Nous showcase (Hermes Agent framework + Hermes 4 model + Nous Portal provider) + Kimi K2.5 for Kimi track.

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

- **Last updated:** 2026-04-18 (Day 1 complete + Day 2 AM research spike complete)
- **Current day:** 2 of 16
- **Active task:** Day 2 PM — awaiting user to run `hermes login --provider nous` (OAuth), then refactor runtime to cli mode

### Day 2 AM findings (Hermes Agent v0.10.0 on WSL2)

- Install succeeded: `/root/.local/bin/hermes`, project at `/root/.hermes/hermes-agent/`
- **Key CLI surface discovered:**
  - `hermes chat -q "<prompt>" -m <model> -Q --provider nous` — non-interactive one-shot (our main driver)
  - `--image <path>` — **NATIVE VISION SUPPORT** (single image per query, path is host-local)
  - `-s <skill-names>` — preload SKILL.md skills from `~/.hermes/skills/<category>/<name>/`
  - `--provider nous` — route through Nous Portal subscription (covered by $10/mo plan)
  - `-Q` = quiet, only final response to stdout
  - `--source tool` — tag for programmatic callers (keep out of user session list)
- **Providers supported:** auto, openrouter, **nous**, openai-codex, copilot-acp, copilot, anthropic, gemini, xai, ollama-cloud, huggingface, zai, kimi-coding, kimi-coding-cn, minimax, minimax-cn, kilocode, xiaomi, arcee, nvidia
- **76 bundled skills** already installed (codebase-inspection, manim-video, github-pr-workflow, systematic-debugging, etc.)
- **Skills are Markdown, not Python.** `SKILL.md` = YAML frontmatter + Markdown body with instructions. Our 3 LLM-driven agents (PlanParser, InspectRebar, Moderator) become SKILL.md files at `skills/rebarguard/<name>/SKILL.md`. Deterministic agents (Geometry, Fraud, Risk, Material rules) stay as Python.
- **MCP server mode available** via `hermes mcp serve` — deferred to Day 10+ if useful for streaming debate UX
- **ACP mode available** via `hermes acp` — for editor integration, not relevant to our web app
- **Vision spike RESULT: pending user login.** Multimodal call shape is known (`--image`), but we can't verify it works until `hermes login --provider nous` succeeds.

### What changed in Day 2 AM

- `backend/src/rebarguard/hermes_runtime/bridge.py` — rewrote using real CLI: `hermes chat -q ... --image ... -m ... -Q --provider nous`. Handles Windows→WSL path translation (`C:\...` → `/mnt/c/...`).
- Removed obsolete `hermes_oneshot.py` helper (was based on guessed Python SDK).
- `scripts/setup-hermes.sh` — now invokes `hermes login --provider nous` (OAuth device flow — prints URL + code, user opens in browser, approves).
- `scripts/test-hermes-vision.sh` — rewritten to use `hermes chat --image` for smoke test.
- `skills/rebarguard/{parse-structural-plan, inspect-rebar, moderate-inspection}/SKILL.md` — new custom skills in agentskills.io format.
- `skills/README.md` — install/layout docs.

### Blocked / waiting on user

- **Run `hermes login --provider nous`** — interactive OAuth device flow. OAuth prints a URL and a code; open URL in Windows browser, paste the code, approve. One-shot — token stored at `/root/.hermes/`.
- Easiest way: from Windows `cmd`/PowerShell, run `scripts/setup-hermes.cmd` (invokes WSL). Or from a WSL shell: `bash /mnt/c/Users/USER/Desktop/RebarGuard/scripts/setup-hermes.sh`.
- After login: Claude will run `scripts/test-hermes-vision.sh` (needs a sample JPG at `data/rebar_photos/smoke-test.jpg`) and flip `HERMES_RUNTIME=cli` once verified.

### Completed in Day 1

- Folder structure created
- TBDY 2018 PDF downloaded (7.1 MB, from AFAD)
- CLAUDE.md + plan.md drafted
- Backend scaffold:
  - `pyproject.toml` with FastAPI/Pydantic/OpenAI SDK/pypdf/piexif/tenacity/sse-starlette/supabase/pgvector
  - `config.py` (pydantic-settings, loads `.env`)
  - `main.py` (FastAPI app, CORS, /health, routers)
  - `schemas/models.py` — all 15+ Pydantic models (ColumnSchema, RebarDetection, AgentMessage, InspectionScore, ModeratorReport, etc.)
  - `vision/kimi_client.py` — async Kimi-VL wrapper with retry
  - `vision/prompts.py` — PLAN_PARSE_PROMPT, REBAR_DETECT_PROMPT, MATERIAL_PROMPT, COVER_PROMPT
  - `hermes/client.py` — Hermes 4 70B via Nous Portal (OpenAI-compat)
  - `agents/`: base + plan_parser + geometry + code_compliance + fraud + risk + material + cover + moderator (ALL 7 + Moderator implemented)
  - `services/inspection.py` — InspectionOrchestrator, async agent debate generator
  - `routers/projects.py` + `routers/inspections.py` (SSE streaming)
  - `tests/test_schemas.py` + `tests/test_geometry_agent.py`
- Frontend scaffold (Next.js 16 + Tailwind v4):
  - `package.json`, `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`
  - `app/layout.tsx`, `app/globals.css` (dark theme + CSS vars)
  - `app/page.tsx` — Turkish landing page with pitch
  - `app/upload/page.tsx` — PDF upload flow
  - `app/dashboard/page.tsx` — belediye panel (server component, force-dynamic)
  - `app/inspection/new/page.tsx` — 3-pane: form | live debate | score + 3D
  - `components/AgentDebateFeed.tsx` — motion-animated SSE feed w/ 8 agent avatars
  - `components/ScorePanel.tsx` — overall score + category bars + verdict badge
  - `components/ThreeOverlay.tsx` — Three.js column with rebar cylinders (green=OK, red glow=missing)
  - `lib/api.ts` — REST + SSE streaming client (AgentMessage type)
- `docs/ARCHITECTURE.md` — full system diagram + data flow
- `data/README.md` — dataset sources (Roboflow Universe links)
- `.gitignore`, `.env.example` (both backend and frontend)
- Git initialized, first commit: `71148a5 init: RebarGuard scaffold — backend agents + frontend shell + docs`

### Blocked / waiting on user

- **Nous Portal API key** — put in `backend/.env` as `NOUS_PORTAL_API_KEY=sk-...` (user has $10 free tier)
- **Moonshot API key** — get at https://platform.moonshot.ai, put in `backend/.env` as `MOONSHOT_API_KEY=sk-...`
- **Roboflow account** (optional) — if downloading the rebar datasets programmatically; else manual download
- **GitHub repo** — decide name (`rebarguard` vs Turkish alt) and create `github.com/Himess/<name>`, then `git remote add origin ...`
- **Poppler for Windows** — PlanParserAgent uses `pdf2image` which needs poppler. Install: https://github.com/oschwartz10612/poppler-windows/releases and add to PATH
- **Real Turkish betonarme project PDFs** (3-4) — user can provide, else I'll search academic / open portfolio

### Known TODOs to close in Day 2-10

- `pdf2image` import is lazy in `plan_parser.py` — needs poppler on host
- RAG is stubbed in `CodeAgent` — deterministic rule engine runs + Hermes 4 70B narrative; pgvector RAG hooked Day 7
- AFAD in `RiskAgent` is hardcoded for demo — replace with live API Day 8 if accessible
- Supabase persistence not wired — in-memory `_STORE` dict in `routers/projects.py` — Day 11
- Hermes Agent framework CLI not yet wrapped — current implementation uses bare `HermesClient` talking to Nous Portal directly. Day 2 decision: either adopt full framework (install via `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`) or keep bare client. Bare is simpler for SSE streaming; framework helps if we want skills/memory surfaced in UI and gives stronger hackathon alignment

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

# Hermes Agent framework (official installer)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup
hermes model  # select moonshotai/kimi-k2.5 (free)
```

### Env vars (create `backend/.env`)
```
NOUS_PORTAL_API_KEY=sk-...
HERMES_AGENTIC_MODEL=moonshotai/kimi-k2.5      # $0 on Nous Portal
HERMES_REASONING_MODEL=Hermes-4-70B            # optional, $0.05/$0.20

# Optional direct Moonshot fallback
VISION_BACKEND=nous_portal                     # or "moonshot"
MOONSHOT_API_KEY=                              # only if VISION_BACKEND=moonshot

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
- **English UI and code.** Docs too. Domain terms may keep Turkish names (TBDY 2018, TS 500 — these are proper-noun regulations) but explained in English.
- **Hermes Agent must be visibly center-stage** in the demo video — we're in their hackathon. Show the `hermes` CLI, model picker, or Hermes Agent branding on screen.
- **Kimi K2.5 usage must be provable** in the demo video for Kimi-track eligibility (show model name `moonshotai/kimi-k2.5` in logs / on screen).
- **No mocks in final demo** — real Nous Portal calls, real Kimi K2.5, real debate. Happy path + fraud case must both run live.
- **Time is the scarcest resource.** Scope creep = death. If a feature isn't in the timeline table, don't build it.
- **Billing model: Path B — Hermes Agent framework via subscription.** The Nous Portal subscription ($10/mo Nous Chat + Hermes Agent plan) covers model calls made BY the Hermes Agent CLI/runtime. Direct API access is a separate pay-per-token tier and is AVOIDED. All LLM work routes through `hermes` (subprocess or Python SDK). Verified vs. unverified in Day 2 morning research spike. Best case: $0 total spend. Worst case: ~$5 Moonshot direct if framework lacks multimodal via subscription — vision-only fallback.

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
