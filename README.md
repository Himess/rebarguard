# RebarGuard

Multi-agent AI inspector for reinforced-concrete construction. Photos in, compliance scores out. Gates concrete-pour approval against Turkish seismic codes (TBDY 2018 / TS 500).

Built on **[Hermes Agent](https://github.com/nousresearch/hermes-agent)** (Nous Research) + **[Kimi-VL](https://github.com/MoonshotAI/Kimi-VL)** (Moonshot) for the Hermes Agent Creative Hackathon 2026.

## The problem

In Turkey, concrete has rigorous on-site inspection (embedded chips, GPS-tracked core samples, engineer-authenticated photos). **Rebar does not.** Once concrete pours, the steel inside is invisible forever — and it's where earthquakes win or lose. Rebar theft, wrong spacing, missing stirrups, and undersized diameters are a silent structural risk.

## The system

1. Municipality-approved structural drawing (PDF) → **Kimi-VL** parses → structured plan JSON.
2. Contractor uploads site photos **before each pour** → **Kimi-VL** detects rebar layout.
3. **7 Hermes-orchestrated agents** debate: geometry diff, TBDY/TS500 compliance, fraud signals, seismic risk, material class, concrete cover, moderator.
4. Score + diff report + 3D overlay of plan vs. site → **pour gate** decision.

## Stack

- Orchestrator: Hermes Agent framework
- Reasoning: Hermes 4 70B (Nous Portal)
- Vision: Kimi-VL A3B (Moonshot)
- Backend: FastAPI
- Frontend: Next.js 16 + Three.js + Tailwind v4
- Storage: Supabase + pgvector

## Status

Work in progress. See `CLAUDE.md` and `plan.md` for the plan.

## License

MIT.
