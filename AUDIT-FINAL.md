# RebarGuard — Final Pre-Submission Audit (T-24h)

> Single-pass audit conducted 2026-05-01 ahead of the Hermes Agent Creative
> Hackathon submission deadline 2026-05-03 EOD. Read-only audit; no code changes.
> Cuts to the bone: ship-stoppers first, polish second.

## Executive summary

**Ship as-is with three quick P0 fixes (≤1h total).** The repo is in genuinely
good shape — backend is sane, frontend is dense and on-brand, deploy state is
green, sample assets are thoughtful, and the Hermes-framework usage is the
deepest of any single submission you could plausibly point at (4 SKILL.md +
parcel-scoped `--resume` memory + `--source` audit trail + lifecycle hooks +
MCP server + cron). Two P0s are documentation lies that judges can verify (OG
image 404, "8 agents" vs "9 agents" copy mismatch, hooks-flag claim that the
bridge doesn't actually pass). Nothing in here is structural; nothing requires
"major surgery".

The Kimi-track proof and Hermes-framework-depth are both already strong. The
real risk is **the unrecorded video** — every P1/P2 below is dwarfed by the
fact that Tasks #41 + #42 are still pending.

---

## P0 — Fix today (each ≤30 min)

### P0-1 · OG image is a dangling URL — every social preview will 404
- **What:** `frontend/app/layout.tsx:19` sets `OG_IMAGE = ${SITE_URL}/og.png`.
  There is no `og.png` in `frontend/public/`. Next.js auto-generates an OG image
  from `frontend/app/opengraph-image.tsx`, which is served at
  `/opengraph-image` (not `/og.png`). The `metadata.openGraph.images[0].url`
  and `metadata.twitter.images[0]` both point at a 404.
- **Why it matters:** when you tweet the submission tagging `@NousResearch`,
  the X-card preview will be a broken image. First impression to the judges.
  Also breaks Discord and LinkedIn unfurls.
- **Fix:** delete the `OG_IMAGE` constant and the explicit `images: [...]`
  blocks. Next.js's auto-detection of `app/opengraph-image.tsx` does the right
  thing by itself. Time budget: **15 min**, including a Vercel redeploy.

### P0-2 · "8 AGENTS" copy contradicts the "9 AI agents" pitch
- **What:** `frontend/app/inspection/new/page.tsx:505` reads `EST. 38s · 8
  AGENTS · SUBSCRIPTION`. The same page's stats banner, the README, the
  SUBMISSION text, the OG image, the AgentRing component, and the entire pitch
  all say **9** agents.
  - Same issue: `frontend/components/DebateStream.tsx:16` defaults `total = 8`.
    Inspection page passes `total={AGENTS.length}` (= 9) so the visible
    counter is correct, but the default is wrong and a future caller will
    inherit it.
- **Why it matters:** the Belediye / Municipality agent is the single highest
  creativity-axis differentiator (independent municipal counter-review with a
  hard "cannot uphold a REJECT" rail) — it's literally agent #9. Showing "8
  AGENTS" in the cockpit pitch text undercuts that differentiator and looks
  like a copy-paste error a judge will notice in 5 seconds of pause.
- **Fix:** change `8 AGENTS` → `9 AGENTS` on line 505 and `total = 8` →
  `total = 9` (or `AGENTS.length`) in `DebateStream.tsx`. Time budget: **5 min**.

### P0-3 · Dockerfile claims `--accept-hooks` flag the bridge never passes
- **What:** `backend/Dockerfile:93-95` comment claims hooks fire "via the
  `--accept-hooks` flag we pass on every `hermes chat` from the bridge."
  `backend/src/rebarguard/hermes_runtime/bridge.py` does not pass any
  `--accept-hooks` argument; grep `--accept-hooks` across `backend/src` returns
  nothing. The actual mechanism is `hooks_auto_accept: true` declared in
  `backend/hermes-config/cli-config.yaml` plus `HERMES_ACCEPT_HOOKS=1` in
  `fly.toml`. Both are valid; the comment is just lying about how it works.
  Also `fly.toml:20` env name `HERMES_ACCEPT_HOOKS` is not actually read by
  anything in our code — Hermes Agent itself may consume it, but this is not
  documented in the bridge.
- **Why it matters:** if a judge clones the repo and `grep`s for the claimed
  flag, they hit a contradiction. Low-stakes for the visible product but
  high-stakes for the "framework usage depth" pitch — the `/audit` page is
  being sold as proof that hooks fire on real calls, so the integrity of how
  hooks get accepted matters.
- **Fix:** rewrite the Dockerfile comment to point at `cli-config.yaml`'s
  `hooks_auto_accept: true` + `HERMES_ACCEPT_HOOKS=1`. Or better, also have
  the bridge pass `--accept-hooks` on every call so the comment is truthful.
  Time budget: **15 min** for the comment-only fix; **30 min** if you also
  add the flag.

---

## P1 — Should fix, polish (each 15-60 min)

### P1-1 · "v0.8 · BETA" chip on landing is stale
- **What:** `frontend/app/page.tsx:44` shows `<span className="chip">v0.8 ·
  BETA</span>`. The pyproject says `0.1.0`. CLAUDE.md never references a v0.8.
- **Why it matters:** Looks like placeholder text a judge will catch.
- **Fix:** change to `v0.1 · DEMO` or remove. **5 min**.

### P1-2 · Inspection page upload zone advertises DWG + HEIC, backend rejects DWG
- **What:** `frontend/app/inspection/new/page.tsx:437` reads `PDF · DWG · HEIC ·
  JPG`. The file `<input>` accepts only `image/*`. Backend
  `routers/inspections.py:40` whitelist is `{.jpg, .jpeg, .png, .webp, .heic}`.
  DWG isn't supported anywhere; the upload page itself elsewhere correctly
  tells DWG users to plot to PDF.
- **Why it matters:** if a judge tries to drag a DWG, browser filters it out
  silently — confusing.
- **Fix:** change copy to `JPG · PNG · HEIC · WEBP`. **2 min**.

### P1-3 · Quick-scan page has two disabled-button decorative ghosts
- **What:** `frontend/app/quick/page.tsx:132-138` shows two buttons hard-coded
  `disabled`: "Export report" and "Promote to full inspection →". Visible but
  non-functional in every demo recording.
- **Why it matters:** judges read disabled-but-prominent buttons as "scope
  cut", which weakens the polish score. Worse, the second one ("Promote to
  full inspection") is the one feature you'd most want to claim works.
- **Fix:** either wire the click to redirect to `/inspection/new?promote=true`
  with the photo file in `sessionStorage`, or just delete both buttons.
  **15 min** to delete, ~45 min to wire promote-flow.

### P1-4 · Citizen-chat page exposes a private memory module method
- **What:** `backend/src/rebarguard/routers/chat.py:198-202` does
  `with memory_mod._LOCK: ... memory_mod._read_all() ... memory_mod._write_all()`
  — reaching into private (`_`-prefixed) helpers from another module. The
  in-line comment acknowledges it ("doesn't expose a delete primitive; use the
  stored dict directly"). Subtle race risk, also brittle to memory.py refactor.
- **Why it matters:** it works, but a code-review judge auditing for
  engineering hygiene flags this immediately. Low-stakes for hackathon scoring;
  fix while you can.
- **Fix:** add `forget_session(parcel_tag)` to
  `backend/src/rebarguard/hermes_runtime/memory.py` and call that from the
  chat router. **20 min**.

### P1-5 · `_extract_session_id` regex needs a literal trailing newline
- **What:** `backend/src/rebarguard/hermes_runtime/bridge.py:91` regex
  `r"^\s*session_id:\s*([\w\-]+)\s*$"` runs in MULTILINE mode but tests
  haven't been written for it. `_session_tag_for` slugifies the parcel_no
  with replace-anything-non-alphanumeric — Turkish characters become `-`s,
  consecutive replacements collapse fine, but `parcel_no="1340 ADA 43 PARSEL"`
  produces `1340-ada-43-parsel` (good).
- **Why it matters:** doesn't matter — works as-is, just untested. Mention
  only because the audit log filtering by `--source rebarguard:<parcel>` is
  pitched as an audit primitive in the README.
- **Fix:** none required. Skip.

### P1-6 · MCP `replay_scenario` tool returns a placeholder cockpit URL
- **What:** `backend/src/rebarguard/mcp/server.py:240` returns
  `cockpit_url: "https://rebarguard.vercel.app/inspection/new?project=<seed_fistik_demo first>&replay={scenario}"`
  — that literal `<seed_fistik_demo first>` text is not a placeholder
  variable, it's the response body. An MCP client following this URL gets a
  broken page.
- **Why it matters:** The MCP server is your highest-impact "framework
  primitive" claim in the SUBMISSION text. If a judge tests it (which they
  might — it's a 30-second `npx @modelcontextprotocol/inspector` call) and
  this tool returns gibberish, your MCP claim is weaker.
- **Fix:** drop `cockpit_url` from the response, or generate a real URL by
  having `replay_scenario` call `seed_fistik_demo` itself and return the
  resulting project id. **20 min**.

### P1-7 · SUBMISSION.md says "4 SKILL.md" but mentions `citizen-chat` only as a "bonus"
- **What:** `SUBMISSION.md:69` lists "4 custom SKILL.md files" including
  `citizen-chat`. The Twitter "Tweet 2/3" says only "4 custom SKILL.md".
  README.md table says 3 (`parse-structural-plan`, `inspect-rebar`,
  `moderate-inspection`). `backend/skills/rebarguard/` has 4 directories;
  `citizen-chat` is real.
- **Why it matters:** a judge reading both docs sees an inconsistency. README
  is the public-facing one — that's where the discrepancy hurts most.
- **Fix:** README.md "what we actually use" section: add `citizen-chat` to
  the SKILL.md list. **5 min**.

### P1-8 · TopNav has 10 items at narrow widths it'll horizontal-scroll
- **What:** `frontend/components/TopNav.tsx:7-18` has 10 nav links (Home,
  Projects, Inspections, Quick Scan, Video, Citizen Watch, Chat, Demo,
  Agents, Audit). Each is `padding: '6px 10px', fontSize: 13` — total ~600px
  before logo + right-side controls. On a 1280×720 demo recording this is
  fine; on judge's laptop in a side-by-side window it'll wrap or crowd.
- **Why it matters:** demo video shoots at 1080p so this won't show, but if
  the judges open the live URL on a 13" laptop the nav looks crowded.
- **Fix:** consolidate "Citizen Watch" + "Chat" into a single "Citizen" item
  with a subnav, or hide "Audit" / "Demo" at narrow widths. **30 min**.
  Alternatively: skip — this is hackathon-acceptable.

### P1-9 · `municipality.py` system prompt says "Seven specialist AI inspectors"
- **What:** `backend/src/rebarguard/agents/municipality.py:32` system prompt
  reads "Seven specialist AI inspectors have already reported". Should be
  six (geometry, code, fraud, risk, material, cover) or "the specialist
  inspectors". The Moderator's prompt (`moderator.py:22`) correctly says
  "Six specialist agents".
- **Why it matters:** invisible to judges (it's an LLM system prompt) but
  technically wrong and could subtly confuse the model.
- **Fix:** change "Seven" → "Six". **2 min**.

### P1-10 · CLAUDE.md is stale on snapshot date
- **What:** `CLAUDE.md:9` says "Snapshot (2026-04-21 evening)". Current date
  is 2026-05-01. Most of the substance below is current (Day 14.6, 15, 15.5,
  15.6 all later); just the snapshot stamp is stale.
- **Why it matters:** if a judge reads CLAUDE.md (it's linked from the README
  repo map) and sees "2026-04-21 evening" — feels stale.
- **Fix:** bump the snapshot stamp. **2 min**.

---

## P2 — Nice-to-have (skip if you have to)

### P2-1 · OG image only renders 8 agents
- `frontend/app/opengraph-image.tsx:14-23` lists 8 agents in the ring (no
  BLD/Municipality). Center reads "9". Self-contradicting on the same image.
  Fix: either add a 9th node at e.g. (470, 95) or change center to "8" — but
  "9" is the right pitch number, so add the 9th node. **15 min**.

### P2-2 · `frontend/package.json` doesn't pin a Node engine
- No `"engines": { "node": ">=20" }`. Vercel auto-detects but a future Node
  bump on Vercel could break the build silently. Add the engines field.
  **2 min**.

### P2-3 · `replay_scenario` MCP tool description says "9-agent" but
  scenario JSON files might have other event counts
- The replay file `fistik_reject.json` has `event_count >= 9` per the test;
  the description is fine. Skip.

### P2-4 · `complaints.py` has a forward-reference issue
- `backend/src/rebarguard/routers/complaints.py:35` declares
  `_COMPLAINTS: dict[str, ComplaintRecord] = {}` BEFORE `class ComplaintRecord`
  is defined (line 64). At module import this is a NameError waiting to
  happen; works only because Python annotations are deferred and the dict is
  empty until first .post(). With `from __future__ import annotations` at
  line 18, the annotation is a string — so this passes import. Confirmed not
  a runtime bug but is technically a forward-ref smell. **Skip.**

### P2-5 · No tests for the MCP server
- `backend/src/rebarguard/mcp/server.py` is brand-new (per task description)
  and has zero tests. CI would catch syntax errors but not protocol-level
  regressions. Could add a smoke test that spins up the stdio server, sends
  `tools/list`, asserts 5 tools back. **45 min**. Skip for hackathon.

### P2-6 · `frontend/lib/api.ts` has a comment referencing `// ----- demo replay`
  that immediately precedes the `// ----- citizen chat` block — empty section.
- Cosmetic. **Skip**.

### P2-7 · ReplayDemoButton doesn't handle backend-down state
- I didn't read its source but `dashboard/page.tsx:64` includes it
  unconditionally; if the user clicks it while the backend is suspended on
  Fly, the seed call cold-starts (~3s) before the SSE replay can launch —
  which is exactly what replay was supposed to avoid. Solution: warm `/health`
  on dashboard mount. **15 min**. Skip — unlikely in demo recording.

---

## Backend deep-dive — quick verdicts

- **Agent orchestration (`services/inspection.py`)** — clean, async, parallel
  fan-out via `asyncio.gather`. Adversarial cross-examination round (Day 16
  `_cross_examine`) is genuinely creative and degrades silently on Hermes
  failure. Session tagging + `--resume` memory threading is correct. No bugs
  found.
- **Routers** — every route correctly uses `_STORE_LOCK`, has size limits, uses
  `uuid4().hex` for tempfile names, validates suffixes. The chat router's
  private-method reach (P1-4) is the only real wart.
- **Bridge (`hermes_runtime/bridge.py`)** — correct model-routing, correct
  WSL path translation, correct timeout handling. The session_id extraction
  regex is sane.
- **MCP server (NEW)** — uses `mcp>=1.0.0` (in pyproject + uv.lock). Stdio
  loop is canonical. Tool schemas look right. P1-6 placeholder URL is the
  only bug.
- **Tests** — 21 tests, ruff-clean, all router routes exercised. CI runs in
  `direct` mode without API keys. Adequate for hackathon.

## Frontend deep-dive — quick verdicts

- **Pages** — 12 routes, each densely styled, consistent OKLCH palette.
  `/inspection/new` is the cinematic centerpiece; replay path is wired and
  works. `/quick`, `/watch`, `/chat`, `/video` all have offline fallbacks.
  `/dashboard`, `/demo`, `/agents`, `/audit`, `/styleguide`, `/upload`,
  `/inspection/new` (live + replay) all visited cleanly in code review.
- **Components** — `ClaudeBuildingViewer` memoized correctly, `VerdictCinema`
  reveal animation is polished, `DebateStream` correct except for the
  `total = 8` default (P0-2). `SamplePicker` strips work. `ArticleModal`
  exists and renders error state.
- **API client (`lib/api.ts`)** — handles SSE CRLF normalization correctly
  (the Day 16 evening fix for Fly's `\r\n` separator). All endpoints typed.
  `BACKEND_URL` falls back to `http://localhost:8000`.
- **Console errors likely?** No browser-console errors expected from code
  review. The dashboard backend-down case shows a friendly OFFLINE badge.
  Quick-scan and Watch return-to-empty-on-error rather than crashing.

## Deploy state

- **Vercel:** auto-deploy from `main` enabled per CLAUDE.md (note: chronic
  fail per overview doc — manual `vercel --prod --yes` workaround). vercel.json
  set fra1 region, security headers, pnpm install. Looks fine.
- **Fly.io:** Dockerfile installs Hermes CLI to `/opt/hermes-agent`, symlinks
  OAuth state to `/data/hermes` volume, copies skills + cli-config.yaml. CRLF
  scrubbed via `sed` (.gitattributes also pins LF). `fly.toml` has health-check
  on `/health`, auto-suspend on, hard-limit 40 concurrent requests, 1 CPU /
  1 GB. Sane for a hackathon-scale demo.
- **CI** — `.github/workflows/ci.yml` runs ruff + pytest + frontend
  typecheck + build on every push and PR. Backend job sets
  `HERMES_RUNTIME=direct` so the CLI isn't needed. Solid.
- **Anything that'll break at submission time?** Two concerns:
  1. **OG image 404 (P0-1)** — confirmed broken.
  2. **Vercel auto-deploy may need a manual nudge** — per the overview doc,
     git push fails to trigger reliable redeploy. After the P0 fixes you'll
     want `vercel --prod --yes` to be sure the fixes land.

## Docs consistency

- README is comprehensive and current. Two minor warts:
  - "what we actually use" table for Hermes lists 8 primitives (SKILL,
    subscription, --source, --resume, subagent parallelism, hooks, cron,
    plugins, MCP) — the **plugins** entry honestly admits "no third-party
    plugins are hard-coded". Good — honest. Keep.
  - Skill count discrepancy with SUBMISSION (P1-7).
- CLAUDE.md is the source of truth, snapshot stamp stale (P1-10).
- SUBMISSION.md is well-pitched. The Twitter thread is sharp. No URL bugs.
  The "MCP server bonus" callout is a strong differentiator.
- DEPLOY.md, AUDIT.md, AUDIT-V2.md, AUDIT-V3.md, plan.md all exist; I didn't
  re-audit them — they're internal artefacts judges won't read.

## Hackathon fit / claims integrity

- "9 agents" — claimed everywhere, mostly correctly (P0-2 contradiction is
  the only break).
- "Hermes Agent framework" — genuine, deep usage. SKILL.md, --source,
  --resume, hooks, MCP, cron all real. This is your strongest pitch.
- "Kimi K2.6" — real model id appears in:
  - `/quick` top-bar `MODEL · {model}` chip — visible in <3 s
  - Every inspection AgentMessage `evidence.model` field
  - Landing-page "KIMI K2.6 · VISION" chip
  - `/agents` cards, `/styleguide`, OG image, README badges, audit log
  - `_KIMI_MODEL_TAG = "moonshotai/kimi-k2.6"` in `services/inspection.py`
  Kimi-track eligibility is rock-solid.
- "Quantified output" — Moderator emits 0-100 score across 7 categories,
  REJECT/CONDITIONAL/APPROVE verdicts, EN+TR literary narrative. Real.
- "Subscription-backed, $0/call" — bridge routes through `--provider nous`
  on every call. Real. Video is the only Moonshot direct fallback (and
  gracefully degrades to canned transcript when no key set).

## Hermes Agent framework usage — what else could you mention?

Already mentioned (and real): SKILL.md, --source, --resume, hooks
(`cli-config.yaml`), MCP server, cron jobs, subagent parallelism (asyncio
fan-out), plugins (registrar only).

You're **not underselling** the framework — if anything you're slightly over,
since the cron + plugins integrations are scaffolding-only. The honest pitch
is what's in `rebarguard-overview.md` Section 11: ~50% framework + 50% model
proxy. README's "what we actually use" table is the right level of honesty.

One additional callable hook you could mention but currently don't: the bridge
sets `--source rebarguard:tool` for ad-hoc programmatic calls vs.
`rebarguard:<parcel>` for parcel-bound calls. That's a real audit-trail
primitive. Already in the README, but you could elevate it to the SUBMISSION
text as a separate bullet.

## Sample assets

- `frontend/public/sample-media/photos/` — 12 JPGs, real Fıstık project,
  hosted via `next dev` and Vercel `/public/`.
- `frontend/public/sample-media/videos/` — 3 MP4s, 3-8 s each.
- `frontend/public/sample-media/structural/fistik-sample-statik.pdf` — 1
  synthetic PDF.
- `lib/sample-media.ts` correctly references all three. `SamplePicker`
  components fetch them as `File` blobs and feed them to the upload flow.
- `data/sample_projects/` (NOT served by frontend) has 4 PDFs that aren't
  plumbed in — those are dev artifacts.

**No issues.** Twelve photos is the right number; three videos cover the
range; synthetic PDF is honestly labeled as such in the upload page.

---

## Recommended action sequence (T-24h)

1. **Fix P0-1 (OG image), P0-2 (8→9 agents), P0-3 (Dockerfile comment)** — 30
   min total.
2. **Quick P1 sweep:** P1-1 (v0.8 chip), P1-2 (DWG copy), P1-7 (README skill
   count), P1-9 (Six/Seven prompt), P1-10 (CLAUDE.md stamp) — 20 min total.
3. **Deploy:** push to GitHub, force `vercel --prod --yes`, wait for
   `rebarguard.vercel.app` to reflect.
4. **Smoke test the live URL** — open landing, /dashboard, click
   "▶ Replay cockpit", watch the 9-agent debate stream end-to-end. Confirm
   `/quick` `MODEL · moonshotai/kimi-k2.6` chip is visible.
5. **Record the demo video** (Task #41).
6. **Submit** (Task #42).

If you have to skip step 2, you ship anyway. If you have to skip step 1,
you'll regret it the moment you tweet.

---

**Final verdict: ship. Not embarrassing.** The P0s are real but tiny. The
product is denser, more polished, and more framework-integrated than 90% of
what the judges will see. Get the video recorded.
