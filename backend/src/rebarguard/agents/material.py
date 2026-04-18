"""MaterialAgent — detects rebar steel class + corrosion level via Kimi K2.5."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rebarguard.agents._element_utils import longitudinal_rebar
from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, MaterialReport, StructuralElement
from rebarguard.vision.prompts import MATERIAL_PROMPT


@dataclass
class MaterialInput:
    element: StructuralElement
    closeup_photo: Path


class MaterialAgent(BaseAgent[MaterialInput, MaterialReport]):
    role = AgentRole.MATERIAL

    async def run(self, payload: MaterialInput) -> MaterialReport:
        parsed = await self.kimi.analyze_image(payload.closeup_photo, MATERIAL_PROMPT)
        detected_class = parsed.get("detected_steel_class")
        corrosion = int(parsed.get("corrosion_level", 0) or 0)
        surface = parsed.get("surface_condition", "clean")
        expected_classes = {r.steel_class for r in longitudinal_rebar(payload.element)}

        class_ok = detected_class is None or not expected_classes or detected_class in expected_classes
        severity = self._severity(corrosion, class_ok)
        summary = parsed.get("summary") or self._default_summary(
            detected_class, corrosion, class_ok
        )

        return MaterialReport(
            element_id=payload.element.id,
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
        parts = [f"Steel class: {detected or 'unreadable'}."]
        if not class_ok:
            parts.append("Does not match the plan.")
        parts.append(f"Corrosion level {corrosion}/3.")
        return " ".join(parts)
