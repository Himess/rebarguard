# RebarGuard — Custom Hermes Agent Skills

Three `SKILL.md` files following the [agentskills.io](https://agentskills.io) standard
used by Hermes Agent. They provide domain instructions to the LLM when invoked via:

```bash
hermes chat -q "<prompt>" -s parse-structural-plan --image path/to.jpg
```

## Layout

```
skills/
  rebarguard/
    parse-structural-plan/SKILL.md     # Phase 1: PDF drawing → StructuralPlan JSON
    inspect-rebar/SKILL.md             # Phase 2: site photo → RebarDetection JSON
    moderate-inspection/SKILL.md       # Post-debate: 6 reports → final verdict
```

## Installing these skills into Hermes Agent

After `hermes login` succeeds, copy them into the CLI's skill directory:

```bash
# from WSL, at project root
cp -r skills/rebarguard ~/.hermes/skills/rebarguard
hermes skills list | grep rebarguard
```

Or, since Hermes loads skills by `-s <name>`, we pass `-s parse-structural-plan` and the
CLI resolves it by name.

## Notes

- These skills are **prompts, not code.** The LLM reads them as instructions and follows
  them. Our deterministic agents (Geometry, Fraud, Risk, etc.) stay as Python in the
  backend — they don't need SKILL.md files.
- Each SKILL.md's frontmatter `description` field is what `hermes skills search` indexes
  for discovery.
- Keep these files under version control alongside the backend — the skill contract and
  our Pydantic schemas must stay in sync.
