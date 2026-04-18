"""CoverAgent — estimates concrete cover from a site photo with a reference marker."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rebarguard.agents._element_utils import concrete_cover_mm as expected_cover
from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, ConcreteCoverReport, StructuralElement
from rebarguard.vision.prompts import COVER_PROMPT


@dataclass
class CoverInput:
    element: StructuralElement
    photo: Path


class CoverAgent(BaseAgent[CoverInput, ConcreteCoverReport]):
    role = AgentRole.COVER

    async def run(self, payload: CoverInput) -> ConcreteCoverReport:
        parsed = await self.kimi.analyze_image(payload.photo, COVER_PROMPT)
        estimated = parsed.get("estimated_cover_mm")
        estimated_int = int(estimated) if isinstance(estimated, (int, float)) else None
        expected = expected_cover(payload.element)
        within = False
        if estimated_int is not None:
            within = abs(estimated_int - expected) <= 10

        severity = self._severity(estimated_int, expected)
        summary = parsed.get("summary") or (
            f"Concrete cover ~{estimated_int} mm (plan: {expected} mm)."
            if estimated_int is not None
            else "Concrete cover could not be estimated (no reference marker)."
        )
        return ConcreteCoverReport(
            element_id=payload.element.id,
            expected_cover_mm=expected,
            estimated_cover_mm=estimated_int,
            within_tolerance=within,
            severity=severity,
            summary=summary,
        )

    @staticmethod
    def _severity(estimated: int | None, expected: int) -> str:
        if estimated is None:
            return "medium"
        delta = abs(estimated - expected)
        if delta <= 5:
            return "low"
        if delta <= 10:
            return "medium"
        if delta <= 20:
            return "high"
        return "critical"
