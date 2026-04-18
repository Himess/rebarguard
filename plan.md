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

### Day 1 (Apr 18) — TODAY — Setup & skeleton
- [x] Create `Desktop/RebarGuard/` and subfolders
- [x] Write `CLAUDE.md` + `plan.md`
- [x] Download TBDY 2018 PDF
- [ ] Download 1-2 rebar dataset samples from Roboflow Universe
- [ ] `git init` + first commit
- [ ] Create `backend/pyproject.toml` with `fastapi`, `uvicorn`, `pydantic`, `httpx`, `python-dotenv`, `openai` (for Kimi via OpenAI-compat), `pypdf`, `pgvector` client
- [ ] Create `frontend/package.json` with Next.js 16, Tailwind v4, three, @react-three/fiber, @react-three/drei, motion
- [ ] Create `backend/src/rebarguard/main.py` (FastAPI app + health route)
- [ ] Create `backend/src/rebarguard/vision/kimi_client.py` (Kimi-VL wrapper)
- [ ] Create `backend/src/rebarguard/schemas/` (Pydantic models for Project, Inspection, AgentMessage, Score)
- [ ] Create stubs for all 7 agents + Moderator in `backend/src/rebarguard/agents/`
- [ ] Create `.env.example`
- [ ] Create `.gitignore`

### Day 2 (Apr 19) — Hermes Agent wiring
- [ ] Install Hermes Agent framework locally
- [ ] Configure `hermes model` to point to Nous Portal with user's API key
- [ ] Write first Hermes skill: `parse_structural_plan` (Phase 1 entry)
  - Input: PDF path
  - Steps: Kimi-VL OCR → structured JSON extraction → validate against schema
  - Output: `StructuralPlan` Pydantic model
- [ ] Kimi-VL smoke test on 2-3 real structural drawings (find samples online — academic courses, `yapi-proje.com` etc.)
- [ ] First API endpoint `POST /api/projects` that invokes the skill
- [ ] Log Kimi + Hermes calls (we need this in demo video)

### Day 3-4 (Apr 20-21) — Phase 1 hardening
- [ ] Iterate `parse_structural_plan` on 3-4 real Turkish drawings
- [ ] Schema handling for: kolon (column) list with kesit, boyuna donatı, etriye, çiroz
- [ ] Kirişler (beams) + perde duvarlar (shear walls) if time permits
- [ ] Confidence scoring per parsed element
- [ ] Unit tests for schema validation

### Day 5-6 (Apr 22-23) — GeometryAgent + site-photo pipeline
- [ ] Build rebar-detection pipeline: Kimi-VL prompt-engineered to emit structured JSON (count, approximate spacings, diameter class)
- [ ] Collect 10-15 curated site photos (Roboflow datasets + self-captured)
- [ ] GeometryAgent skill: compare plan JSON vs. site detection JSON → diff report
- [ ] Error cases: blurry photo, partial coverage, no reference marker

### Day 7 (Apr 24) — CodeAgent (RAG)
- [ ] Chunk TBDY 2018 PDF into sections (per chapter / madde)
- [ ] Embed with Kimi or OpenAI embeddings → pgvector
- [ ] Chunk TS 500 equivalent material (academic summaries if PDF unavailable)
- [ ] CodeAgent skill: given parsed-plan + site-detection, queries RAG for applicable articles, returns compliance verdict per article
- [ ] Focus on Bölüm 7 (seismic detailing), etriye sıklaştırma, min donatı oranları

### Day 8 (Apr 25) — FraudAgent + RiskAgent
- [ ] FraudAgent: EXIF parsing, timestamp sanity, reference-marker presence (QR / fiducial), photo-hash prior check
- [ ] RiskAgent: AFAD `tdth.afad.gov.tr` integration (if open API; else hard-code zones for demo), soil class input, risk multiplier
- [ ] Both as Hermes skills with structured outputs

### Day 9 (Apr 26) — MaterialAgent + CoverAgent
- [ ] MaterialAgent: Kimi-VL prompt for rebar-class marking detection (S420, B500C text on bar), corrosion level 0-3
- [ ] CoverAgent: concrete-cover estimation from photo using reference marker scale
- [ ] Both as Hermes skills

### Day 10 (Apr 27) — Moderator + debate engine
- [ ] Moderator skill: takes all 7 agent outputs, runs a debate round (each agent can raise challenges/counterpoints), produces final consolidated report
- [ ] Scoring algorithm: weighted sum across categories × risk multiplier = 0-100 score
- [ ] Thresholds: ≥85 APPROVE, 60-84 CONDITIONAL (human review), <60 REJECT
- [ ] SSE streaming endpoint so frontend can watch debate live

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
- 7 agents + moderator
- Kimi-VL vision for PDF + site photos
- Hermes 4 70B reasoning + tool use
- SSE live agent-debate stream
- Three.js 3D overlay (columns only — beams/shear walls only if time)
- 2 demo scenarios (happy + fraud)
- TBDY 2018 RAG (TS 500 if accessible)
- AFAD zone lookup

**OUT of scope:**
- Mobile app (web only)
- Real municipality integration
- Rebar detection model training (use Kimi-VL zero-shot)
- Full Turkish construction code coverage (only cite relevant articles)
- User accounts beyond role-based demo
- Payment, subscriptions, invoicing

## Risk register

| Risk | Mitigation |
|------|-----------|
| Kimi-VL can't read Turkish structural drawings well | Prompt engineering, few-shot examples; fallback: pre-annotate demo projects |
| No open TS 500 PDF | Use academic summaries + İMO ders notları; cite on-screen |
| AFAD has no public API | Hard-code 5-10 cities' zone data for demo |
| Rebar detection inaccurate on real photos | Curate demo photos to ones Kimi handles well; note "research prototype" framing |
| Hermes 4 70B slow / rate-limited | Show async debate streaming, cache results, fallback to 35B A3B |
| 3D viewer too ambitious | Scope to 1-2 columns, not whole building |
| Video production time underestimated | Day 15 is FULL day, Day 14 produces the canned scenarios ready to record |

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
