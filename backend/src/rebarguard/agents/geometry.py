"""GeometryAgent — compares plan spec vs. vision-detected site rebar (any element type)."""

from __future__ import annotations

from dataclasses import dataclass

from rebarguard.agents._element_utils import (
    element_label,
    rebar_count,
    rebar_diameters,
    stirrup,
)
from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import (
    AgentRole,
    GeometryDiff,
    RebarDetection,
    StructuralElement,
)


@dataclass
class GeometryInput:
    element: StructuralElement
    detection: RebarDetection


class GeometryAgent(BaseAgent[GeometryInput, GeometryDiff]):
    role = AgentRole.GEOMETRY

    async def run(self, payload: GeometryInput) -> GeometryDiff:
        element = payload.element
        det = payload.detection

        expected_count = rebar_count(element)
        actual_count = det.detected_rebar_count
        missing = max(0, expected_count - actual_count)
        rebar_ok = expected_count > 0 and missing == 0 and actual_count == expected_count

        diameters = rebar_diameters(element)
        diameter_ok: bool | None = None
        if det.estimated_diameter_mm is not None and diameters:
            diameter_ok = det.estimated_diameter_mm in diameters

        stirrup_ok: bool | None = None
        st = stirrup(element)
        if st is not None and det.estimated_stirrup_spacing_mm is not None:
            tol = 25  # mm
            stirrup_ok = abs(det.estimated_stirrup_spacing_mm - st.spacing_mm) <= tol or (
                st.spacing_confinement_mm is not None
                and abs(det.estimated_stirrup_spacing_mm - st.spacing_confinement_mm) <= tol
            )

        severity = self._severity(missing, expected_count, diameter_ok, stirrup_ok)
        summary = self._summary(element, expected_count, actual_count, missing, diameter_ok, stirrup_ok)

        return GeometryDiff(
            element_id=element.id,
            element_type=element.element_type,
            rebar_count_expected=expected_count,
            rebar_count_actual=actual_count,
            rebar_count_ok=rebar_ok,
            diameter_ok=diameter_ok,
            spacing_ok=stirrup_ok,
            stirrup_ok=stirrup_ok,
            missing_rebar=missing,
            severity=severity,
            summary=summary,
        )

    @staticmethod
    def _severity(
        missing: int, expected: int, dia_ok: bool | None, stirrup_ok: bool | None
    ) -> str:
        if expected == 0:
            return "low"
        ratio = missing / expected
        if ratio >= 0.25 or dia_ok is False:
            return "critical"
        if ratio >= 0.12 or stirrup_ok is False:
            return "high"
        if ratio > 0:
            return "medium"
        return "low"

    @staticmethod
    def _summary(
        element: StructuralElement,
        expected: int,
        actual: int,
        missing: int,
        dia_ok: bool | None,
        stirrup_ok: bool | None,
    ) -> str:
        label = element_label(element)
        parts = [f"{label}: plan specifies {expected} rebars, site shows {actual}."]
        if missing:
            parts.append(f"{missing} missing.")
        if dia_ok is False:
            parts.append("Diameter does not match the plan.")
        if stirrup_ok is False:
            parts.append("Stirrup spacing does not match the plan.")
        if not missing and dia_ok is not False and stirrup_ok is not False and expected > 0:
            parts.append("Geometry matches the plan.")
        return " ".join(parts)
