"""Smoke tests for Pydantic schemas (no API calls)."""

from rebarguard.schemas import (
    ColumnSchema,
    PlanParseResult,
    RebarSchema,
    StirrupSchema,
    StructuralPlan,
)


def test_column_schema_roundtrip() -> None:
    col = ColumnSchema(
        id="S1",
        floor="1",
        width_mm=400,
        depth_mm=400,
        longitudinal=[RebarSchema(count=8, diameter_mm=20)],
        stirrup=StirrupSchema(
            diameter_mm=10,
            spacing_mm=200,
            spacing_confinement_mm=100,
            leg_count=4,
            crossties=2,
        ),
    )
    dumped = col.model_dump()
    assert dumped["id"] == "S1"
    restored = ColumnSchema.model_validate(dumped)
    assert restored == col


def test_structural_plan_min() -> None:
    plan = StructuralPlan(project_name="Demo")
    result = PlanParseResult(plan=plan, source_pdf="/tmp/x.pdf", pages_processed=1)
    assert result.plan.project_name == "Demo"
