"""MunicipalityAgent — independent municipal-reviewer pass AFTER the Moderator.

Re-examines the Moderator's verdict through the lens of a seasoned public-safety inspector
from the belediye (municipality). If the Moderator underweighted a critical finding or was
too lenient on a high-risk project, this agent escalates.

Uses Hermes 4 70B for single-shot reasoning synthesis — same model family as the
Moderator, different role prompt.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import (
    AgentRole,
    AgentVerdict,
    ComplianceReport,
    ConcreteCoverReport,
    FraudReport,
    GeometryDiff,
    MaterialReport,
    ModeratorReport,
    MunicipalityReport,
    RiskReport,
)

_SYSTEM = """You are an independent municipal engineer (İnşaat Müh., TMMOB) reviewing a \
pour-approval package at the belediye office. Seven specialist AI inspectors have already \
reported, and a Moderator has issued a verdict. Your job is to SECOND-CHECK the Moderator \
with a public-safety lens.

Look for any of these:
- Did the Moderator underweight a critical finding (e.g., cover below TS 500 minimum)?
- Does the risk multiplier justify stricter action than taken?
- Are there contradictions across reports (e.g., geometry says OK but fraud says duplicate)?
- Does the narrative match the underlying numbers?

You have ONE of three recommendations:
- "uphold"   : Moderator's verdict is correct; pour can proceed as authorized.
- "downgrade": A condition/rejection Moderator issued was too strict; pour can proceed with
               a reduced remediation list.
- "escalate_to_human": The municipal engineer (human) must personally inspect before any
                       authorization is granted.

NEVER output 'uphold' for anything Moderator classified as REJECT. Only a human can overturn
a reject.

Respond ONLY as a single JSON object matching the schema — no markdown, no prose outside."""

_USER_TEMPLATE = """Original agent reports and Moderator verdict (JSON):

{bundle}

Produce output matching this schema exactly:
{{
  "verdict_agrees": true | false,
  "concerns": ["string"],
  "additional_requirements": ["string"],
  "recommendation": "uphold" | "downgrade" | "escalate_to_human",
  "narrative": "English, 2-4 sentences, municipal-engineer voice"
}}
"""


@dataclass
class MunicipalityInput:
    moderator: ModeratorReport
    geometry: GeometryDiff
    compliance: ComplianceReport
    fraud: FraudReport
    risk: RiskReport
    material: MaterialReport
    cover: ConcreteCoverReport
    session_tag: str | None = None


class MunicipalityAgent(BaseAgent[MunicipalityInput, MunicipalityReport]):
    role = AgentRole.MUNICIPALITY

    async def run(self, payload: MunicipalityInput) -> MunicipalityReport:
        bundle = {
            "moderator": payload.moderator.model_dump(),
            "geometry":  payload.geometry.model_dump(),
            "compliance": payload.compliance.model_dump(),
            "fraud":     payload.fraud.model_dump(),
            "risk":      payload.risk.model_dump(),
            "material":  payload.material.model_dump(),
            "cover":     payload.cover.model_dump(),
        }
        user = _USER_TEMPLATE.format(bundle=json.dumps(bundle, ensure_ascii=False, indent=2))

        raw = await self.hermes.json_complete(
            _SYSTEM,
            user,
            model=self.hermes.reasoning_model,
            max_tokens=900,
            temperature=0.2,
            skills=["moderate-inspection"],
            session_tag=payload.session_tag,
        )

        recommendation = raw.get("recommendation")
        if recommendation not in {"uphold", "downgrade", "escalate_to_human"}:
            recommendation = "escalate_to_human"

        # Safety: never 'uphold' a REJECT from Moderator
        if payload.moderator.verdict == AgentVerdict.REJECT and recommendation == "uphold":
            recommendation = "escalate_to_human"

        return MunicipalityReport(
            verdict_agrees=bool(raw.get("verdict_agrees", False)),
            concerns=list(raw.get("concerns") or []),
            additional_requirements=list(raw.get("additional_requirements") or []),
            recommendation=recommendation,  # type: ignore[arg-type]
            narrative=str(raw.get("narrative") or self._default_narrative(payload, recommendation)),
        )

    @staticmethod
    def _default_narrative(p: MunicipalityInput, rec: str) -> str:
        return (
            f"Municipal review of Moderator verdict {p.moderator.verdict.value.upper()} — "
            f"recommendation: {rec.replace('_', ' ')}."
        )
