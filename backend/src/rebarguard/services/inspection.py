"""InspectionOrchestrator — runs the 7-agent debate for ANY structural element.

Metadata (city, soil_class, floors) is pulled from the Project's plan metadata so the
user doesn't have to re-enter it during site inspection.
"""

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
from rebarguard.agents._element_utils import element_label
from rebarguard.agents.code_compliance import CodeInput
from rebarguard.agents.cover import CoverInput
from rebarguard.agents.fraud import FraudInput
from rebarguard.agents.geometry import GeometryInput
from rebarguard.agents.material import MaterialInput
from rebarguard.agents.moderator import ModeratorInput
from rebarguard.agents.risk import RiskInput
from rebarguard.config import get_settings
from rebarguard.schemas import (
    AgentMessage,
    AgentRole,
    ElementType,
    RebarDetection,
    StructuralElement,
    StructuralPlan,
)
from rebarguard.vision import get_kimi_client
from rebarguard.vision.prompts import REBAR_DETECT_PROMPT

_KIMI_MODEL_TAG = "moonshotai/kimi-k2.5"


@dataclass
class InspectionJob:
    plan: StructuralPlan
    element_id: str
    element_type: ElementType | None = None
    site_photos: list[Path] = None  # type: ignore[assignment]
    closeup_photo: Path | None = None
    cover_photo: Path | None = None


class InspectionOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.kimi = get_kimi_client()
        self.geometry = GeometryAgent()
        self.code = CodeAgent()
        self.fraud = FraudAgent()
        self.risk = RiskAgent()
        self.material = MaterialAgent()
        self.cover = CoverAgent()
        self.moderator = ModeratorAgent()

    async def run(self, job: InspectionJob) -> AsyncIterator[AgentMessage]:
        element = job.plan.find_element(job.element_id)
        if element is None:
            yield AgentMessage(
                agent=AgentRole.MODERATOR,
                kind="verdict",
                content=f"Element {job.element_id} not found in the project plan.",
            )
            return

        label = element_label(element)
        metadata = job.plan.metadata

        yield AgentMessage(
            agent=AgentRole.MODERATOR,
            kind="observation",
            content=(
                f"Inspection started for {label}. 7 agents activating — "
                f"Kimi K2.5 handles vision, Hermes 4 70B handles reasoning."
            ),
        )
        yield AgentMessage(
            agent=AgentRole.RISK,
            kind="observation",
            content=(
                f"Project metadata: {metadata.city or '—'}, soil {metadata.soil_class or '—'}, "
                f"{metadata.floor_count or '?'} floor(s), earthquake zone {metadata.earthquake_zone or '—'}."
            ),
        )

        site_photos = job.site_photos or []
        detections = await self._detect_all(site_photos, element.element_type)
        for det in detections:
            yield AgentMessage(
                agent=AgentRole.PLAN_PARSER,
                kind="observation",
                content=(
                    f"Kimi K2.5 detection: {det.detected_rebar_count} rebars, "
                    f"stirrups {'visible' if det.stirrup_visible else 'not visible'}."
                ),
                model=_KIMI_MODEL_TAG,
                evidence=det.model_dump(mode="json"),
            )

        primary_det = detections[0] if detections else RebarDetection(
            photo_path="", detected_rebar_count=0, element_type=element.element_type
        )

        geom, comp, fraud, risk = await asyncio.gather(
            self.geometry.run(GeometryInput(element=element, detection=primary_det)),
            self.code.run(CodeInput(element=element, detection=primary_det)),
            self.fraud.run(FraudInput(photo_paths=site_photos, detections=detections)),
            self.risk.run(
                RiskInput(
                    city=metadata.city,
                    soil_class=metadata.soil_class,
                    floors=metadata.floor_count or 5,
                    latitude=metadata.coordinates.latitude if metadata.coordinates else None,
                    longitude=metadata.coordinates.longitude if metadata.coordinates else None,
                )
            ),
        )

        yield AgentMessage(
            agent=AgentRole.GEOMETRY,
            kind="verdict",
            content=geom.summary,
            evidence=geom.model_dump(mode="json"),
        )
        code_model = self.settings.hermes_reasoning_model if comp.violations else None
        yield AgentMessage(
            agent=AgentRole.CODE,
            kind="verdict",
            content=comp.summary,
            model=code_model,
            evidence=comp.model_dump(mode="json"),
        )
        yield AgentMessage(
            agent=AgentRole.FRAUD,
            kind="verdict",
            content=fraud.summary,
            evidence=fraud.model_dump(mode="json"),
        )
        yield AgentMessage(
            agent=AgentRole.RISK,
            kind="verdict",
            content=risk.summary,
            evidence=risk.model_dump(mode="json"),
        )

        material_task = (
            self.material.run(MaterialInput(element=element, closeup_photo=job.closeup_photo))
            if job.closeup_photo
            else _noop_material(element.id)
        )
        cover_task = (
            self.cover.run(CoverInput(element=element, photo=job.cover_photo))
            if job.cover_photo
            else _noop_cover(element)
        )
        material, cover = await asyncio.gather(material_task, cover_task)
        yield AgentMessage(
            agent=AgentRole.MATERIAL,
            kind="verdict",
            content=material.summary,
            model=_KIMI_MODEL_TAG if job.closeup_photo else None,
            evidence=material.model_dump(mode="json"),
        )
        yield AgentMessage(
            agent=AgentRole.COVER,
            kind="verdict",
            content=cover.summary,
            model=_KIMI_MODEL_TAG if job.cover_photo else None,
            evidence=cover.model_dump(mode="json"),
        )

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
            model=self.settings.hermes_reasoning_model,
            evidence=moderator_report.model_dump(mode="json"),
        )

    async def _detect_all(
        self, photos: list[Path], element_type: ElementType
    ) -> list[RebarDetection]:
        async def one(p: Path) -> RebarDetection:
            parsed = await self.kimi.analyze_image(p, REBAR_DETECT_PROMPT)
            return RebarDetection(
                photo_path=str(p),
                element_type=element_type,
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
        summary="No rebar close-up photo provided — skipped.",
    )


async def _noop_cover(element: StructuralElement):
    from rebarguard.agents._element_utils import concrete_cover_mm
    from rebarguard.schemas import ConcreteCoverReport

    return ConcreteCoverReport(
        element_id=element.id,
        expected_cover_mm=concrete_cover_mm(element),
        estimated_cover_mm=None,
        within_tolerance=False,
        severity="medium",
        summary="No concrete-cover photo provided — estimation skipped.",
    )
