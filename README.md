# RebarGuard

**Multi-agent AI inspector for reinforced-concrete construction.** Photos in, compliance scores
out. Gates concrete-pour approval against Turkish seismic codes (TBDY 2018 —
*Türkiye Bina Deprem Yönetmeliği*; TS 500 — concrete design rules).

→ **Try it live:** [rebarguard.vercel.app](https://rebarguard.vercel.app)
→ **Repo:** [github.com/Himess/rebarguard](https://github.com/Himess/rebarguard)

Built for the [Hermes Agent Creative Hackathon 2026](https://x.com/NousResearch) on
**[Hermes Agent](https://github.com/NousResearch/hermes-agent)** (Nous Research) +
**[Kimi K2.6](https://platform.moonshot.ai/)** (Moonshot).

[![MIT](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009485?style=flat-square)
![Hermes Agent](https://img.shields.io/badge/Hermes%20Agent-v0.10-FF6A1F?style=flat-square)
![Kimi K2.6](https://img.shields.io/badge/Kimi%20K2.6-vision-3B9EFF?style=flat-square)
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

1. Municipality-approved structural drawing (PDF) → **Kimi K2.6** parses → structured plan JSON
   with columns, beams, slabs, shear walls, stairs, and all metadata (city, soil class, seismic
   zone, floor count, footprint).
2. Contractor uploads site photos **before each pour** → **Kimi K2.6** detects the rebar layout,
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
| Vision + agentic | **Kimi K2.6** via Nous Portal subscription ($0/1M on Basic plan) |
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
    vision/           Kimi K2.6 client + prompts
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

## Hermes Agent framework — what we actually use

RebarGuard is not a thin OpenAI wrapper — it threads six real Hermes Agent
primitives through a Python orchestrator:

| Primitive | How we use it |
|---|---|
| **Custom `SKILL.md` files** (`-s`) | Three skills ship in the Docker image at `/opt/hermes-skills/`: `parse-structural-plan`, `inspect-rebar`, `moderate-inspection`. The entrypoint symlinks them under `~/.hermes/skills/` so every `hermes chat -s <name>` call at runtime preloads the skill's instructions. Skills are repo-versioned at [`backend/skills/rebarguard/`](./backend/skills/rebarguard). |
| **Nous Portal subscription path** (`--provider nous`) | All 9 agents route through `hermes chat --provider nous -m moonshotai/kimi-k2.6` or `-m Hermes-4-70B`. $0 incremental cost via the Basic plan. No direct API keys in the live container. |
| **Session `--source` tagging** | Moderator and Belediye Agent calls for the same parcel share `--source rebarguard:<parcel_no>`. `hermes sessions list --source rebarguard:1340-ada-43-parsel` filters every prior verdict for the building — audit trail that persists on the Fly volume. |
| **Session `--resume <id>` memory** | After every Moderator + Belediye call we persist the emitted `session_id` to `/data/hermes/rebarguard-sessions.json`. Next time the same parcel comes up, we pass `--resume <id>` so Hermes literally loads the prior verdict into context — repeat-offender awareness baked in. |
| **Subagent parallelism** | The 4-way `geometry/code/fraud/risk` step and the 2-way `material/cover` step both fan out parallel `hermes chat` subprocesses. Each one runs in its own isolated process with its own session, exactly the framework's subagent primitive. The bridge also wires `--worktree` for git-worktree isolation when an agent ever needs to mutate the repo. |
| **Lifecycle hooks** | `backend/hermes-config/cli-config.yaml` declares three hooks (`on_session_start`, `on_session_finalize`, `post_llm_call`) that fire shell scripts on every Hermes Agent call. The scripts append a tamper-evident JSONL row to `/data/hermes/audit-log.jsonl` on the Fly volume — every Moderator verdict is auditable end-to-end without changing a line of Python. Verified live: `hermes hooks doctor` reports all three allowlisted + firing. |
| **Scheduled jobs (cron)** | `bash scripts/install-cron.sh` (also at `/opt/hermes-config/install-cron.sh` inside the container) registers two recurring Hermes Agent jobs: a daily 03:00 UTC audit-log digest summarising the past 24 h of verdicts, and a weekly Sunday 02:00 UTC AFAD seismic-feed probe that flags new high-PGA events near seeded parcels. Both jobs reuse the `moderate-inspection` skill and run with `--workdir /data/hermes` so they have direct access to the persistent state. |
| **Plugins (catalog hook)** | `bash scripts/install-plugins.sh` is the registrar where third-party Hermes Agent plugins (Git-installed CLI extensions) get pinned. The framework supports it; we ship the helper but no third-party plugins are hard-coded so the trust surface stays minimal. |
| **MCP server mode** | `bash scripts/run-mcp.sh` exposes our skill-loaded Hermes backend as a Model Context Protocol server. Any MCP-capable client (Claude Desktop, Cursor, Zed, custom) can drive the same orchestration without going through the FastAPI REST surface. |

## Kimi K2.6 — what we actually use

| Surface | How we use it |
|---|---|
| Native `--image` vision | Five vision tasks: `parse-structural-plan` (PDF pages), `inspect-rebar` (site photos), material close-up, cover estimation, `/quick` one-shot scan. Strict JSON output; bbox + confidence per finding. |
| **Agent-swarm fan-out** | `KimiVisionClient.analyze_images()` runs N concurrent `hermes chat --image` subprocesses (bounded `Semaphore`, default 4-5). PlanParser uses it to process every PDF page in parallel; the orchestrator's `_detect_all` does the same for site photos. 19-photo Fıstık stage drops from ~25 min sequential to ~5 min parallel. |
| Curated RAG whitelist | Quick-scan prompt injects the 16 curated TBDY/TS 500 codes; `_validate_ref()` silently drops any citation Kimi invents that's not on the whitelist. |
| Subscription path | Every Kimi call goes through Hermes Agent CLI via Nous Portal Basic ($0/M tokens). Direct Moonshot API kept as a hot-swap fallback (`VISION_BACKEND=moonshot`). |

## MCP server — RebarGuard as an AI-agent service

RebarGuard is also a Model Context Protocol server. Any MCP client (Claude Desktop,
ChatGPT desktop, another Hermes Agent instance, or `npx @modelcontextprotocol/inspector`)
can call into the inspection registry without going through the web UI.

**Five tools exposed:**

| Tool | What it does |
|---|---|
| `list_inspections` | Every uploaded RebarGuard project pending pre-pour inspection. Returns id, parcel, city, soil class, zone, element counts, parse confidence. |
| `get_inspection` | Full StructuralPlan for one project — every column / beam / wall / slab / stair with rebar layout, plus Kimi confidence. |
| `seed_fistik_demo` | Provision the canonical 1340 Ada 43 Parsel demo project in one call. Returns the cockpit URL with `?replay=fistik_reject` query so the caller can hand off to the deterministic 9-agent debate UI. |
| `lookup_regulation` | Resolve a TBDY 2018 or TS 500 article code to its full EN + TR text. Whitelist of 16 curated codes — same registry that grounds the citation modal in `/quick`. |
| `replay_scenario` | Pre-recorded 9-agent debate metadata. Useful for wiring a deterministic demo into another agent's workflow without burning Kimi quota. |

**Run locally** (stdio mode, the format Claude Desktop expects):

```bash
cd backend
uv run python -m rebarguard.mcp
```

**Hook up to Claude Desktop:**

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "rebarguard": {
      "command": "uv",
      "args": ["run", "python", "-m", "rebarguard.mcp"],
      "cwd": "/absolute/path/to/RebarGuard/backend",
      "env": { "REBARGUARD_BACKEND_URL": "https://rebarguard-api.fly.dev" }
    }
  }
}
```

Now Claude Desktop sees five RebarGuard tools and can drive a real inspection cockpit:

> *"Show me pending RebarGuard inspections in Istanbul, then seed the Fıstık demo and pull
> the verdict for the seeded project."*

Claude calls `list_inspections` → `seed_fistik_demo` → `get_inspection` → answers in natural language.
The MCP layer is a thin httpx wrapper over the existing FastAPI — no logic duplication, no state
divergence, swap `REBARGUARD_BACKEND_URL` to point at staging or local.

## Hackathon tracks

- **Main Track** — Hermes Agent orchestrating a 9-agent debate on real structural-engineering
  data, SSE-streamed to a Three.js building viewer.
- **Kimi Track** — Kimi K2.6 handles every vision call (plan parsing, rebar detection, material
  class, concrete cover). Every `AgentMessage.evidence.model` field carries
  `moonshotai/kimi-k2.6` or `Hermes-4-70B` so the demo video is self-documenting proof.

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
