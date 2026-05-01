# RebarGuard — Hermes Agent Creative Hackathon 2026 submission

## Twitter / X (≤280 chars)

> 🏗️ RebarGuard — pre-pour rebar inspection by 9 AI agents.
>
> Drop a site photo → Hermes 4 70B argues TBDY 2018 / TS 500, Kimi K2.6 sees the rebar, Municipality Agent gates the pour.
>
> Live: rebarguard.vercel.app
> Code: github.com/Himess/rebarguard
>
> @NousResearch #HermesAgent #Kimi

## Twitter — alternate longer thread (3 tweets)

**Tweet 1/3** (hook + demo)
> Once concrete pours, the rebar is invisible.
>
> RebarGuard runs 9 AI agents against the approved structural plan **before** each pour. Cover thickness, splice length, TBDY 2018 compliance — verified in under 60 seconds from site photos.
>
> Demo ↓

**Tweet 2/3** (stack)
> Stack:
> 🧠 Hermes Agent framework (Nous Research) — 9-agent orchestration, custom SKILL.md skills, parcel-scoped session memory
> 🔍 Kimi K2.6 (Moonshot) via Nous Portal — vision OCR + bbox bounding boxes + native video
> 📐 Hermes 4 70B — Moderator + Municipality counter-review + per-finding narrative
>
> $0 per call (Nous Portal Basic subscription path).

**Tweet 3/3** (links + CTA)
> Try it: rebarguard.vercel.app
> Code: github.com/Himess/rebarguard (MIT)
> Built for the Hermes Agent Creative Hackathon — @NousResearch + @MoonshotAI
>
> 🇹🇷 Inspired by Kahramanmaraş 2023 — 58 500 buildings collapsed, many with rebar on paper but not in formwork.

## Discord — `#creative-hackathon-submissions`

```
**RebarGuard — pre-pour rebar inspection multi-agent**

Hi all 👋  Submitting RebarGuard for the Hermes Agent Creative Hackathon, dual-track (Main + Kimi).

**What it does**
A construction-site supervisor uploads a structural-plan PDF and a few rebar-cage photos. Nine AI agents run in parallel:
- **PlanParser** (Kimi K2.6) — reads the approved Turkish statik proje
- **GeometryAgent** (rules + Hermes 4 70B narrative) — plan vs. site rebar diff
- **CodeAgent** (rules + Hermes 4 70B) — TBDY 2018 / TS 500 compliance
- **FraudAgent** — EXIF + reference-marker + hash dedup
- **SeismicRiskAgent** — AFAD zone × soil × floors
- **MaterialAgent** (Kimi K2.6) — steel class + corrosion
- **CoverAgent** (Kimi K2.6) — concrete cover via reference marker
- **Moderator** (Hermes 4 70B) — synthesizes verdict + 0–100 score
- **Municipality Agent** (Hermes 4 70B) — independent counter-review, gates pour authorization

**Demo:** https://rebarguard.vercel.app
**Code:** https://github.com/Himess/rebarguard (MIT, every commit GPG-signed and verified on GitHub)
**Video:** [link to YouTube/Twitter]

**Why this submission**
- Real-world stakes — earthquake-zone rebar fraud is the leading cause of building collapse in Turkey. The 2023 Kahramanmaraş quake destroyed 58 500 buildings; many had rebar on the structural drawing but not in the formwork.
- Different domain — most submissions will be chatbots / creative writing. Civic infrastructure / structural-engineering multi-agent is a fresh axis.
- Quantified output — "10 vertical bars missing, cover 18mm vs 50mm earth-contact spec, ×1.42 seismic risk multiplier, REJECTED 38/100" — concrete numbers, not vibes.
- Triple Nous showcase — Hermes Agent framework + Hermes 4 70B model + Nous Portal provider. All three on screen during the demo.

**Stack**
- Hermes Agent CLI v0.10.0 with 4 custom SKILL.md files (`parse-structural-plan`, `inspect-rebar`, `moderate-inspection`, `citizen-chat`)
- Kimi K2.6 (`moonshotai/kimi-k2.6`) for vision + agentic; Hermes 4 70B for reasoning
- $0 per call via Nous Portal Basic subscription path (`hermes chat -q ... --provider nous`)
- FastAPI + Pydantic v2 + asyncio + sse-starlette backend (Fly.io fra1)
- Next.js 16 + React 19 + Three.js + react-three-fiber frontend (Vercel)
- 16 curated TBDY 2018 / TS 500 articles in pgvector RAG with citation whitelist (no hallucinated codes)

**Citizen-flow bonus**
A Turkish homeowner under a *kat karşılığı* contract can `/watch` the same Kimi pipeline, get a 0–100 score, and have RebarGuard generate a CIMER petition PDF (Turkey's state complaint portal) ready to submit.

Happy to answer questions! Built solo over 16 days. Repo, designs, decision log all in the open at github.com/Himess/rebarguard.
```

## Submission timing

- **Video:** record between [time], upload to Twitter directly (1080p, ≤2:20 for Twitter native, full 3:00 to YouTube as backup link).
- **Tweet:** post the thread first; copy the demo link into the Discord post.
- **Discord:** drop in `#creative-hackathon-submissions` after the tweet is up so Nous team can find both.
- **Deadline:** 2026-05-03 EOD.

## Key URLs

| Surface | URL |
|---|---|
| Live frontend | https://rebarguard.vercel.app |
| Backend (Fly) | https://rebarguard-api.fly.dev |
| GitHub | https://github.com/Himess/rebarguard |
| Replay cockpit (1-click) | https://rebarguard.vercel.app/dashboard → ▶ Replay cockpit |
| Demo scenarios | https://rebarguard.vercel.app/demo |
| Quick scan | https://rebarguard.vercel.app/quick |
| Citizen Watch | https://rebarguard.vercel.app/watch |
| Agents map | https://rebarguard.vercel.app/agents |

## Stack one-liner (for slide deck)

> **Hermes Agent CLI** (subscription-backed) → **Kimi K2.6** vision + **Hermes 4 70B** reasoning → 9 specialist agents with rules + LLM narrative → Moderator → Municipality counter-review → human pour-approval.
