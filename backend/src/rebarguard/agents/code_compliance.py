"""CodeAgent — TBDY 2018 / TS 500 compliance (multi-element-aware)."""

from __future__ import annotations

import math
from dataclasses import dataclass

from rebarguard.agents._element_utils import (
    cross_section_area_mm2,
    element_label,
    longitudinal_rebar,
    stirrup,
)
from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import (
    AgentRole,
    ColumnSchema,
    ComplianceReport,
    RebarDetection,
    StructuralElement,
)


@dataclass
class CodeInput:
    element: StructuralElement
    detection: RebarDetection
    earthquake_zone: str | None = None
    seismic_design_class: str = "DTS=1"


_MIN_COLUMN_REBAR_RATIO = 0.01
_MAX_COLUMN_REBAR_RATIO = 0.04
_MIN_STIRRUP_DIA_SEISMIC_MM = 10
_MAX_STIRRUP_SPACING_CONFINEMENT_MM = 100
_MAX_STIRRUP_SPACING_MIDDLE_MM = 200


class CodeAgent(BaseAgent[CodeInput, ComplianceReport]):
    role = AgentRole.CODE

    async def run(self, payload: CodeInput) -> ComplianceReport:
        element = payload.element
        passes: list[str] = []
        violations: list[str] = []
        articles: list[str] = []

        if isinstance(element, ColumnSchema):
            self._check_column(element, payload.detection, passes, violations, articles)
        else:
            # Beams, walls, slabs, stairs — minimal stirrup checks for MVP.
            # Day 7 RAG will fill in TBDY §7.4 (beams), §7.6 (walls), §7.11 (slabs).
            articles.append("TBDY 2018 (full article-level rules pending RAG integration)")
            st = stirrup(element)
            if st is not None:
                if st.diameter_mm >= _MIN_STIRRUP_DIA_SEISMIC_MM:
                    passes.append(f"Stirrup diameter Ø{st.diameter_mm} ≥ Ø10 (seismic min).")
                else:
                    violations.append(
                        f"Stirrup diameter Ø{st.diameter_mm} < Ø10 (seismic minimum)."
                    )
                if st.hook_angle_deg >= 135:
                    passes.append("Stirrup hook bent to 135°.")
                else:
                    violations.append(
                        f"Stirrup hook {st.hook_angle_deg}° < 135° (seismic minimum)."
                    )
            longs = longitudinal_rebar(element)
            if not longs:
                violations.append("No longitudinal rebar detected in plan — incomplete data.")

        severity = self._severity(len(violations))
        base_summary = self._summary(element, len(passes), len(violations))

        summary = base_summary
        if violations:
            try:
                narrative = await self._hermes_narrative(
                    element_label(element), violations, passes
                )
                if narrative:
                    summary = narrative
            except Exception:
                summary = base_summary

        return ComplianceReport(
            element_id=element.id,
            element_type=element.element_type,
            applicable_articles=articles,
            violations=violations,
            passes=passes,
            severity=severity,
            summary=summary,
        )

    def _check_column(
        self,
        col: ColumnSchema,
        detection: RebarDetection,
        passes: list[str],
        violations: list[str],
        articles: list[str],
    ) -> None:
        articles.append("TBDY 2018 §7.3.4 (column longitudinal rebar ratio)")
        total_area = sum(
            r.count * math.pi * (r.diameter_mm / 2.0) ** 2 for r in col.longitudinal
        )
        cross = cross_section_area_mm2(col)
        ratio = total_area / cross if cross else 0.0
        if _MIN_COLUMN_REBAR_RATIO <= ratio <= _MAX_COLUMN_REBAR_RATIO:
            passes.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% within 1%–4% range.")
        elif ratio < _MIN_COLUMN_REBAR_RATIO:
            violations.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% < 1% minimum.")
        else:
            violations.append(f"Longitudinal rebar ratio {ratio * 100:.2f}% > 4% maximum.")

        articles.append("TBDY 2018 §7.3.6 (transverse rebar — stirrup)")
        st = col.stirrup
        if st.diameter_mm >= _MIN_STIRRUP_DIA_SEISMIC_MM:
            passes.append(f"Stirrup diameter Ø{st.diameter_mm} ≥ Ø10 (seismic min).")
        else:
            violations.append(f"Stirrup diameter Ø{st.diameter_mm} < Ø10 (seismic minimum).")

        confinement = st.spacing_confinement_mm or st.spacing_mm
        if confinement <= _MAX_STIRRUP_SPACING_CONFINEMENT_MM:
            passes.append(f"Confinement-zone stirrup spacing {confinement} mm ≤ 100 mm.")
        else:
            violations.append(
                f"Confinement-zone stirrup spacing {confinement} mm > 100 mm."
            )

        if st.spacing_mm <= _MAX_STIRRUP_SPACING_MIDDLE_MM:
            passes.append(f"Mid-zone stirrup spacing {st.spacing_mm} mm ≤ 200 mm.")
        else:
            violations.append(f"Mid-zone stirrup spacing {st.spacing_mm} mm > 200 mm.")

        if st.hook_angle_deg >= 135:
            passes.append("Stirrup hook bent to 135°.")
        else:
            violations.append(f"Stirrup hook {st.hook_angle_deg}° < 135° (seismic minimum).")

        articles.append("TBDY 2018 §7.3.7 (crossties)")
        if st.crossties >= 2:
            passes.append(f"Crosstie count {st.crossties} ≥ 2.")
        else:
            violations.append(f"Crosstie count {st.crossties} insufficient (≥ 2 recommended).")

        if detection.estimated_stirrup_spacing_mm is not None:
            actual = detection.estimated_stirrup_spacing_mm
            if actual > st.spacing_mm + 30:
                violations.append(
                    f"Site stirrup spacing {actual} mm exceeds plan spec {st.spacing_mm} mm."
                )

    async def _hermes_narrative(
        self, element_label_str: str, violations: list[str], passes: list[str]
    ) -> str | None:
        system = (
            "You are a senior structural engineer. In 2-3 clear English sentences, explain what "
            "the following TBDY 2018 violations mean for seismic safety of the element. "
            "Be concrete and specific. No markdown, no bullets."
        )
        user = (
            f"{element_label_str}\n"
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
            skills=["moderate-inspection"],
        )
        text = (resp.get("content") or "").strip()
        return text or None

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
    def _summary(element: StructuralElement, n_pass: int, n_fail: int) -> str:
        label = element_label(element)
        if n_fail == 0:
            return f"{label}: TBDY 2018 compliant across {n_pass} checks."
        return f"{label}: {n_fail} violation(s), {n_pass} passing check(s)."
