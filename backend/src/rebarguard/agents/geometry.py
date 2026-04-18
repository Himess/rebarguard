"""GeometryAgent — compares plan spec vs. Kimi-VL site detection."""

from __future__ import annotations

from dataclasses import dataclass

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import (
    AgentRole,
    ColumnSchema,
    GeometryDiff,
    RebarDetection,
)


@dataclass
class GeometryInput:
    column: ColumnSchema
    detection: RebarDetection


class GeometryAgent(BaseAgent[GeometryInput, GeometryDiff]):
    role = AgentRole.GEOMETRY

    async def run(self, payload: GeometryInput) -> GeometryDiff:
        column = payload.column
        det = payload.detection

        expected_count = sum(rs.count for rs in column.longitudinal)
        actual_count = det.detected_rebar_count
        missing = max(0, expected_count - actual_count)
        rebar_ok = missing == 0 and actual_count == expected_count

        expected_diameters = sorted({rs.diameter_mm for rs in column.longitudinal})
        diameter_ok: bool | None = None
        if det.estimated_diameter_mm is not None:
            diameter_ok = det.estimated_diameter_mm in expected_diameters

        stirrup_ok: bool | None = None
        if det.estimated_stirrup_spacing_mm is not None:
            tol = 25  # mm
            stirrup_ok = (
                abs(det.estimated_stirrup_spacing_mm - column.stirrup.spacing_mm) <= tol
                or (
                    column.stirrup.spacing_confinement_mm is not None
                    and abs(
                        det.estimated_stirrup_spacing_mm - column.stirrup.spacing_confinement_mm
                    )
                    <= tol
                )
            )

        severity = self._severity(missing, expected_count, diameter_ok, stirrup_ok)
        summary = self._summary(
            column.id, expected_count, actual_count, missing, diameter_ok, stirrup_ok
        )
        return GeometryDiff(
            element_id=column.id,
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
        eid: str,
        expected: int,
        actual: int,
        missing: int,
        dia_ok: bool | None,
        stirrup_ok: bool | None,
    ) -> str:
        parts = [f"Kolon {eid}: projede {expected} donatı, sahada {actual}."]
        if missing:
            parts.append(f"{missing} adet eksik.")
        if dia_ok is False:
            parts.append("Çap uyumsuz.")
        if stirrup_ok is False:
            parts.append("Etriye aralığı uyumsuz.")
        if not missing and dia_ok is not False and stirrup_ok is not False:
            parts.append("Geometri uyumlu.")
        return " ".join(parts)
