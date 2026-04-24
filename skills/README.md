# RebarGuard — Custom Hermes Agent Skills

> **Canonical location:** `backend/skills/rebarguard/`
> These `SKILL.md` files used to live at `skills/rebarguard/` but were moved under
> `backend/` so they ship inside the Fly Docker image (build context is `backend/`).
> See `backend/Dockerfile` — the image copies them to `/opt/hermes-skills/` and
> the entrypoint symlinks `/root/.hermes/skills → /opt/hermes-skills` so
> `hermes chat -s <skill-name>` resolves at runtime.

Three skills ship with RebarGuard, following the
[agentskills.io](https://agentskills.io) standard that Hermes Agent consumes:

```
backend/skills/rebarguard/
  parse-structural-plan/SKILL.md     # Phase 1: PDF drawing → StructuralPlan JSON
  inspect-rebar/SKILL.md             # Phase 2: site photo → RebarDetection JSON
  moderate-inspection/SKILL.md       # Post-debate: 6 reports → final verdict
```

## How the skills are invoked at runtime

Every agent that calls into Kimi / Hermes threads a `skills=[...]` argument to the
`HermesCLIBridge`, which appends `-s <skill-name>` to the spawned `hermes chat`
subprocess:

| Python call site | Skill |
|---|---|
| `agents/plan_parser.py` — `kimi.analyze_image(...)` | `parse-structural-plan` |
| `agents/material.py` — `kimi.analyze_image(...)` | `inspect-rebar` |
| `agents/cover.py` — `kimi.analyze_image(...)` | `inspect-rebar` |
| `services/inspection.py` — `kimi.analyze_image(REBAR_DETECT_PROMPT, ...)` | `inspect-rebar` |
| `routers/quick.py` — `kimi.analyze_image(...)` | `inspect-rebar` |
| `agents/moderator.py` — `hermes.json_complete(...)` | `moderate-inspection` |
| `agents/municipality.py` — `hermes.json_complete(...)` | `moderate-inspection` |
| `agents/code_compliance.py` — `hermes.complete(...)` | `moderate-inspection` |

## Notes

- These skills are **prompts, not code.** The LLM reads them as instructions and follows
  them. Our deterministic agents (Geometry, Fraud, Risk) stay as Python in the backend —
  they don't need SKILL.md files.
- Each SKILL.md's frontmatter `description` field is what `hermes skills search` indexes
  for discovery.
- Keep these files under version control alongside the backend — the skill contract and
  our Pydantic schemas must stay in sync.
