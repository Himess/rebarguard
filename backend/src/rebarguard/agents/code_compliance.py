"""CodeAgent — TBDY 2018 / TS 500 compliance check via RAG + Hermes reasoning.

Day-7 task: wire up pgvector retrieval. For now this ships a deterministic rule-engine fallback
so Phase-2 integration can proceed without the RAG index. Hermes handles the narrative.
"""

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
        articles.append("TBDY 2018 Bölüm 7.3.4 (kolon donatı oranları)")
        if _MIN_REBAR_RATIO <= ratio <= _MAX_REBAR_RATIO:
            passes.append(f"Boyuna donatı oranı %{ratio * 100:.2f} sınırlar içinde.")
        elif ratio < _MIN_REBAR_RATIO:
            violations.append(f"Boyuna donatı oranı %{ratio * 100:.2f} < %1 (min).")
        else:
            violations.append(f"Boyuna donatı oranı %{ratio * 100:.2f} > %4 (max).")

        articles.append("TBDY 2018 Bölüm 7.3.6 (enine donatı — etriye)")
        if col.stirrup.diameter_mm >= _MIN_STIRRUP_DIA_SEISMIC_MM:
            passes.append(f"Etriye çapı Ø{col.stirrup.diameter_mm} ≥ Ø10 (sismik).")
        else:
            violations.append(f"Etriye çapı Ø{col.stirrup.diameter_mm} < Ø10 (sismik min).")

        confinement = col.stirrup.spacing_confinement_mm or col.stirrup.spacing_mm
        if confinement <= _MAX_STIRRUP_SPACING_CONFINEMENT_MM:
            passes.append(
                f"Sıklaştırma bölgesi etriye aralığı {confinement} mm ≤ 100 mm."
            )
        else:
            violations.append(
                f"Sıklaştırma bölgesi etriye aralığı {confinement} mm > 100 mm."
            )

        if col.stirrup.spacing_mm <= _MAX_STIRRUP_SPACING_MIDDLE_MM:
            passes.append(f"Orta bölge etriye aralığı {col.stirrup.spacing_mm} mm ≤ 200 mm.")
        else:
            violations.append(
                f"Orta bölge etriye aralığı {col.stirrup.spacing_mm} mm > 200 mm."
            )

        if col.stirrup.hook_angle_deg >= 135:
            passes.append("Etriye kancası 135°.")
        else:
            violations.append(f"Etriye kancası {col.stirrup.hook_angle_deg}° < 135° (sismik).")

        articles.append("TBDY 2018 Bölüm 7.3.7 (çiroz)")
        if col.stirrup.crossties >= 2:
            passes.append(f"Çiroz sayısı {col.stirrup.crossties} ≥ 2.")
        else:
            violations.append(
                f"Çiroz sayısı {col.stirrup.crossties} yetersiz (min 2 önerilir)."
            )

        if payload.detection.estimated_stirrup_spacing_mm is not None:
            actual = payload.detection.estimated_stirrup_spacing_mm
            if actual > col.stirrup.spacing_mm + 30:
                violations.append(
                    f"Saha etriye aralığı {actual} mm, proje {col.stirrup.spacing_mm} mm."
                )

        severity = self._severity(len(violations))
        summary = self._summary(col.id, len(passes), len(violations))

        return ComplianceReport(
            element_id=col.id,
            applicable_articles=articles,
            violations=violations,
            passes=passes,
            severity=severity,
            summary=summary,
        )

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
            return f"Kolon {element_id}: TBDY 2018 uyumlu ({n_pass} madde)."
        return f"Kolon {element_id}: {n_fail} ihlal, {n_pass} uyum."
