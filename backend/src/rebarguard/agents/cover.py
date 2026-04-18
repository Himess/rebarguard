"""CoverAgent — estimates paspayı (concrete cover) from site photo with a reference marker."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, ColumnSchema, ConcreteCoverReport
from rebarguard.vision.prompts import COVER_PROMPT


@dataclass
class CoverInput:
    column: ColumnSchema
    photo: Path


class CoverAgent(BaseAgent[CoverInput, ConcreteCoverReport]):
    role = AgentRole.COVER

    async def run(self, payload: CoverInput) -> ConcreteCoverReport:
        parsed = await self.kimi.analyze_image(payload.photo, COVER_PROMPT)
        estimated = parsed.get("estimated_cover_mm")
        estimated_int = int(estimated) if isinstance(estimated, (int, float)) else None
        expected = payload.column.concrete_cover_mm
        within = False
        if estimated_int is not None:
            within = abs(estimated_int - expected) <= 10

        severity = self._severity(estimated_int, expected)
        summary = parsed.get("summary") or (
            f"Paspayı ~{estimated_int} mm (proje: {expected} mm)."
            if estimated_int is not None
            else "Paspayı tahmini yapılamadı (referans işareti yok)."
        )
        return ConcreteCoverReport(
            element_id=payload.column.id,
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
