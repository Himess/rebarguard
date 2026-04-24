"""ModeratorAgent — consumes all agent reports, drives a debate round, produces final verdict."""

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
    InspectionScore,
    MaterialReport,
    ModeratorReport,
    RiskReport,
)

_SYSTEM = """You are the Moderator of a multi-agent reinforced-concrete inspection system. \
Six specialist agents produced structured reports (geometry, compliance, fraud, risk, material, \
cover). Your job: read their outputs, call out critical issues first, and issue ONE final verdict.

Rules:
- You MUST output a single JSON object matching the provided schema. No markdown.
- Be strict. If fraud indicates duplicate photos OR geometry missing >=25% rebar OR code has 4+ \
violations → REJECT.
- CONDITIONAL if there are medium-severity issues that a human engineer must verify on site.
- APPROVE only when all agents report low severity and compliance has zero violations.
- Weight the score by the risk multiplier (higher multiplier → stricter scoring).
- Write the narrative in English, concise and suitable for a municipal engineer."""

_USER_TEMPLATE = """Agent reports (JSON):

{reports}

Produce output matching this schema exactly:
{{
  "verdict": "approve" | "conditional" | "reject",
  "score": {{
    "overall": 0-100,
    "geometry": 0-100,
    "compliance": 0-100,
    "fraud": 0-100,
    "risk": 0-100,
    "material": 0-100,
    "cover": 0-100
  }},
  "narrative": "English, 3-6 sentences, municipal-engineer audience",
  "critical_issues": ["string"],
  "recommendations": ["string"]
}}
"""


@dataclass
class ModeratorInput:
    geometry: GeometryDiff
    compliance: ComplianceReport
    fraud: FraudReport
    risk: RiskReport
    material: MaterialReport
    cover: ConcreteCoverReport
    session_tag: str | None = None


class ModeratorAgent(BaseAgent[ModeratorInput, ModeratorReport]):
    role = AgentRole.MODERATOR

    async def run(self, payload: ModeratorInput) -> ModeratorReport:
        reports = {
            "geometry": payload.geometry.model_dump(),
            "compliance": payload.compliance.model_dump(),
            "fraud": payload.fraud.model_dump(),
            "risk": payload.risk.model_dump(),
            "material": payload.material.model_dump(),
            "cover": payload.cover.model_dump(),
        }
        user = _USER_TEMPLATE.format(reports=json.dumps(reports, ensure_ascii=False, indent=2))
        # Use Hermes 4 70B reasoning model for verdict synthesis (hybrid thinking strength).
        # session_tag groups all sessions for one parcel under a single --source tag so the
        # audit trail is filterable (e.g., "give me every Moderator verdict for parcel X").
        raw = await self.hermes.json_complete(
            _SYSTEM,
            user,
            model=self.hermes.reasoning_model,
            max_tokens=1500,
            temperature=0.2,
            skills=["moderate-inspection"],
            session_tag=payload.session_tag,
        )

        verdict = self._parse_verdict(raw.get("verdict"))
        score_data = raw.get("score") or {}
        score = InspectionScore(
            overall=_clip(score_data.get("overall"), fallback=self._heuristic_overall(payload)),
            geometry=_clip(score_data.get("geometry"), fallback=self._heuristic_from(payload.geometry.severity)),
            compliance=_clip(score_data.get("compliance"), fallback=self._heuristic_from(payload.compliance.severity)),
            fraud=_clip(score_data.get("fraud"), fallback=self._heuristic_from(payload.fraud.severity)),
            risk=_clip(score_data.get("risk"), fallback=max(0, 100 - (payload.risk.risk_multiplier - 1) * 40)),
            material=_clip(score_data.get("material"), fallback=self._heuristic_from(payload.material.severity)),
            cover=_clip(score_data.get("cover"), fallback=self._heuristic_from(payload.cover.severity)),
        )
        return ModeratorReport(
            verdict=verdict,
            score=score,
            narrative=raw.get("narrative") or self._default_narrative(verdict, score),
            critical_issues=list(raw.get("critical_issues") or []),
            recommendations=list(raw.get("recommendations") or []),
        )

    @staticmethod
    def _parse_verdict(v: str | None) -> AgentVerdict:
        if v in {e.value for e in AgentVerdict}:
            return AgentVerdict(v)
        return AgentVerdict.CONDITIONAL

    @staticmethod
    def _heuristic_from(severity: str) -> float:
        return {"low": 90, "medium": 70, "high": 45, "critical": 15}.get(severity, 60)

    @classmethod
    def _heuristic_overall(cls, p: ModeratorInput) -> float:
        scores = [
            cls._heuristic_from(p.geometry.severity),
            cls._heuristic_from(p.compliance.severity),
            cls._heuristic_from(p.fraud.severity),
            cls._heuristic_from(p.material.severity),
            cls._heuristic_from(p.cover.severity),
        ]
        base = sum(scores) / len(scores)
        return max(0, min(100, base / p.risk.risk_multiplier))

    @staticmethod
    def _default_narrative(v: AgentVerdict, s: InspectionScore) -> str:
        verdict_label = {"approve": "APPROVE", "conditional": "CONDITIONAL", "reject": "REJECT"}[
            v.value
        ]
        return (
            f"Overall score {s.overall:.0f}/100. Verdict: {verdict_label}. "
            "See per-agent reports for detailed findings."
        )


def _clip(v, *, fallback: float) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        f = float(fallback)
    return max(0.0, min(100.0, f))
