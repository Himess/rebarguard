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

### Day 5-6 (Apr 22-23) — Full site-photo pipeline via Hermes Agent
- [ ] Multi-image prompt via Hermes Agent / Kimi K2.5 — batched rebar detection
- [ ] Collect 10-15 curated site photos (Roboflow + self-captured)
- [ ] End-to-end: upload photos → Hermes Agent invokes `inspect_rebar` skill → GeometryAgent diff → frontend renders
- [ ] Edge cases: blurry photo, partial coverage, missing reference marker

### Day 7 (Apr 24) — CodeAgent (RAG) + Hermes 4 narrative
- [ ] Chunk TBDY 2018 PDF into sections (per chapter / article)
- [ ] Embed via Hermes Agent's embeddings skill OR fallback to local sentence-transformers
- [ ] Push chunks to pgvector
- [ ] CodeAgent skill: rule-engine first, then RAG enrichment for relevant articles, then Hermes 4 70B narrative
- [ ] Focus on Chapter 7 (seismic detailing), stirrup-confinement spacing, min rebar ratios

### Day 8 (Apr 25) — FraudAgent + RiskAgent (Hermes Agent skills)
- [ ] FraudAgent skill: EXIF parsing, timestamp sanity, reference-marker presence, photo-hash dedup
- [ ] RiskAgent skill: AFAD `tdth.afad.gov.tr` integration (if open API exists; else hardcoded demo table), soil class input, risk multiplier
- [ ] Both emit structured JSON and integrate into the debate stream

### Day 9 (Apr 26) — MaterialAgent + CoverAgent (Hermes Agent skills)
- [ ] MaterialAgent skill: Kimi K2.5 via Hermes Agent — rebar class markings, corrosion level 0-3
- [ ] CoverAgent skill: concrete-cover estimation via reference marker scale
- [ ] Both emit structured JSON

### Day 10 (Apr 27) — Moderator + multi-round debate
- [ ] Moderator skill using Hermes 4 70B reasoning — multi-round: after initial reports, agents can raise challenges → rebuttals → final verdict
- [ ] Scoring algorithm: weighted sum × risk multiplier → 0-100
- [ ] Thresholds: ≥85 APPROVE, 60-84 CONDITIONAL (human review), <60 REJECT
- [ ] SSE streaming: each debate round yields messages into the live feed

### Day 11 (Apr 28) — Frontend core
- [ ] Next.js 16 + Tailwind v4 init
- [ ] Landing `/` — hero pitch, "how it works"
- [ ] `/upload` — file upload (PDF project + multi-photo site)
- [ ] `/dashboard` — list of pending/approved/rejected inspections (municipality role)
- [ ] Supabase auth (magic link)

### Day 12 (Apr 29) — Inspection detail page + agent debate UI
- [ ] `/inspection/[id]` — left: photos + plan, right: live agent chat feed (SSE)
- [ ] Agent avatars, role colors, message-bubble animation
- [ ] Score panel (circular progress, category breakdown)

### Day 13 (Apr 30) — Three.js 3D overlay
- [ ] Three.js scene: parsed structural plan as 3D schematic (extruded rebars)
- [ ] Overlay mode: fade between plan and site-photo (with detected rebar boxes)
- [ ] Highlight mismatches in red (missing rebars, wrong spacing)
- [ ] Orbit controls, reset camera

### Day 14 (May 1) — Demo data + end-to-end polish
- [ ] Curate 2 demo scenarios:
  - **Happy path:** real project + compliant site photos → APPROVE with high score
  - **Fraud case:** same project + site photos with missing rebars / wrong spacing → REJECT with quantified loss estimate
- [ ] Narrative: optional Kahramanmaraş retrospective segment (if open photos found)
- [ ] Remove all TODO comments, all `print` debug, lint pass
- [ ] Make sure Hermes + Kimi model names are VISIBLE on screen during demo

### Day 15 (May 2) — Video + writeup
- [ ] Storyboard (30s intro / 90s demo / 60s outro)
- [ ] Screen record (OBS) at 1080p
- [ ] Edit (DaVinci Resolve / CapCut) — overlays, captions, zoom-ins on agent debate & 3D overlay
- [ ] Music (royalty-free, uplifting/tense)
- [ ] Twitter writeup (under 280 chars + thread)

### Day 16 (May 3) — Buffer + submission
- [ ] Final test run end-to-end
- [ ] Deploy frontend + backend to public URLs (or local with ngrok for demo)
- [ ] Tweet demo video tagging `@NousResearch`
- [ ] Post Discord link in `creative-hackathon-submissions`
- [ ] Write project README.md with setup instructions, architecture, credits
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
