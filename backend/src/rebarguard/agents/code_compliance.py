"""CodeAgent — TBDY 2018 / TS 500 compliance check via rule engine + RAG (Day 7)."""

from __future__ import annotations

from dataclasses import dataclass

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, ColumnSchema, ComplianceReport, RebarDetection


@dataclass
class CodeInput:
    column: ColumnSchema
    detection: RebarDetection
    earthquake_zone: str | None = None
    seismic_design_class: str = "DTS=1"


_MIN_REBAR_RATIO = 0.01
_MAX_REBAR_RATIO = 0.04
_MIN_STIRRUP_DIA_SEISMIC_MM = 10
_MAX_STIRRUP_SPACING_CONFINEMENT_MM = 100
_MAX_STIRRUP_SPACING_MIDDLE_MM = 200


class CodeAgent(BaseAgent[CodeInput, ComplianceReport]):
    role = AgentRole.CODE

    async def run(self, payload: CodeInput) -> ComplianceReport:
        col = payload.column
        passes: list[str] = []
        violations: list[str] = []
        articles: list[str] = []

        ratio = self._rebar_ratio(col)
        articles.append("TBDY 2018 §7.3.4 (column longitudinal rebar ratio)")
        if _MIN_REBAR_RATIO <= ratio <= _MAX_REBAR_RATIO:
            passes.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% within 1%–4% range.")
        elif ratio < _MIN_REBAR_RATIO:
            violations.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% < 1% minimum.")
        else:
            violations.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% > 4% maximum.")

        articles.append("TBDY 2018 §7.3.6 (transverse rebar — stirrup)")
        if col.stirrup.diameter_mm >= _MIN_STIRRUP_DIA_SEISMIC_MM:
            passes.append(f"Stirrup diameter Ø{col.stirrup.diameter_mm} ≥ Ø10 (seismic min).")
        else:
            violations.append(
                f"Stirrup diameter Ø{col.stirrup.diameter_mm} < Ø10 (seismic minimum)."
            )

        confinement = col.stirrup.spacing_confinement_mm or col.stirrup.spacing_mm
        if confinement <= _MAX_STIRRUP_SPACING_CONFINEMENT_MM:
            passes.append(
                f"Confinement-zone stirrup spacing {confinement} mm ≤ 100 mm."
            )
        else:
            violations.append(
                f"Confinement-zone stirrup spacing {confinement} mm > 100 mm."
            )

        if col.stirrup.spacing_mm <= _MAX_STIRRUP_SPACING_MIDDLE_MM:
            passes.append(f"Mid-zone stirrup spacing {col.stirrup.spacing_mm} mm ≤ 200 mm.")
        else:
            violations.append(f"Mid-zone stirrup spacing {col.stirrup.spacing_mm} mm > 200 mm.")

        if col.stirrup.hook_angle_deg >= 135:
            passes.append("Stirrup hook bent to 135°.")
        else:
            violations.append(
                f"Stirrup hook {col.stirrup.hook_angle_deg}° < 135° (seismic minimum)."
            )

        articles.append("TBDY 2018 §7.3.7 (crossties)")
        if col.stirrup.crossties >= 2:
            passes.append(f"Crosstie count {col.stirrup.crossties} ≥ 2.")
        else:
            violations.append(
                f"Crosstie count {col.stirrup.crossties} insufficient (≥ 2 recommended)."
            )

        if payload.detection.estimated_stirrup_spacing_mm is not None:
            actual = payload.detection.estimated_stirrup_spacing_mm
            if actual > col.stirrup.spacing_mm + 30:
                violations.append(
                    f"Site stirrup spacing {actual} mm exceeds plan spec "
                    f"{col.stirrup.spacing_mm} mm."
                )

        severity = self._severity(len(violations))
        base_summary = self._summary(col.id, len(passes), len(violations))

        # When there are violations, ask Hermes 4 70B for a concise narrative that explains
        # the seismic-safety implication in plain English (reasoning-model strength).
        summary = base_summary
        if violations:
            try:
                narrative = await self._hermes_narrative(col.id, violations, passes)
                if narrative:
                    summary = narrative
            except Exception:
                summary = base_summary

        return ComplianceReport(
            element_id=col.id,
            applicable_articles=articles,
            violations=violations,
            passes=passes,
            severity=severity,
            summary=summary,
        )

    async def _hermes_narrative(
        self, element_id: str, violations: list[str], passes: list[str]
    ) -> str | None:
        system = (
            "You are a senior structural engineer. In 2-3 clear English sentences, explain what "
            "the following TBDY 2018 violations mean for seismic safety of the column. "
            "Be concrete and specific. No markdown, no bullets."
        )
        user = (
            f"Column {element_id}\n"
            f"Violations:\n- " + "\n- ".join(violations) + "\n"
            f"Passing checks: {len(passes)}."
        )
        resp = await self.hermes.complete(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=self.hermes.reasoning_model,
            max_tokens=220,
            temperature=0.3,
        )
        text = (resp.get("content") or "").strip()
        return text or None

    @staticmethod
    def _rebar_ratio(col: ColumnSchema) -> float:
        import math

        total_area = 0.0
        for rs in col.longitudinal:
            r = rs.diameter_mm / 2.0
            total_area += rs.count * math.pi * r * r
        cross = col.width_mm * col.depth_mm
        return total_area / cross if cross else 0.0

    @staticmethod
    def _severity(n_violations: int) -> str:
        if n_violations == 0:
            return "low"
        if n_violations == 1:
            return "medium"
        if n_violations <= 3:
            return "high"
        return "critical"

    @staticmethod
    def _summary(element_id: str, n_pass: int, n_fail: int) -> str:
        if n_fail == 0:
            return f"Column {element_id}: TBDY 2018 compliant across {n_pass} checks."
        return f"Column {element_id}: {n_fail} violation(s), {n_pass} passing check(s)."
