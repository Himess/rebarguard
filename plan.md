# RebarGuard — Execution Plan

> Day-by-day, hour-by-hour breakdown. `CLAUDE.md` holds the *what* and *why*. This file holds the *when* and *how*.

## North star

Ship a working end-to-end demo where:

1. User uploads an approved structural drawing (PDF).
2. User uploads site photos of rebar work (before concrete pour).
3. 7 agents debate on screen in real-time, using Hermes 4 70B + Kimi-VL.
4. System produces: score + diff + fraud alerts + 3D overlay of plan vs. site.
5. Municipality dashboard gates the approval.

**Demo video (3 min):** cold open with earthquake framing → show upload → watch agent debate live → show 3D overlay of mismatch → show approval gate → close with "quantified fraud prevention."

## Day-by-day

### Day 1 (Apr 18) — DONE — Setup & scaffold
- [x] Create `Desktop/RebarGuard/` and subfolders
- [x] Write `CLAUDE.md` + `plan.md`
- [x] Download TBDY 2018 PDF
- [x] `git init` + 3 commits (`71148a5` init, `cfc2867` state, `7503286` hybrid models)
- [x] Backend scaffold: FastAPI + 7 agents + Moderator + Kimi/Hermes clients + SSE orchestrator + tests
- [x] Frontend scaffold: Next.js 16 + Tailwind v4 + landing/upload/dashboard/inspection pages + agent debate feed + score panel + Three.js overlay
- [x] `.env.example`, `.gitignore`, `data/README.md`, `docs/ARCHITECTURE.md`
- [x] **English localization** — all UI + agent summaries + prompts
- [x] **Hybrid model architecture** — Kimi K2.5 agentic/vision + Hermes 4 70B reasoning + model badges in UI

### Day 2 (Apr 19) — **PIVOT: full Hermes Agent framework adoption (Path B)**

> **Decision (recorded):** Use Nous Portal subscription ($10/mo) by routing ALL LLM calls through the Hermes Agent framework, instead of direct API. This keeps cost at **$0** (Kimi K2.5 is free inside Hermes Agent) and aligns deeply with the hackathon's host tool. Risk: Hermes Agent's Python SDK + vision support aren't fully documented — verify first, then refactor.

#### Day 2 — Morning (research spike — do not refactor yet)
- [ ] Install Hermes Agent on Windows (likely via WSL2):
  `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
- [ ] `hermes setup` — sign in with user's Nous Portal subscription
- [ ] `hermes model moonshotai/kimi-k2.5` — select the free agentic model
- [ ] Locate Hermes Agent Python package / SDK — check if it's `pip install hermes-agent` or GitHub-only
- [ ] Inspect `agentskills.io` standard — understand the skill manifest + runtime contract
- [ ] **Vision smoke test** — send a single JPEG of a rebar photo through Hermes Agent CLI chat with Kimi K2.5 selected, confirm multimodal works via subscription
- [ ] **Decision point:** document whether vision works, whether Python SDK is usable from FastAPI

#### Day 2 — Afternoon (execute based on spike result)

**If vision + Python SDK work:** (best case — pure Path B)
- [ ] Introduce `backend/src/rebarguard/hermes_runtime/` module wrapping the Hermes Agent Python API
- [ ] Replace `HermesClient.complete` internals with Hermes Agent skill execution
- [ ] Replace `KimiVisionClient.analyze_image` internals with Hermes Agent multimodal skill call
- [ ] Keep the current Python interfaces so agents (`GeometryAgent`, etc.) don't change
- [ ] Run end-to-end smoke: upload a PDF → `POST /api/projects` still returns `StructuralPlan`

**If vision works but Python SDK is immature:** (fallback — subprocess bridge)
- [ ] Wrap `hermes run --skill <name> --input <json>` via `asyncio.create_subprocess_exec`
- [ ] Stream stdout → parse structured JSON lines → yield to caller
- [ ] Keep FastAPI SSE flow unchanged

**If vision does NOT work via framework:** (partial fallback — $5 vision)
- [ ] Keep Hermes 4 70B + Kimi K2.5 TEXT calls via Hermes Agent (subscription)
- [ ] Vision-only calls route through Moonshot direct (`VISION_BACKEND=moonshot`) — requires $5-10 in Moonshot API credit
- [ ] Document the mixed billing in CLAUDE.md

### Day 3-4 (Apr 20-21) — Skills as Hermes Agent skills + PlanParser hardening
- [ ] Convert each of our agents into a proper Hermes Agent skill:
  - `skills/parse_structural_plan/skill.yaml` (manifest) + `main.py` (logic)
  - `skills/inspect_rebar/...`
  - `skills/check_compliance/...`
  - `skills/detect_fraud/...`
  - `skills/assess_risk/...`
  - `skills/check_material/...`
  - `skills/measure_cover/...`
  - `skills/moderate_debate/...`
- [ ] Each skill consumes structured input (JSON) + emits structured output (JSON)
- [ ] Iterate `parse_structural_plan` on 3-4 real structural drawings
- [ ] Confidence scoring per parsed element
- [ ] Keep our FastAPI as the HTTP adapter that invokes these skills

### Day 5-6 (Apr 19-20) — Layout refactor + photo annotations (user-directed expansion)

**User decision on Day 5:** current UI too basic. Redesign with 60% 3D hero + quick
photo-analyzer mode. Ferhat Baş's project already validated end-to-end via curl stream.

#### Day 5
- [x] GitHub repo push (`github.com/Himess/rebarguard`, public)
- [ ] Layout refactor of `/inspection/new` — 60% 3D viewer + 25% upload column + bottom
      strip for agent debate + score
- [ ] Claude Design brief (user runs it in parallel while Claude writes code)
- [ ] Landing hero redesign with architectural blueprint motif
- [ ] Agent debate bubble v2 (motion + typographic polish)

#### Day 6
- [ ] Add `/quick` route — drag any construction photo, no project needed, Kimi returns
      issues + bounding boxes
- [ ] Extend Kimi prompts to emit `issues[]` with `{ label, severity, bbox: {x,y,w,h} }`
      where coordinates are normalized [0,1] over image
- [ ] Build `PhotoAnnotations` component: SVG overlay on `<img>` with circles + labels,
      click-for-detail popover showing TBDY / TS 500 reference + Kimi narrative
- [ ] Validate on the 19 Fıstık photos + seed a curated demo gallery

### Day 7 (Apr 21) — Stage-by-stage workflow
- [ ] Extend `Inspection` with `stage` enum: `foundation | basement | ground | {1..N} | roof`
- [ ] UI stage picker on `/inspection/new` — walks contractor through each pour phase
- [ ] Backend accumulates per-stage history on the project (pour record)
- [ ] Each stage kicks off 7-agent debate; rejected stages block next-stage start
- [ ] Dashboard shows project progress as a ladder (which pour is where)

### Day 8 (Apr 22) — Belediye Agent + 2-step approval
- [ ] New agent: `MunicipalityAgent` — takes Moderator's report, re-scores independently,
      flags anything Moderator underweighted. Uses Hermes 4 70B reasoning, different
      system prompt (role: municipal engineer reviewer).
- [ ] Approval gate state machine:
      pending → `agent_consensus` (score ≥ 85 && no critical) → `municipal_review`
      (belediye agent counter-check) → `human_review` (manual click button) → `authorized`
      Any failure returns to `rejected` with reason chain.
- [ ] Municipal reviewer UI — sees queued inspections, belediye-agent report, and can
      click "Approve pour" or "Reject with reasons"

### Day 9 (Apr 23) — TBDY RAG + CodeAgent article-level narration
- [ ] Chunk TBDY 2018 PDF into sections (per chapter / article)
- [ ] Embed via Kimi/Moonshot embeddings or local sentence-transformers
- [ ] pgvector index (or simpler: FAISS on-disk for demo)
- [ ] CodeAgent enrichment: rule engine → RAG lookup for violated articles → Hermes 4 70B
      turns cited article text into plain-English explanation
- [ ] Focus on §7.3 (columns), §7.4 (beams), §7.6 (shear walls)

### Day 10 (Apr 24) — Multi-round Moderator debate + scoring polish
- [ ] Moderator multi-round: after initial 7 reports, invites challenges from specific
      agents (e.g. Fraud challenges Geometry's count if EXIF conflicts), then closes
      with final verdict
- [ ] Scoring algorithm review: weighted sum × risk multiplier, thresholds
      (≥85 APPROVE, 60-84 CONDITIONAL, <60 REJECT)
- [ ] SSE stream emits each debate round separately for richer live feed

### Day 11 (Apr 25) — Supabase persistence + project history
- [ ] Schema: `projects`, `inspections`, `agent_messages`, `approval_events`
- [ ] Replace in-memory `_STORE` with Supabase client
- [ ] Projects + stage history survive backend restart
- [ ] Dashboard per-project pour ladder visualization

### Day 12 (Apr 26) — Frontend polish
- [ ] `VerdictReveal` full-screen cinematic moment on final verdict
- [ ] Agent debate bubbles — motion v2, typographic hierarchy
- [ ] Score ring animation (counts up to final value)
- [ ] Photo annotation popovers refined
- [ ] Dark-mode CAD blueprint motif background for landing + 3D pane

### Day 13 (Apr 27) — Demo scenarios with Fıstık project
- [ ] Curate 3 narrative scenarios using the 19 Fıstık photos:
      **Happy**: compliant foundation pour → APPROVE
      **Warning**: cover shortage → CONDITIONAL (human review)
      **Reject**: shear wall missing 25% rebars → REJECT with quantified loss estimate
- [ ] Script narration beats for video

### Day 14 (Apr 28) — Vercel + Modal/Fly deploy
- [ ] Frontend on Vercel with public domain
- [ ] Backend on Modal (fastest) or Fly.io with WSL-bridge caveats solved
      (options: run backend natively on target platform, or dockerize + install
      hermes inside container)
- [ ] End-to-end test on deployed URLs

### Day 15 (Apr 29) — Demo video shoot + edit
- [ ] Storyboard (30s intro / 90s demo / 60s outro)
- [ ] Screen record at 1080p 60fps
- [ ] Edit with captions + overlays; highlight model badges (`moonshotai/kimi-k2.5`, `Hermes-4-70B`)
- [ ] Music (royalty-free, uplifting/tense)
- [ ] Twitter writeup (<280 chars + thread)

### Day 16 (Apr 30 — May 3) — Buffer + submission
- [ ] Final E2E test on deployed URLs
- [ ] Tweet demo video tagging `@NousResearch` + `@Kimi_Moonshot`
- [ ] Post in Nous Discord `creative-hackathon-submissions`
- [ ] README with setup, architecture, credits, license
- [ ] Submit GitHub link

## Scope guardrails

**IN scope:**
- 7 agents + moderator as Hermes Agent skills (Path B)
- Kimi K2.5 via subscription (free) for vision + agentic orchestration
- Hermes 4 70B via subscription for Moderator + CodeAgent narrative
- SSE live agent-debate stream to frontend
- Three.js 3D overlay (columns only — beams/shear walls only if time)
- 2 demo scenarios (happy + fraud)
- TBDY 2018 RAG (TS 500 if accessible)
- AFAD zone lookup

**OUT of scope:**
- Mobile app (web only)
- Real municipality integration (mock dashboard only)
- Rebar detection model training (Kimi K2.5 zero-shot)
- Full Turkish construction code coverage (cite relevant articles only)
- User accounts beyond role-based demo
- Payment / subscriptions / invoicing

## Risk register

| Risk | Mitigation |
|------|-----------|
| **Hermes Agent framework doesn't expose usable Python SDK / vision via subscription** | Day 2 morning research spike answers this. Fallback: subprocess bridge (`hermes run ...`). Worst case: $5-10 Moonshot direct for vision only |
| **Windows / WSL2 install friction for Hermes Agent** | Install path documented by Nous (curl installer); WSL2 if native Windows fails. Budget: 2-3 hours before falling back |
| **Subscription doesn't cover the volume we need during testing** | Unlikely at $10/mo given our small call volume; monitor `hermes usage` if available. Keep direct API as a $5 safety net |
| Kimi K2.5 can't read some structural drawings well | Prompt engineering, few-shot examples; fallback: pre-annotate 2-3 demo projects |
| No open TS 500 PDF | Use academic summaries + İMO lecture notes; cite on-screen |
| AFAD has no public API | Hard-code 5-10 cities' zone data for demo (already implemented) |
| Rebar detection inaccurate on real photos | Curate demo photos to ones Kimi handles well; "research prototype" framing in video |
| Hermes 4 70B latency for debate | Show async streaming so the wait is visible; cache deterministic steps |
| 3D viewer too ambitious | Scope to 1-2 columns — already done in Day 1 scaffold |
| Video production time underestimated | Day 15 is dedicated; Day 14 locks the scenarios |

## Success metrics

- **Must have:** End-to-end demo runs live at submission. 3 agents or more visibly debate. Hermes + Kimi both called. 3D overlay functional on at least 1 column.
- **Should have:** All 7 agents debate. Score report polished. Two scenarios (happy + fraud).
- **Nice to have:** Deployed public URL. Kahramanmaraş narrative segment. Mobile-responsive frontend.

## Review cadence

After each day, update `CLAUDE.md` "Current state" section with:
- Completed tasks (check off)
- Blockers
- Decisions made
- What tomorrow starts with
