# RebarGuard — Pre-Submission Audit

**Date:** 2026-04-21
**Scope:** Full-repo audit across backend, frontend, deployment, testing, docs, and hackathon fit.
**Method:** Four parallel Explore agents (backend / frontend / deploy+tests / docs+hackathon) reading
every file, plus synthesis and cross-checks.
**Verdict:** **95% shipped. Ship-ready after a small Day-15 polish pass.** No show-stoppers. Critical
path is unchanged: Fly launch → Vercel env swap → demo video → submit.

---

## Executive summary

| Axis | Score | 1-line verdict |
|------|-------|----------------|
| Backend correctness | 8/10 | Clean architecture, clear model attribution, small robustness gaps |
| Frontend polish | 9/10 | Design system consistent, one dead route, mobile needs minor fix |
| Deploy readiness | 9/10 | Docker + Fly + Vercel configs solid; Fly launch still pending |
| Test coverage | 4/10 | Schema + geometry tested; every HTTP endpoint untested |
| Docs quality | 7/10 | CLAUDE.md exemplary, README needs screenshots + live URL + LICENSE |
| Hackathon creativity fit | 6/10 | Domain isn't traditionally "creative" — needs narrative reframe in video |
| Hackathon usefulness fit | 9/10 | Real stakes, quantified output, real data |
| Hackathon presentation fit | 9/10 | UI + motion + 3D are television-quality |
| Commit storytelling | 10/10 | Clean narrative, 100% GPG-verified, atomic commits |

**Strategic call:** you are in striking distance of **Main 1st ($10K) + Kimi 1st ($3.5K)** if you
nail Day-15 polish + video. Biggest lever is creative framing in the first 10 seconds of the video
(Kahramanmaraş reframe) and Kimi-model visibility on screen.

---

## 1. Must-fix before submission (P0 — a judge will notice)

| # | Issue | Where | Effort |
|---|-------|-------|--------|
| 1 | `/agents` link in TopNav 404s (no page exists) | `frontend/components/TopNav.tsx:13` | 5 min (delete link OR build 1-screen showcase page) |
| 2 | No LICENSE file at repo root (README claims MIT) | repo root | 2 min (`git add LICENSE`) |
| 3 | Missing live URL + screenshots + local-run block in README | `README.md` | 20 min |
| 4 | `NEXT_PUBLIC_BACKEND_URL` still placeholder `http://localhost:8000` on Vercel | Vercel dashboard env vars | 1 min after Fly deploy |
| 5 | Fly backend not deployed yet | `backend/fly.toml` + user action | 15 min interactive |
| 6 | Video script opens with PDF upload, not the Kahramanmaraş hook | Day-15 video shoot | script rewrite |
| 7 | Kimi model tag (`moonshotai/kimi-k2.6`) isn't visually prominent anywhere reviewers will see in under 3 seconds | `frontend/app/quick/page.tsx`, debate bubbles | 10 min (add a chip near upload zone) |
| 8 | Hermes CLI is never shown in-UI — video must include a terminal overlay | video only | shoot-time |
| 9 | CORS secret must actually be set: `fly secrets set APP_CORS_ORIGINS=https://rebarguard.vercel.app` | Fly | 30 s during deploy |

If P0 items 1-4 are done before the video shoots, you're golden.

---

## 2. Should-fix (P1 — sharpens the demo, not a blocker)

| # | Issue | Where |
|---|-------|-------|
| 10 | `ThreeOverlay.tsx` is dead code — unused, superseded by `ClaudeBuildingViewer.tsx` | `frontend/components/ThreeOverlay.tsx` |
| 11 | Stale `QUICK_SCAN_PROMPT` module-level var (admits staleness in its own comment) | `backend/src/rebarguard/vision/prompts.py:203` |
| 12 | `<img ... alt="" />` on the quick-scan photo — a11y | `frontend/app/quick/page.tsx` (photo display) |
| 13 | `ArticleModal` catches fetch errors but never renders the error string to the user | `frontend/components/ArticleModal.tsx:23-26` |
| 14 | `ClaudeBuildingViewer` re-mounts on every SSE debate message (state couples viewer to debate list) — perf jank mid-demo | `frontend/app/inspection/new/page.tsx` |
| 15 | Landing page hero grid is `1.2fr 1fr` fixed — clips on viewports <768 px if demo recorded vertically | `frontend/app/page.tsx` |
| 16 | No tests for any HTTP route: `/api/projects`, `/api/quick/analyze`, `/api/inspections/stream`, `/api/demo/fistik`, `/api/regulations/{code}` | `backend/tests/` |
| 17 | Moderator `_clip()` helper has duplicated `min/max` logic — cosmetic | `backend/src/rebarguard/agents/moderator.py:142-147` |
| 18 | `motion` npm package imported but likely unused (CSS keyframes are used instead) — bundle bloat | `frontend/package.json` |
| 19 | `/health` endpoint only checks FastAPI liveness, not whether Hermes OAuth token is valid | `backend/src/rebarguard/main.py:34` |

---

## 3. Nice-to-have (P2 — post-hackathon)

- Unbounded file upload size on `/api/projects`, `/api/quick/analyze`, `/api/inspections/stream`. User-supplied filename reaches disk on upload (path-traversal smell; mitigated by random temp dir).
- Concurrency on the in-memory `_STORE` dict — safe under GIL but not under multi-worker uvicorn.
- Rate limiting on Kimi calls (subscription quota protects us for now).
- Dead `backup-before-email-fix` branch still on local machine.
- No `.github/workflows` — no CI gating on PRs.
- Supabase persistence wiring (deferred — task #27).
- `HERMES_HOME` env var not set on Dockerfile, but runtime symlink `/root/.hermes → /data/hermes` handles it.

---

## 4. What's right (do not touch)

**Backend**
- `services/inspection.py` orchestrator runs the 9 agents with correct parallelism where safe, then
  synthesizes Moderator → Belediye. Every `AgentMessage.evidence` carries the `model` tag — demo
  video will have automatic proof of dual-model (Kimi + Hermes) use.
- `hermes_runtime/bridge.py` — clean subprocess wrapper, cross-platform path translation, timeout
  enforcement, JSON extraction tolerant of pre/post prose.
- `rag/regulations.py` — 16 curated articles, whitelist injection into the quick-scan prompt,
  `_validate_ref()` silently drops hallucinations. TS 500 entries explicitly marked as summaries.
  This is the correct defensive posture — judges will see it's not a hallucination risk.
- Pydantic schemas: clean polymorphism via `StructuralElement` union, cascade `find_element()`,
  auto-extracted `ProjectMetadata`.
- `Dockerfile` uses the 1.7 syntax heredoc correctly, installs poppler + Hermes CLI, entrypoint
  symlinks the volume path after mount. Portable to Fly Linux.
- `fly.toml` — right region, right auto-suspend policy, right health check cadence, right
  concurrency limits for a 1-CPU hackathon demo.

**Frontend**
- OKLCH design system is applied consistently. No hardcoded colors found. Typography is IBM Plex
  Sans/Mono via `next/font/google` with `display: swap`.
- `BACKEND_URL` is defined exactly once in `lib/api.ts` — env-swappable.
- SSE client uses proper `AbortController` + `TextDecoder` + chunked buffering. Malformed JSON
  chunks are ignored gracefully.
- `VerdictCinema` + `ArticleModal` both use `role="dialog"` + `aria-modal` + Escape-to-close +
  backdrop click-to-dismiss. Motion on verdict reveal is television-quality.
- `/demo` + `/quick` both have offline fallback so the site remains usable if Fly is cold.
- `/inspection/new` correctly wraps `useSearchParams` in `<Suspense>` — Vercel build fix holds.
- `vercel.json` pins framework, region (fra1, closest to Istanbul), and security headers.

**Repo hygiene**
- 34 commits, **100% GPG-verified** after the Day-14.5 `filter-branch` rewrite.
- `.gitignore` is complete: `__pycache__`, `.venv`, `node_modules`, `.next`, `.env.*`, `*.pdf`
  (except regulations), and `scripts/_*.sh` dev probes.
- Lockfiles tracked (`backend/uv.lock`, `frontend/pnpm-lock.yaml`).
- No API keys or secrets in git history.
- Commit messages tell a coherent narrative: scaffold → research spike → Path B decision →
  validation → iteration → polish → deploy. A judge scrolling `git log` sees a team that shipped
  with discipline.

---

## 5. Detailed findings by area

### 5.1 Backend (`backend/src/rebarguard/...`)

**Bugs (actual correctness issues)**
- `services/inspection.py` — Belediye exception handler catches-and-emits but doesn't log. If
  Hermes 4 70B times out, the stream will emit a graceful fallback bubble but the root cause is
  lost. Not a crash; weak observability only.
- `routers/quick.py` — if Kimi returns malformed JSON with `"error"` key, the endpoint raises HTTP
  500 instead of returning a partial `findings: []`. A single bad Kimi response kills the whole
  scan. Acceptable for demo but brittle.

**Robustness / security**
- File upload size unbounded on three upload endpoints. Worst case: 500 MB PNG base64-encodes to
  ~700 MB RAM in `_encode_image`. Mitigation cheap: FastAPI `max_body_size` middleware.
- `pdf.filename` user-supplied, flows into `tempfile.mkdtemp()` join. Random subdir prevents actual
  traversal but the smell remains — use `uuid4().hex` instead.
- CORS list comes from `APP_CORS_ORIGINS` env; no guard against `"*"`. Must verify `fly secrets set`
  locks it to the Vercel origin at deploy time.

**Deploy / portability**
- `HERMES_CLI_VIA_WSL=false` from `fly.toml` is the correct branch for Fly Linux; the
  `shutil.which("hermes")` probe will resolve the installed CLI. Only breaks if someone `docker run`
  s this image on a dev machine without setting `HERMES_CLI_VIA_WSL=true`.
- Hermes Agent install URL (`https://hermes-agent.nousresearch.com/install.sh`) is a build-time
  dependency. If the URL is down at `fly deploy`, the build fails. Acceptable hackathon risk —
  Nous hosts it.

**Hackathon visibility (model attribution)**
- Every agent attaches `model` to its `AgentMessage.evidence`. Kimi vision agents attach
  `moonshotai/kimi-k2.6`. Moderator + Belediye attach `Hermes-4-70B`. The frontend's `ModelBadge`
  component renders it. So the video recording of the debate feed is self-documenting proof of
  dual-track usage.

### 5.2 Frontend (`frontend/...`)

**Dead code / dead links**
- `components/ThreeOverlay.tsx` is never imported. Superseded by `ClaudeBuildingViewer.tsx`. Delete.
- `TopNav.tsx` links to `/agents` which does not exist — will 404. Either delete that nav item or
  build a one-screen agent showcase (list the 9 agents with their model + role).

**Bugs / a11y**
- Photo `<img>` element in `/quick` has `alt=""` — one-line fix.
- `ArticleModal` sets `setErr()` but doesn't render the error body — one-line fix.
- Dialogs (`VerdictCinema`, `ArticleModal`) have `role="dialog"` + `aria-modal` but no
  `aria-labelledby`. Minor.

**Performance**
- `ClaudeBuildingViewer` isn't memoized; `inspection/new` re-renders on every SSE message, so the
  Canvas re-creates. In theory: jank during the 60-90 s agent stream. In practice: Three.js Scene
  is torn down + rebuilt. `React.memo` + splitting state would fix.

**Demo-readiness**
- `/demo` + `/quick` + `/dashboard` all gracefully show "BACKEND OFFLINE" badges and fall back to
  `DEMO_FALLBACK` data. This means even if Fly is cold or unauthed during judging, the Vercel site
  is usable.

### 5.3 Deploy & tests

**Deploy — solid**
- Dockerfile (1.7 syntax, poppler, Hermes CLI, entrypoint symlink).
- fly.toml (region, CPU/mem, volume mount, health check, auto-suspend).
- vercel.json (framework pin, region, headers).
- DEPLOY.md accurately describes the `fly launch` → `fly volumes create` → `fly secrets set` →
  `fly deploy` → `fly ssh console` OAuth flow with smoke tests at the end.

**Tests — big gap**
- Unit: schemas (roundtrip) + geometry agent (happy/critical). Clean, passes.
- Integration: **zero**. Not a single test hits `POST /api/quick/analyze`, `POST /api/projects`,
  `POST /api/inspections/stream`, or `POST /api/demo/fistik`. The RAG whitelist behavior
  (`_validate_ref`) is not asserted by any test.
- E2E: `e2e_hermes_bridge.py` is a manual runner, not pytest. It does verify both the text + vision
  subscription paths work — the bridge itself is real.
- No `.github/workflows` — no CI. Acceptable for hackathon; risky post-submission if you continue
  the project.

**Repo hygiene — clean**
- 34 commits, atomic, all GPG-verified.
- TBDY 2018 PDF (7 MB) tracked as regular blob — fine, makes `git clone` self-sufficient.
- Sample project PDFs are small.
- Dev probe scripts `scripts/_*.sh` are gitignored.

### 5.4 Docs & hackathon fit

**Docs**
- `CLAUDE.md` is exemplary — 760 lines of decision history, exactly what a handoff doc should be.
- `DEPLOY.md` is a clean runbook.
- `plan.md` shows disciplined scope management (Days 5-8 absorbed scope without derailing).
- `README.md` has gaps: no live URL, no screenshots/GIFs, no "run locally" block, no LICENSE file
  (even though MIT is claimed). Fix all four before submission.

**Hackathon fit analysis**
- **Creativity** (6/10) — the tweet framed "video, image, audio, 3D, long-form writing, creative
  software, interactive media." Structural engineering is not traditionally "creative." This is
  our weakest axis on paper. Mitigation: reframe the video as disaster-prevention AI. Open with
  3-5 s of AFAD public Kahramanmaraş earthquake footage + title card; then cut to RebarGuard's
  live agent debate and 3D reveal. This reframes the category from "compliance tool" to "creative
  storytelling + serious tech."
- **Usefulness** (9/10) — real quantified stakes (missing rebar count, ₺ fraud estimate, % seismic
  capacity loss), real Turkish regulations, real Istanbul project, 19 real site photos. Only gap:
  the research-prototype status should be briefly disclosed in the video ("validated on 19 photos
  from one live project").
- **Presentation** (9/10) — `/styleguide` documents the design system; motion on `VerdictCinema`,
  `AgentRing`, `/demo` PatternSvgs are television-quality. 3D viewer rotates a 6-floor building
  with rebar highlights.
- **Kimi-track proof** — backend already tags every vision call with `moonshotai/kimi-k2.6` and
  the `ModelBadge` renders it on every debate bubble. Video only needs to linger on a debate feed
  for 2-3 seconds for automatic proof. Consider also adding a prominent model chip near the
  upload zone on `/quick`.
- **Hermes Agent visibility** — Hermes is not visible in-UI beyond footer text. Solution: include a
  10-second terminal overlay in the video showing a live `hermes chat -q ... --image ... --provider
  nous` subprocess call. This is the single highest-leverage edit for Main-Track positioning.

**Video-shoot readiness**
- Happy path end-to-end is real: `POST /api/demo/fistik` → `/inspection/new?project=<id>` →
  upload `fistik-10.jpg` → debate streams → REJECT/CONDITIONAL verdict. Tested on Day 4.
- Kimi latency (~60-90 s per call) needs handling: either 2x playback during the debate or
  pre-record the agent bubbles and voice-over live. DEPLOY.md already flags the Fly cold-start.
- Features to drop from video: multi-round debate (not built), Supabase (not built), role-based
  gating (not built). None of these were in scope; no need to explain absence.

---

## 6. Recommended Day-15 sequence (2026-04-28, ~6 hours of work)

**Hour 1 — Repo polish (can do in any order, batched)**
- Add `LICENSE` file (MIT).
- Rewrite `README.md`: live URL, 3 screenshots, 6-line "Run locally" block, Turkish-context
  gloss for TBDY/TS 500, badges (Next 16, FastAPI, Hermes Agent, Kimi K2.6, MIT).
- Delete `frontend/components/ThreeOverlay.tsx`.
- Remove `/agents` from `TopNav` OR build a minimal `/agents` showcase page.
- Fix `<img alt>` in `/quick`.
- Fix `ArticleModal` error render.
- Remove stale `QUICK_SCAN_PROMPT` module var (require `build_quick_scan_prompt()` callers only).
- Memoize `ClaudeBuildingViewer`.

**Hour 2 — Fly backend launch**
- `cd backend && fly launch --no-deploy --copy-config`
- `fly volumes create hermes_data --size 1 --region fra`
- `fly secrets set APP_CORS_ORIGINS=https://rebarguard.vercel.app`
- `fly deploy`
- `fly ssh console` → `hermes auth add nous --type oauth --no-browser` → browser approve → exit
- Smoke: `curl https://rebarguard-api.fly.dev/health` +
  `POST /api/demo/fistik` + `/api/regulations/TBDY%207.3.4.2`

**Hour 3 — Vercel env swap + regression test**
- Vercel dashboard → update `NEXT_PUBLIC_BACKEND_URL` to `https://rebarguard-api.fly.dev` across
  all three environments → redeploy.
- Open `https://rebarguard.vercel.app/demo` → seed Fıstık → `/inspection/new?project=<id>` →
  upload a photo → confirm SSE debate streams live end-to-end.
- Warm Fly with `curl /health` if it went cold between steps.

**Hour 4-5 — Demo video shoot (OBS 1080p, ~4-5 takes)**
1. 0:00-0:10 Kahramanmaraş framing + title card
2. 0:10-0:25 Landing hero + "Once concrete pours, the rebar is invisible"
3. 0:25-0:45 Terminal overlay of `hermes chat -q ... --image ... --provider nous -m moonshotai/kimi-k2.6`
4. 0:45-1:05 PDF upload → metadata auto-extract → 3D building reveal
5. 1:05-2:00 Site-photo upload → live debate (model badges visible) → VerdictCinema reveal
6. 2:00-2:30 `/quick` annotated scan → click REF badge → TBDY article modal (EN+TR toggle)
7. 2:30-2:50 `/demo` scenarios grid (approve / conditional / reject)
8. 2:50-3:00 Outro: "Hermes Agent + Kimi K2.6 · github.com/Himess/rebarguard"

**Hour 6 — Submit**
- Tweet video tagging `@NousResearch`, repo link, 3-sentence writeup.
- Cross-post in Nous Discord `#creative-hackathon-submissions`.

---

## 7. Go / no-go call

**Go.** Nothing in this audit is a show-stopper. The biggest risks are:

1. **Creative-axis framing** — mitigated by the Kahramanmaraş reframe in the first 10 seconds.
2. **Fly OAuth token expiry mid-demo** — mitigated by warming + completing the OAuth immediately
   before recording.
3. **Kimi call latency** — mitigated by 2x playback or voice-over edit.

None are technical; all are editorial. You're shipping a real product on real data against real
regulations, cleanly architected, GPG-verified, documented like a team project. The submission is
competitive for **Main Track top-3 + Kimi Track 1st**.

The one hour of repo polish (README + LICENSE + dead code cleanup + a11y fixes) is the single
highest-leverage edit before the video shoot. Do that first.
