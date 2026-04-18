"""InspectionOrchestrator — runs the 7-agent debate, yields AgentMessages for streaming."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path

from rebarguard.agents import (
    CodeAgent,
    CoverAgent,
    FraudAgent,
    GeometryAgent,
    MaterialAgent,
    ModeratorAgent,
    RiskAgent,
)
from rebarguard.agents.code_compliance import CodeInput
from rebarguard.agents.cover import CoverInput
from rebarguard.agents.fraud import FraudInput
from rebarguard.agents.geometry import GeometryInput
from rebarguard.agents.material import MaterialInput
from rebarguard.agents.moderator import ModeratorInput
from rebarguard.agents.risk import RiskInput
from rebarguard.schemas import (
    AgentMessage,
    AgentRole,
    ColumnSchema,
    RebarDetection,
    StructuralPlan,
)
from rebarguard.vision import get_kimi_client
from rebarguard.vision.prompts import REBAR_DETECT_PROMPT


@dataclass
class InspectionJob:
    plan: StructuralPlan
    column_id: str
    site_photos: list[Path]
    closeup_photo: Path | None
    cover_photo: Path | None
    city: str | None = None
    soil_class: str | None = None
    floors: int = 5


class InspectionOrchestrator:
    def __init__(self) -> None:
        self.kimi = get_kimi_client()
        self.geometry = GeometryAgent()
        self.code = CodeAgent()
        self.fraud = FraudAgent()
        self.risk = RiskAgent()
        self.material = MaterialAgent()
        self.cover = CoverAgent()
        self.moderator = ModeratorAgent()

    async def run(self, job: InspectionJob) -> AsyncIterator[AgentMessage]:
        column = self._find_column(job.plan, job.column_id)
        if column is None:
            yield AgentMessage(
                agent=AgentRole.MODERATOR,
                kind="verdict",
                content=f"Kolon {job.column_id} projede bulunamadı.",
            )
            return

        yield AgentMessage(
            agent=AgentRole.MODERATOR,
            kind="observation",
            content=f"Kolon {job.column_id} için denetim başlatıldı. 7 ajan aktive ediliyor.",
        )

        detections = await self._detect_all(job.site_photos)
        for det in detections:
            yield AgentMessage(
                agent=AgentRole.PLAN_PARSER,
                kind="observation",
                content=(
                    f"Kimi-VL tespiti: {det.detected_rebar_count} donatı, "
                    f"etriye {'var' if det.stirrup_visible else 'görünmüyor'}."
                ),
                evidence=det.model_dump(mode="json"),
            )

        primary_det = detections[0] if detections else RebarDetection(
            photo_path="", detected_rebar_count=0
        )

        geom, comp, fraud, risk = await asyncio.gather(
            self.geometry.run(GeometryInput(column=column, detection=primary_det)),
            self.code.run(CodeInput(column=column, detection=primary_det)),
            self.fraud.run(FraudInput(photo_paths=job.site_photos, detections=detections)),
            self.risk.run(
                RiskInput(city=job.city, soil_class=job.soil_class, floors=job.floors)
            ),
        )

        yield AgentMessage(agent=AgentRole.GEOMETRY, kind="verdict", content=geom.summary, evidence=geom.model_dump(mode="json"))
        yield AgentMessage(agent=AgentRole.CODE, kind="verdict", content=comp.summary, evidence=comp.model_dump(mode="json"))
        yield AgentMessage(agent=AgentRole.FRAUD, kind="verdict", content=fraud.summary, evidence=fraud.model_dump(mode="json"))
        yield AgentMessage(agent=AgentRole.RISK, kind="verdict", content=risk.summary, evidence=risk.model_dump(mode="json"))

        material_task = (
            self.material.run(MaterialInput(column=column, closeup_photo=job.closeup_photo))
            if job.closeup_photo
            else None
        )
        cover_task = (
            self.cover.run(CoverInput(column=column, photo=job.cover_photo))
            if job.cover_photo
            else None
        )
        material, cover = await asyncio.gather(
            material_task if material_task else _noop_material(column.id),
            cover_task if cover_task else _noop_cover(column),
        )
        yield AgentMessage(agent=AgentRole.MATERIAL, kind="verdict", content=material.summary, evidence=material.model_dump(mode="json"))
        yield AgentMessage(agent=AgentRole.COVER, kind="verdict", content=cover.summary, evidence=cover.model_dump(mode="json"))

        moderator_report = await self.moderator.run(
            ModeratorInput(
                geometry=geom,
                compliance=comp,
                fraud=fraud,
                risk=risk,
                material=material,
                cover=cover,
            )
        )
        yield AgentMessage(
            agent=AgentRole.MODERATOR,
            kind="verdict",
            content=moderator_report.narrative,
            evidence=moderator_report.model_dump(mode="json"),
        )

    async def _detect_all(self, photos: list[Path]) -> list[RebarDetection]:
        async def one(p: Path) -> RebarDetection:
            parsed = await self.kimi.analyze_image(p, REBAR_DETECT_PROMPT)
            return RebarDetection(
                photo_path=str(p),
                detected_rebar_count=int(parsed.get("detected_rebar_count", 0) or 0),
                estimated_diameter_mm=_as_int(parsed.get("estimated_diameter_mm")),
                estimated_spacing_mm=_as_int(parsed.get("estimated_spacing_mm")),
                stirrup_visible=bool(parsed.get("stirrup_visible", False)),
                estimated_stirrup_spacing_mm=_as_int(parsed.get("estimated_stirrup_spacing_mm")),
                crossties_visible=int(parsed.get("crossties_visible", 0) or 0),
                reference_marker_found=bool(parsed.get("reference_marker_found", False)),
                notes=list(parsed.get("notes") or []),
                raw_response=parsed,
            )

        return await asyncio.gather(*[one(p) for p in photos])

    @staticmethod
    def _find_column(plan: StructuralPlan, column_id: str) -> ColumnSchema | None:
        for c in plan.columns:
            if c.id == column_id:
                return c
        return None


def _as_int(v) -> int | None:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


async def _noop_material(element_id: str):
    from rebarguard.schemas import MaterialReport

    return MaterialReport(
        element_id=element_id,
        detected_steel_class=None,
        corrosion_level=0,
        surface_condition="clean",
        severity="low",
        summary="Malzeme yakın çekim fotoğrafı sağlanmadı — atlandı.",
    )


async def _noop_cover(column: ColumnSchema):
    from rebarguard.schemas import ConcreteCoverReport

    return ConcreteCoverReport(
        element_id=column.id,
        expected_cover_mm=column.concrete_cover_mm,
        estimated_cover_mm=None,
        within_tolerance=False,
        severity="medium",
        summary="Paspayı fotoğrafı sağlanmadı — tahmin yapılamadı.",
    )
