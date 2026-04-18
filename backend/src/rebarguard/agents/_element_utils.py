"""Helpers for agents that need to reason about any StructuralElement uniformly."""

from __future__ import annotations

from rebarguard.schemas import (
    BeamSchema,
    ColumnSchema,
    ElementType,
    RebarSchema,
    ShearWallSchema,
    SlabSchema,
    StairSchema,
    StirrupSchema,
    StructuralElement,
)


def longitudinal_rebar(element: StructuralElement) -> list[RebarSchema]:
    """Return the list of longitudinal rebar groups for the given element."""
    if isinstance(element, ColumnSchema):
        return element.longitudinal
    if isinstance(element, BeamSchema):
        return [*element.top_rebar, *element.bottom_rebar]
    if isinstance(element, ShearWallSchema):
        return element.vertical_rebar
    if isinstance(element, StairSchema):
        return element.rebar
    if isinstance(element, SlabSchema):
        return []
    return []


def rebar_count(element: StructuralElement) -> int:
    return sum(r.count for r in longitudinal_rebar(element))


def rebar_diameters(element: StructuralElement) -> list[int]:
    return sorted({r.diameter_mm for r in longitudinal_rebar(element) if r.diameter_mm})


def stirrup(element: StructuralElement) -> StirrupSchema | None:
    if isinstance(element, (ColumnSchema, BeamSchema)):
        return element.stirrup
    if isinstance(element, ShearWallSchema):
        return element.stirrup
    return None


def concrete_cover_mm(element: StructuralElement) -> int:
    if hasattr(element, "concrete_cover_mm"):
        return int(element.concrete_cover_mm)  # type: ignore[attr-defined]
    return 30


def element_type(element: StructuralElement) -> ElementType:
    return element.element_type


def element_label(element: StructuralElement) -> str:
    t = element.element_type.value.replace("_", " ").title()
    return f"{t} {element.id}"


def cross_section_area_mm2(element: StructuralElement) -> float:
    if isinstance(element, ColumnSchema):
        return float(element.width_mm * element.depth_mm)
    if isinstance(element, BeamSchema):
        return float(element.width_mm * element.depth_mm)
    if isinstance(element, ShearWallSchema):
        # per meter of wall length
        length_mm = int((element.length_m or 1.0) * 1000)
        return float(element.thickness_mm * length_mm)
    if isinstance(element, SlabSchema):
        return 0.0  # ratio computed differently for slabs
    if isinstance(element, StairSchema):
        return 0.0
    return 0.0
