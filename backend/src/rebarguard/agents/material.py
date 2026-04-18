"""MaterialAgent — detects rebar steel class and corrosion level via Kimi K2.5."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, ColumnSchema, MaterialReport
from rebarguard.vision.prompts import MATERIAL_PROMPT


@dataclass
class MaterialInput:
    column: ColumnSchema
    closeup_photo: Path


class MaterialAgent(BaseAgent[MaterialInput, MaterialReport]):
    role = AgentRole.MATERIAL

    async def run(self, payload: MaterialInput) -> MaterialReport:
        parsed = await self.kimi.analyze_image(payload.closeup_photo, MATERIAL_PROMPT)
        detected_class = parsed.get("detected_steel_class")
        corrosion = int(parsed.get("corrosion_level", 0) or 0)
        surface = parsed.get("surface_condition", "clean")
        expected_classes = {rs.steel_class for rs in payload.column.longitudinal}

        class_ok = detected_class is None or detected_class in expected_classes
        severity = self._severity(corrosion, class_ok)
        summary = parsed.get("summary") or self._default_summary(
            detected_class, corrosion, class_ok
        )

        return MaterialReport(
            element_id=payload.column.id,
            detected_steel_class=detected_class,
            corrosion_level=corrosion,
            surface_condition=surface if surface in {"clean", "light_rust", "flaking", "pitting"} else "clean",
            severity=severity,
            summary=summary,
        )

    @staticmethod
    def _severity(corrosion: int, class_ok: bool) -> str:
        if not class_ok or corrosion >= 3:
            return "critical"
        if corrosion == 2:
            return "high"
        if corrosion == 1:
            return "medium"
        return "low"

    @staticmethod
    def _default_summary(detected: str | None, corrosion: int, class_ok: bool) -> str:
        parts = []
        parts.append(f"Steel class: {detected or 'unreadable'}.")
        if not class_ok:
            parts.append("Does not match the plan.")
        parts.append(f"Corrosion level {corrosion}/3.")
        return " ".join(parts)
