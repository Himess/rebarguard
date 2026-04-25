# CLAUDE.md — RebarGuard Project Handoff

> **Purpose of this file:** If this session closes, the next Claude session reads this file FIRST and picks up without losing context. All decisions, architecture, tools, progress, and next steps live here. Keep it updated.

---

## ⚡ IF YOU'RE A NEW CLAUDE SESSION, START HERE

**Snapshot (2026-04-21 evening):** Days 1–15 of 16 shipped. Audit (`AUDIT.md`)
P0+P1+P2 all applied. Fly backend LIVE with Hermes OAuth saved on volume. Vercel
env swapped to Fly URL. 12 days to deadline (2026-05-03 EOD). Only remaining
critical path: **demo video shoot + Twitter/Discord submit**.

**Exact next three actions in order:**

1. **Fly.io backend launch** (~15 min, interactive):
   ```bash
   cd C:/Users/USER/Desktop/RebarGuard/backend
   fly launch --no-deploy --copy-config
   fly volumes create hermes_data --size 1 --region fra
   fly secrets set APP_CORS_ORIGINS=https://rebarguard.vercel.app
   fly deploy
   fly ssh console
     # inside: hermes auth add nous --type oauth --no-browser
     # open the printed URL on laptop, approve, exit
   curl https://rebarguard-api.fly.dev/health
   ```
2. **Swap Vercel env var** `NEXT_PUBLIC_BACKEND_URL` → `https://rebarguard-api.fly.dev`
   (Vercel dashboard → Settings → Env Vars → edit all three scopes → redeploy).
3. **Record 3-min demo video** (see script outline below) → tweet tagging
   `@NousResearch` + post in Nous Discord `#creative-hackathon-submissions`.

Full deploy commands: see `DEPLOY.md`. Outstanding tasks: #40 (Fly), #41 (video),
#42 (submit).

**User is Turkish-speaking. Reply in Turkish.** Project code/UI/docs are English.
Never add "Claude AI / Co-Authored-By" to commits. Every commit should be
GPG-signed (global config already set: `user.email=semihcvlk53@gmail.com`,
`commit.gpgsign=true`, `user.signingkey=4F75A83557AF759B`) — if a commit lands
unsigned or with the wrong email, we redo the `filter-branch` pass from Day 14.5.

Parked second-project idea (football VAR agents) — see the "Parked ideas"
subsection below. Do NOT start it until RebarGuard is shipped.

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

- **Last updated:** 2026-04-21 (Days 1–14.5 complete, user on pause, Fly deploy is next
  active task, user floated a second-project idea on 2026-04-21 — see below).
- **Current day:** 15 of 16 (12 days remain until 2026-05-03 EOD deadline).
- **Active task:** Demo video shoot (Task #41) → Twitter + Discord submit (Task #42).
- **Production URLs:**
  - Frontend: **https://rebarguard.vercel.app** (prod, fra1, auto-deploys on push
    to `main`). Env var `NEXT_PUBLIC_BACKEND_URL=https://rebarguard-api.fly.dev`.
  - Backend: **https://rebarguard-api.fly.dev** (Fly.io fra, 1 CPU / 1 GB,
    auto-suspend, `hermes_data` volume mounted at `/data`, OAuth token saved at
    `/data/hermes/auth.json` — survives redeploys).
  - GitHub: **https://github.com/Himess/rebarguard** (public, 38 commits,
    **100% GPG-verified**).
- **Live E2E verified (2026-04-21 17:32 UTC):**
  - `GET /health` → `{"status":"ok","hermes_runtime":"cli","vision_backend":"nous_portal","agentic_model":"moonshotai/kimi-k2.5","reasoning_model":"Hermes-4-70B"}`
  - `POST /api/demo/fistik` seeds 1340 Ada 43 Parsel.
  - `GET /api/regulations` returns 10 KB of curated articles.
  - `hermes chat -m moonshotai/kimi-k2.5 --provider nous` on Fly returned a valid
    JSON response → subscription path is green, no direct-API charges.
  - CORS from `https://rebarguard.vercel.app` echoes back correctly.
- **Runtime state right now (2026-04-21):**
  - WSL uvicorn: **stopped** (user asked to kill it because idle; restart with
    `wsl -d Ubuntu-22.04 -- bash -c "cd /mnt/c/Users/USER/Desktop/RebarGuard/backend && uv run uvicorn rebarguard.main:app --reload --host 0.0.0.0 --port 8000"`)
  - Next.js dev: **not running** (restart with `cd frontend && pnpm dev`)
  - Vercel prod: live (cloud-side, no local cost)

### Parked ideas / decisions to resume

**Second submission: Football VAR / match analysis (floated 2026-04-21, NOT STARTED)**

User proposed a second hackathon project idea on 2026-04-21:
- Feed a controversial match clip → Hermes + Kimi agents debate like VAR
  (offside / handball / foul specialists), or score a 90-min match 0–10 across
  categories (pass accuracy, distance covered, 1v1 won, aerial duels, missed calls).
- Rationale from user: "ikinci proje gibi çalışabilirim" — additional submission, not
  replacement.

My recommendation to user (on the record):
- **Idea is strong** for the hackathon's "creative domains: video, image, audio, 3D"
  framing. Better creative-axis fit than RebarGuard's civic-engineering angle.
- **DO NOT replace RebarGuard.** Ship it first (Fly deploy → video → submit) — it's 95%
  done, guaranteed to land.
- **Only add football as a 2nd submission if Fly deploy + video are locked by ~Apr 29.**
  Nous hackathon likely permits multiple submissions (need to confirm in Discord).
- **Scope narrow if pursued:** single 10–15 s controversial clip → 4–5 agents (offside /
  foul / handball / play direction + moderator-referee). Ground in IFAB "Laws of the
  Game" PDF as RAG (free, public) — TBDY analog. Kimi K2.5 Jan 2026 added video so
  technically feasible; watch subscription rate limits on heavy video tokens.
- **DO NOT attempt 90-min match analysis** — 5400 s × 25 fps = frame volume kills
  latency + subscription quota. Start with the single-play VAR framing.
- **Footage rights:** amateur clip user shoots + eFootball/FIFA screencap is safe;
  Süper Lig / UEFA broadcast footage is takedown risk.

If the user comes back and greenlights the football project, the scaffold plan is:
1. New repo `github.com/Himess/varagent` (or sub-directory of this repo? — ask user)
2. Reuse `backend/src/rebarguard/hermes_runtime/bridge.py` — proven, copy-paste ready
3. RAG: scrape IFAB "Laws of the Game" into the same `Article` dataclass shape we
   already have in `backend/src/rebarguard/rag/regulations.py`
4. Frontend: fork the `/quick` page pattern — replace image dropzone with video dropzone,
   replace SVG bbox callouts with temporal-marker overlay (play the clip with agent
   utterances timestamped).

**Expected prize math (if both submitted):**
- RebarGuard: Kimi Track 1st ($3.5K) + Main 3rd ($1.5K) realistic, Main 1st ($10K)
  stretch.
- Football VAR: Main 1st ($10K) realistic stretch (video-domain fit), Kimi eligible too.
- Two submissions = two seats at both tables. Pursue only if RebarGuard ships clean.

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

### Day 2 PM — Hermes Agent CLI wired end-to-end (SUBSCRIPTION CONFIRMED WORKING)

- **OAuth login succeeded.** `hermes auth add nous --type oauth --no-browser` printed the device-code URL; user approved in browser; token stored at `/root/.hermes/`. Subscription plan label: **Basic** (that's Nous's name for the $10/mo tier).
- **Text smoke test: PASS.** `hermes chat -q ... -m moonshotai/kimi-k2.5 --provider nous -Q` returned valid JSON `{"hello": "world", "model": "kimi-k2.5"}` at $0 cost.
- **Vision smoke test: PASS.** `--image` flag works with subscription. Synthetic 800×800 test JPG (6 vertical + 3 horizontal lines) → Kimi returned `{"count": 9, "confidence": 1.0}`. Max-turns=3 (1 was too low when Kimi internally dispatched its vision-tool).
- **`HermesClient` and `KimiVisionClient` refactored** to branch on `HERMES_RUNTIME`:
  - `cli` (new default): calls route through `HermesCLIBridge` → WSL `hermes chat` → subscription
  - `direct`: legacy OpenAI-compat path, still functional if user ever pays for direct API
- **Default `.env` switched to `HERMES_RUNTIME=cli`.** Zero code changes required in our 7 agents — they still call `HermesClient.complete` / `KimiVisionClient.analyze_image` and transparently hit subscription now.

### Path B is validated — $0 target achievable

- Kimi K2.5 (vision + agentic): FREE via subscription
- Hermes 4 70B (Moderator, CodeAgent narrative): subscription includes this too (subscription covers all `--provider nous` traffic)
- **Worst case**: if subscription has a hidden rate limit we hit during stress testing, fall back to `VISION_BACKEND=moonshot` (~$5 direct) — not expected

### Day 2 FINAL — backend live in WSL, end-to-end green

- **Backend install:** `scripts/_setup-backend.sh` ran cleanly in WSL: Python 3.10 + `uv 0.11.7` + `uv sync` (all deps), `.env` auto-created with `HERMES_RUNTIME=cli HERMES_CLI_VIA_WSL=false`.
- **Uvicorn:** `uv run uvicorn rebarguard.main:app --host 0.0.0.0 --port 8000` serves from WSL, reachable from Windows at `http://localhost:8000`.
- **`/health`:** `{"status":"ok","service":"rebarguard","version":"0.1.0"}`.
- **`/api/projects`:** `[]` (empty store, correct).
- **E2E bridge test (`backend/tests/e2e_hermes_bridge.py`):** PASS.
  - Text: `HermesClient.json_complete` → bridge → `hermes chat` → `{"ok": true, "where": "hermes-cli"}`
  - Vision: `KimiVisionClient.analyze_image` on the 800×800 synthetic JPG → `{"count": 6}` (matches the 6 vertical rebars exactly — prompt engineering works).

### How to run now (WSL shell, project root)

```bash
# One-time setup
bash scripts/_setup-backend.sh

# Run backend (foreground)
cd backend && uv run uvicorn rebarguard.main:app --reload --host 0.0.0.0 --port 8000

# Test
curl http://localhost:8000/health
uv run python tests/e2e_hermes_bridge.py
```

### Day 3 — DONE (major scope expansion + full pipeline live)

User decisions absorbed into scope:
- Auto-extract metadata (city/soil/floors) from the project PDF — no manual entry
- Analyze ALL structural elements, not just columns (beams, slabs, shear walls, stairs)
- 3D preview on upload (professional CAD-like) — Kimi extracts, we render in Three.js
- Public dashboard — anyone uploads, everyone sees. Auth deferred to Day 11 TODO
- Mobile-responsive everywhere
- Deploy target: Vercel frontend + Modal/Fly.io backend (Day 16)

What shipped Day 3:
- `StructuralPlan` schema rewritten with `ProjectMetadata` + 5 element types
- `PLAN_PARSE_PROMPT` + `parse-structural-plan/SKILL.md` updated for multi-element
- Agents migrated to generic `StructuralElement` (via `_element_utils`)
- `InspectionJob` no longer asks user for city/soil/floors — pulled from plan metadata
- poppler-utils installed, `pdf2image` added to deps
- Frontend: `pnpm install` done, Next.js 16 dev server live at `http://localhost:3000`
- R3F upgraded to v9 + drei v10 for React 19 compatibility
- Dashboard restyled as public board with metadata + element counts
- `/inspection/new` now dropdown covers all element types + reads metadata as badges
- Mobile-responsive via `overflow-x-auto`, stacked panes on small screens
- `routers/projects.py` fixed for new schema path

Validation:
- `pytest`: 6/6 pass
- `pnpm typecheck`: clean
- `curl GET /health` → 200, `curl localhost:3000` → full HTML
- `POST /api/projects` with a 3-page TBDY 2018 sample:
  - Kimi K2.5 reads Turkish technical content correctly
  - Correctly identifies "not a construction drawing", returns empty element lists
  - Confidence 0.99, cost $0 via subscription

### Day 4 — DONE (E2E green, real data validated)

- Full 7-agent debate ran via `POST /api/inspections/stream` against `fistik-01.jpg` and the
  seeded 1340 Ada 43 Parsel project. Moderator (Hermes 4 70B) synthesized a REJECT verdict
  with narrative + critical issues + recommendations. Every message carries a model tag in
  its `evidence`: `moonshotai/kimi-k2.5` for vision, `Hermes-4-70B` for the verdict.
- `POST /api/demo/fistik` seeds a realistic plan in memory (engineer, parcel, 6+2 floors,
  B420C / BS30, 6 columns × 8 floors + 2 shear walls + 6 beams) matching Kimi's metadata
  extraction from `1340.pdf`. Remove before production.
- `FullBuildingViewer` merges column segments by base id (48 stacked boxes → 6 tall
  pillars), adds exterior-wall infill between perimeter columns so the model reads as an
  enclosed volume, slabs bumped to opacity 0.45 for visibility. Basic material + no shadows
  for performance.
- `BuildingPane` toggle: "Inspected element" ↔ "Full building". Default is element mode
  so the first-paint is cheap.

### Days 5–14 shipped summary (all executed in the 2026-04-19 / 04-20 push)

Because the hackathon-budget burn rate was faster than originally planned, Days 5–14 all
landed in a ~36-hour compressed session. Each day below is a real commit on `main` — see
`git log` for exact SHAs and diffs.

**Day 5 — GitHub + Claude Design adoption + 60% 3D hero layout**
- Public repo created: `github.com/Himess/rebarguard`, first push.
- Claude Design slides (01 landing / 02 quick / 03 building-3d) ported pixel-perfect.
- `app/globals.css` rewritten with OKLCH palette from Claude Design tokens
  (`--hazard #FF6A1F`, `--amber`, `--blue`, `--agent-1..9`, `--bg-0..4`, `--text-0..3`,
  `--line-1..3`). IBM Plex Sans + Mono wired via `next/font/google`. `.btn/.chip/.panel/
  .bp-grid/.hatch` utility classes + `fadeIn/slamDown/bp` keyframes.
- `/inspection/new` refactored to the 60% 3D hero layout (320 px left rail → 3D centre
  → debate + score split bottom). Old 3-pane layout retired.

**Day 6 — Photo annotation overlay (Kimi bbox → SVG)**
- `QUICK_SCAN_PROMPT_TEMPLATE` asks Kimi for up to 6 findings with normalized bbox
  `{x, y, w, h}` in `[0, 1]`, severity (`fail|warn|info`), detail, ref, confidence.
- `/quick` route: drop image → `POST /api/quick/analyze` → live SVG circle callouts
  rendered via `bboxToCircle()`. Click a circle → side-panel detail with `ConfidenceChip`
  and clickable REF badge.
- Fallback `DEMO_FALLBACK` kicks in if backend offline (offline-friendly demo).

**Day 7 — Stage-by-stage workflow**
- `InspectionStage` enum added: `foundation | ground_floor | mid_floor | roof | other`.
- `InspectionJob` / `/api/inspections/stream` / `InspectionRequest` accept `stage` param.
- UI stage dropdown in `/inspection/new` left rail drives both the SSE stream param AND
  the 3D highlight (via `stageToFloorIndex()`).

**Day 8 — Belediye Agent (9th) + 2-step approval path**
- New `agents/municipality.py` — Hermes 4 70B reviewer that re-verifies the Moderator
  verdict as an independent municipal check. Hard safety rail: it **can never uphold** a
  `REJECT` verdict (forced to `escalate_to_human` in that branch).
- `AgentRole.MUNICIPALITY` added; orchestrator emits a 9th SSE bubble after Moderator.
- Two-step gate: 7 agents → Moderator synthesis → Belediye counter-review → (manual
  engineer signature step wired in UI, actual auth deferred).

**Day 9 — Curated TBDY 2018 + TS 500 RAG + confidence + clickable REF**
- `backend/src/rebarguard/rag/regulations.py` — 16 curated `Article` dataclass entries
  (code, document, chapter, EN+TR title/text, source, tags). TBDY articles marked
  `source="document"` (grounded in AFAD PDF); TS 500 entries marked `source="summary"`
  (TSE paywall — academic summaries, flagged "NOT OFFICIAL TEXT" in UI).
- `GET /api/regulations` (list) + `GET /api/regulations/{code:path}` (by code).
- `QUICK_SCAN_PROMPT` now injects a **citation whitelist** — Kimi can **only** cite codes
  in `REGULATIONS`, and `_validate_ref()` silently drops hallucinated refs.
- `QuickFinding.confidence: float` added.
- Frontend `ArticleModal` — click a REF badge → modal with EN/TR toggle, "SUMMARY · NOT
  OFFICIAL TEXT" warning for TS 500, tags row.

**Day 12 — Frontend polish**
- `VerdictCinema` — full-screen modal on Moderator verdict arrival. Score counts up
  0→overall over 1600 ms, critical issues fade in every 260 ms, Belediye recommendation
  badge.
- `/styleguide` — design system spec page documenting the OKLCH palette, typography,
  components, motion.
- Stage-driven 3D highlight: the building viewer reacts to the left-rail stage dropdown
  (floor index maps via `stageToFloorIndex`).

**Day 13 — Demo scenarios page + dashboard seed button**
- `/demo` — 3 scenario cards (happy / conditional / reject) with `PatternSvg`
  schematics (mat / column-cage / wall), expected verdicts, Kimi-anticipated findings
  teaser, and a "Seed Fıstık into Dashboard" button that `POST /api/demo/fistik`s.
- Fine-print stat row: `1340 ADA 43 PARSEL · BS30 466.75 m³ · B420C 58 514 kg · 2 280 m²`.
- `components/SeedFistikButton.tsx` — client wrapper so the same seed action is
  reachable from the `/dashboard` header (alongside Demo / Quick scan / Upload).
- `TopNav` reorders to Home / Projects / Inspections / Quick / Demo / Agents.

**Day 14 — Vercel deploy + Fly.io deploy scaffolding**
- `frontend/vercel.json` — framework pin to Next.js, fra1 region, install/build via
  `pnpm`, basic security headers.
- Fixed a static-prerender crash: `/inspection/new`'s `useSearchParams()` is now wrapped
  in a `<Suspense fallback={null}>` (split into outer `NewInspectionPage` + inner
  `NewInspection`) — Next 16 Turbopack refuses to prerender client pages that read
  search params without a boundary.
- `vercel link` + `vercel --prod --yes` green. **`https://rebarguard.vercel.app` live.**
- `backend/Dockerfile` — `python:3.11-slim` + `uv` + `poppler-utils` + Hermes Agent CLI
  (`curl install.sh | bash`). Entrypoint shim symlinks `/root/.hermes → /data/hermes`
  so the OAuth token persists on the mounted Fly volume across deploys.
- `backend/fly.toml` — `rebarguard-api` app, 1 CPU / 1 GB, fra region, auto-suspend,
  `hermes_data` volume mount, `/health` HTTP check, cors via secret.
- `DEPLOY.md` — single-source deploy guide (Vercel + Fly + first-run OAuth flow +
  smoke tests). **Backend not yet launched — user runs `fly launch --no-deploy --copy-
  config`, `fly volumes create hermes_data ...`, `fly deploy`, then `fly ssh console`
  once to complete the Hermes OAuth device flow.**

**Day 15 — Fly backend launched + Hermes OAuth + Vercel swap (2026-04-21 evening)**
- `fly launch --copy-config --no-deploy --name rebarguard-api --region fra
  --org personal --yes` created the app. `fly volumes create hermes_data --size
  1 --region fra` provisioned the persistent volume. `fly secrets set
  APP_CORS_ORIGINS=https://rebarguard.vercel.app,https://rebarguard-ih0djvog4-himess-projects.vercel.app`
  locked CORS. `fly deploy --remote-only` built + deployed from the remote
  builder. Machine `d8d2369b2ddd08` runs in fra.
- **Three build-breakers hit and fixed in-flight:**
  1. `backend/pyproject.toml` had `readme = "../README.md"` which hatchling
     can't resolve inside the `backend/` Docker context. Dropped the field.
  2. Dockerfile heredoc writing `/entrypoint.sh` preserved CRLF from Windows
     autocrlf. Container booted into a reboot loop with `env: 'bash\r': No
     such file or directory`. Added `sed -i 's/\r$//'` before `chmod +x` and
     committed a `.gitattributes` pinning `*.sh`, `Dockerfile`, `fly.toml` to
     LF so this can't regress on the next Windows clone.
  3. Hermes Agent CLI install silently failed: `git` was missing from
     apt-get, and `|| true` masked the failure so `hermes` binary was never
     present. Also the installer's default `/root/.hermes` install path got
     shadowed at runtime by the entrypoint symlink to `/data/hermes`. Fix:
     install git, call installer with `--dir /opt/hermes-agent` so the
     binary lives outside the volume mount path, drop `|| true`, and assert
     `hermes --version` at build time so future install regressions fail
     loudly.
- **Hermes OAuth device flow on Fly:** `flyctl ssh console -a rebarguard-api
  -C "hermes auth add nous --type oauth --no-browser"` printed a portal URL
  + device code, user approved in browser, token saved to
  `/data/hermes/auth.json` (persistent on the Fly volume). First device
  code timed out after ~60 s; retried with a second code (`4GN6-HKFN`) and
  it worked.
- **Vercel env swap:** `vercel env rm NEXT_PUBLIC_BACKEND_URL production` +
  `vercel env add NEXT_PUBLIC_BACKEND_URL production` (new value
  `https://rebarguard-api.fly.dev`) + `vercel --prod --yes` redeploy. Prod
  site now talks to Fly.
- **Live E2E proof:**
  - `hermes chat -q "reply with the json {\"ok\": true}" -m moonshotai/kimi-k2.5
    --provider nous` run inside the Fly container returned `{"ok": true}` —
    subscription path is alive, no direct-API charges.
  - `POST /api/demo/fistik` on the live backend seeds the 1340 Ada 43
    Parsel project correctly.
  - `GET /api/regulations` returns 10 KB of curated articles.
  - CORS header from `https://rebarguard.vercel.app` origin is echoed
    correctly.
- Commits: `3b69202` (CRLF + pyproject), `cda0cd0` (fly.toml reformat),
  `d5428db` (Docker install path fix).

**Day 14.6 — Pre-submission audit + P0/P1/P2 fixes**
- `AUDIT.md` (303 lines) — full repo audit driven by four parallel Explore agents
  (backend / frontend / deploy+tests / docs+hackathon fit). Scores + prioritized
  actionable list.
- **P0 applied:** `LICENSE` file added (MIT — README now honest); `/agents` route
  built (9 agent cards + 6-step debate-flow chart, kills the TopNav dead link);
  README fully rewritten with live URL, badges, screenshots grid, run-locally
  block, repo map, and Turkish-context gloss; prominent `MODEL · moonshotai/kimi-k2.5`
  chip added to the `/quick` top bar (Kimi-track proof visible in <3 s of camera
  time).
- **P1 applied:** deleted three dead components (`ThreeOverlay`, `BuildingPane`,
  `FullBuildingViewer` — all superseded by `ClaudeBuildingViewer`), dropped three
  unused deps (`motion`, `lucide-react`, `clsx`), fixed `<img alt>` on `/quick`,
  made `ArticleModal` actually render its error state (with `role="alert"` +
  whitelist vs. offline hint), wrapped `ClaudeBuildingViewer` in `React.memo` +
  hand-written propsEqual so Three.js canvas no longer re-mounts per SSE message,
  added mobile media queries to `globals.css` (`.landing-hero` stacks <900 px),
  deduped `moderator._clip()`, removed stale `QUICK_SCAN_PROMPT` alias, and made
  `/health` report `hermes_runtime` + `vision_backend` + model tags.
- **P2 applied:** upload size limits (50 MB PDFs, 20 MB photos, max 12 per
  inspection) via 1 MB streaming reads; tempfile names use `uuid4().hex`, no more
  user-supplied filenames on disk; image suffix whitelist; `_STORE_LOCK`
  `asyncio.Lock` guards every mutation of the in-memory store from `projects` +
  `inspections` + `demo` routers; inspections router cleans up temp dir after SSE
  stream drains; Kimi `"error"`-shaped responses now degrade to empty findings
  instead of 500-ing.
- **Tests:** `backend/tests/test_rag_whitelist.py` (6 tests — articles grounded,
  cheatsheet injection, `_validate_ref` case/dash tolerant + drops hallucinations)
  and `backend/tests/test_routes_smoke.py` (10 tests — FastAPI TestClient covers
  `/health`, `/api/regulations`, `/api/projects`, `/api/demo/fistik`, `/api/quick`
  + `/api/inspections` 4xx paths). Total pytest: **6 → 21 green**.
- **CI:** `.github/workflows/ci.yml` runs ruff + pytest on the backend and
  typecheck + build on the frontend for every push + PR.
- **Verification:** `HERMES_RUNTIME=direct pytest -q` → 21/21 green,
  `pnpm typecheck` clean, `pnpm build` green (9 routes prerendered including
  `/agents`).
- Commit: `01cb4e9 chore(audit-fixes): apply P0+P1+P2 pre-submission audit findings`.

**Day 14.5 — GPG history rewrite (100% verified on GitHub)**
- 31 of 33 commits had been authored with a placeholder email (`noreply@example.com`) so
  GitHub marked them "Unverified" despite the GPG signature being valid. Two-pass fix:
  1. `git filter-branch --env-filter` to rewrite author + committer email to
     `semihcvlk53@gmail.com` across all 33 commits.
  2. `git filter-branch --commit-filter 'git commit-tree -S "$@"'` to re-sign every
     commit with GPG key `4F75A83557AF759B` in a single tree-only pass (no working-tree
     checkout — avoids merge conflicts the rebase approach hit).
- `git push --force-with-lease origin main` → GitHub API confirms all 33 commits
  `verification.verified=true, reason=valid`. Backup branch `backup-before-email-fix`
  retained locally in case of regret.
- Vercel picked up the force-push and redeployed automatically (same code, new SHAs).

---

### Day 5 — MAJOR scope expansion (user-directed, locked)

**User's vision shift after seeing the baseline working:**
1. Current inspection page is "too basic-looking." Redesign around a **60% 3D hero** with
   upload controls on the left and debate + score below.
2. Add a **quick photo-only analyzer** as a primary entry point — drop any construction
   photo, Kimi calls out problems per TBDY / TS 500 with bounding boxes and clickable
   detail callouts.
3. Add **stage-by-stage workflow**: foundation → basement → ground → 1..N → roof, each
   stage accepts its own photos, each kicks off the 7-agent debate automatically.
4. Add an **8th agent: Belediye Agent** that re-verifies the Moderator verdict as an
   independent municipal reviewer before the pour is authorized.
5. Two-step approval gate: agent consensus → belediye agent counter-review → manual
   municipal engineer click → "pour authorized."
6. DWG path: Kimi cannot read binary DWG directly. Free tools (libredwg, snap) are not in
   Ubuntu repos. User will run **Autodesk DWG TrueView** on Windows to plot the real DWG
   to PDF → our existing PlanParser pipeline reads it and seeds the real column schedule.

### New layout (inspection page target)

```
┌────────────────────────────────────────────────────────────────────┐
│ Nav                                                                │
├──────────────┬─────────────────────────────────────────────────────┤
│ UPLOAD 25%   │                                                     │
│ ─────        │       3D BUILDING VIEWER 60% (full height)          │
│ Project PDF  │       - 360° rotate, zoom, click element            │
│ Project DWG  │       - Toggle: Inspected / Full / (later: Section) │
│ Site photos  │                                                     │
│ Close-up     │                                                     │
│ Cover photo  │                                                     │
│ ─────        │                                                     │
│ Stage [▾]    │                                                     │
│ Element [▾]  │                                                     │
│ Metadata     │                                                     │
│ badges       │                                                     │
│ ─────        │                                                     │
│ [Start]      │                                                     │
├──────────────┴──────────────────────────┬──────────────────────────┤
│ AGENT DEBATE 60%                        │ SCORE + VERDICT 40%      │
│ SSE live feed, model badges, evidence   │ Ring + bars + narrative  │
└─────────────────────────────────────────┴──────────────────────────┘
Mobile stacks vertically.
```

### New features (Day 5-8)

| Feature | What | Deliverable |
|---------|------|-------------|
| Quick photo analyzer | Single-photo → 7 agents parallel without a project plan | `/quick` route + `POST /api/quick/analyze` |
| Photo annotations | Kimi returns bounding boxes per issue → SVG overlay on photo | `PhotoAnnotations` component + prompt update |
| Stage-by-stage | foundation / basement / ground / N / roof stage picker | `InspectionStage` enum, UI + backend param |
| Belediye Agent | 8th agent, re-reviews Moderator verdict as independent check | `agents/municipality.py` + bridge |
| 2-step approval | agent consensus → belediye counter → human click | New `ApprovalGate` state + route |
| 60% 3D hero layout | Redesign inspection page | Refactored `/inspection/new` |
| Photo annotation UI | Click circle → side panel detail | Hit testing + popover |
| Verdict cinema moment | Full-screen reveal when Moderator decides | `VerdictReveal` component |

### Updated 16-day timeline (2026-04-18 start → 2026-05-03 deadline)

| Day | Date | Milestone | Status |
|-----|------|-----------|--------|
| 1 | 04-18 | Scaffold + backend + frontend skeleton | ✅ |
| 2 | 04-18 | Hermes Agent install + subscription OAuth + bridge E2E | ✅ |
| 3 | 04-18 | Multi-element schema + auto-metadata + poppler | ✅ |
| 4 | 04-18 | Full-building viewer + Fıstık seed + E2E 7-agent debate green | ✅ |
| 5 | 04-19 | GitHub push + layout refactor (60% 3D hero) + Claude Design adoption | ✅ |
| 6 | 04-19 | Photo annotation overlay (Kimi bbox → SVG circles + click-detail) | ✅ |
| 7 | 04-19 | Stage-by-stage workflow (foundation → roof staged uploads) | ✅ |
| 8 | 04-19 | Belediye Agent (9th) + 2-step approval gate | ✅ |
| 9 | 04-19 | TBDY + TS 500 curated RAG + confidence + clickable REF modal | ✅ |
| 10 | — | Multi-round Moderator debate (challenge + rebuttal) | ⏭️ DEFERRED (single-round sufficient for demo) |
| 11 | — | Supabase persistence + role-based dashboard views | ⏭️ DEFERRED to post-hackathon (task #27) |
| 12 | 04-19 | Frontend polish — verdict cinema + /styleguide + stage-driven 3D highlight | ✅ |
| 13 | 04-19 | Demo scenarios `/demo` + dashboard Seed Fıstık button | ✅ |
| 14 | 04-19/20 | **Vercel frontend LIVE** · Fly `Dockerfile`+`fly.toml`+`DEPLOY.md` written · backend launch **pending** | 🔄 |
| 14.5 | 04-20 | GPG re-sign all 33 commits + fix author email → 100% verified on GitHub | ✅ |
| 14.6 | 04-21 | Full audit (`AUDIT.md`) + P0+P1+P2 fixes: LICENSE, `/agents` page, README rewrite, Kimi model chip, dead-code deletion, upload size limits, uuid filenames, `_STORE_LOCK`, RAG whitelist tests, HTTP smoke tests, GitHub Actions CI — 21/21 pytest + build green | ✅ |
| 15 | 04-21 | **Fly backend LIVE** at `rebarguard-api.fly.dev` · Hermes OAuth completed + token persisted to `/data/hermes/auth.json` · Vercel env swapped to Fly URL · live E2E Kimi call via subscription green · two Docker build-breakers fixed (CRLF entrypoint, missing `git`, installer location clobber) | ✅ |
| 15.5 | 04-24 | **Hermes framework usage upgrade** — custom SKILL.md files actually loaded (`-s parse-structural-plan`/`-s inspect-rebar`/`-s moderate-inspection`), parcel-based `--source rebarguard:<tag>` audit trail, `scripts/run-mcp.sh` helper, README "what we actually use" table. Framework score 4/10 → 7/10. Live verified on Fly. | ✅ |
| 15.6 | 04-25 | **Memory + agent swarm + framework deepening** — `--resume <session_id>` per-parcel memory persisted to `/data/hermes/rebarguard-sessions.json`; `KimiVisionClient.analyze_images()` agent-swarm fan-out (asyncio.Semaphore, bounded concurrency); subagent parallelism documented honestly (asyncio.gather of bridge subprocesses); `toolsets`/`worktree` flags plumbed through bridge. Framework score 7/10 → 8/10, Kimi 8/10 → 9/10. Live deployed. | ✅ |
| 15 | 05-01/02 | Fly deploy + smoke test + 3-min demo video shoot + edit | ⏳ |
| 16 | 05-03 | Buffer + submission (Twitter @NousResearch + Nous Discord `creative-hackathon-submissions`) | ⏳ |

### Deferred / cut (to absorb Day 5-8 scope)

- Real auth / magic link (keep global dashboard, TODO section in README)
- Full role-based permissions
- E-signature
- Live AFAD API (hardcoded table stays)
- TS 500 full RAG (academic summaries only if needed)

### Publish state

- **GitHub:** `github.com/Himess/rebarguard` — public, 33 commits, 100% GPG-verified (every commit badge-green after Day-14.5 history rewrite).
- **Vercel:** `https://rebarguard.vercel.app` — prod deploy live (fra1 region). Auto-deploys on `git push origin main` via GitHub integration. `himess-projects/rebarguard` project. Env: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` (placeholder; swap to Fly URL after backend deploy).
- **Fly.io:** not yet launched. `backend/Dockerfile`, `backend/fly.toml`, `DEPLOY.md` all written and committed. Target app name: `rebarguard-api` (region `fra`, 1 CPU / 1 GB, auto-suspend, `hermes_data` volume for OAuth persistence).
- **Current runtime for dev:** WSL-local backend (`http://localhost:8000`) + Vercel prod frontend (which currently points to localhost because no public backend exists yet).

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

### What's left before submission (the only remaining critical path)

**Day 15 — Backend deploy + demo video (HIGHEST PRIORITY)**
1. **Fly.io backend launch** (~15 min, mostly interactive):
   - `cd backend && fly launch --no-deploy --copy-config` (keeps checked-in `fly.toml`)
   - `fly volumes create hermes_data --size 1 --region fra`
   - `fly secrets set APP_CORS_ORIGINS=https://rebarguard.vercel.app`
   - `fly deploy`
   - `fly ssh console` → `hermes auth add nous --type oauth --no-browser` → paste URL
     to browser → approve → token persisted to `/data/hermes` volume.
   - Smoke test: `curl https://rebarguard-api.fly.dev/health`, `POST /api/demo/fistik`,
     `GET /api/regulations/TBDY%207.3.4.2`.
2. **Swap frontend env**:
   - Vercel dashboard → Settings → Env Vars → update `NEXT_PUBLIC_BACKEND_URL` to
     `https://rebarguard-api.fly.dev`.
   - Trigger redeploy (empty commit or redeploy button).
3. **Full-flow live test**: open `https://rebarguard.vercel.app/demo` → seed Fıstık →
   open `/inspection/new?project=<id>` → upload a site photo → watch the SSE 9-agent
   debate stream against the **public** backend.

**Day 15 PM / 16 — Demo video shoot + submission**
4. **Shoot the 3-min demo video** — script outline:
   - 0:00–0:15: hook — "Once concrete pours, the rebar is invisible" + Kahramanmaraş frame
   - 0:15–0:45: 1340 Ada 43 Parsel PDF upload → metadata auto-extract → 3D building reveal
   - 0:45–1:45: site-photo upload → live 9-agent debate (model badges visible, Hermes + Kimi on screen) → verdict cinema
   - 1:45–2:30: `/quick` one-shot scan → annotated bounding boxes → click REF badge → TBDY article modal
   - 2:30–3:00: `/demo` scenario grid (happy/conditional/reject) + outro "Hermes Agent + Kimi K2.5 via Nous Portal"
   - Recording: OBS, 1080p, include terminal overlay showing `hermes chat ...` for Hermes track proof.
5. **Submit**:
   - Tweet demo video tagging `@NousResearch` + include link to `github.com/Himess/rebarguard` + brief writeup.
   - Post in Nous Discord `#creative-hackathon-submissions` channel with same content.
   - Deadline: **2026-05-03 EOD**.

### Blocked / waiting on user

- **Nothing critical** — we have everything we need for Day 15.
- Optional: Moonshot API key (only if subscription vision fails during stress test — fallback path `VISION_BACKEND=moonshot` costs ~$5).

### Deferred (post-hackathon or cut)

- **Supabase persistence** (task #27) — in-memory `_STORE` dict is fine for demo + judges.
  Plan exists in `routers/projects.py` for Postgres swap post-submission.
- **Real auth / role gating** — global public dashboard is the current demo UX.
- **Live AFAD API** — hardcoded table is accurate enough; AFAD doesn't publish a clean REST endpoint.
- **Multi-round Moderator debate (challenge + rebuttal)** — single-round synthesis is
  already compelling on video; extra rounds just add latency.
- **DWG reader** — user plots DWG → PDF manually via Autodesk DWG TrueView; our
  existing PDF pipeline then reads it. No native `.dwg` parse required.

### Known warts (acceptable for demo)

- Kimi calls ~60–90 s each on Nous Portal free tier. Mitigation: demo video uses time-lapse
  between "upload" and "verdict" moments. Live judging will cold-start Fly (+2–3 s resume).
- `QUICK_SCAN_PROMPT` variable `QUICK_SCAN_PROMPT` is left as the raw template (no
  whitelist substitution) for backwards compatibility with older imports — callers must use
  `build_quick_scan_prompt()` instead. Not a correctness issue, just a footgun.
- Fly `auto_stop_machines = "suspend"` means first request after idle takes ~2–3 s to
  resume. Warm with `curl /health` right before the demo video shoot.

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

- [x] GitHub repo name final: **`rebarguard`** (public, Himess/rebarguard).
- [x] Deploy destination: **Vercel + Fly.io** (Vercel live; Fly pending launch).
- [x] TS 500 source — **academic summaries marked "NOT OFFICIAL TEXT"** (TSE paywall
      acknowledged in UI; 16 curated articles cover the demo findings).
- [x] Name for demo building/project: **1340 Ada 43 Parsel** (Ferhat Baş, Istanbul).
- [ ] Demo video hosting: raw Twitter/X upload (1080p) vs YouTube unlisted + Twitter link?
      Default plan: upload to Twitter directly to maximize judging visibility, YouTube
      mirror as backup.

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
