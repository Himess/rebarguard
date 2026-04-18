"""GeometryAgent unit tests — no network calls."""

import pytest

from rebarguard.agents.geometry import GeometryAgent, GeometryInput
from rebarguard.schemas import ColumnSchema, RebarDetection, RebarSchema, StirrupSchema


def _col(count: int = 8, diameter: int = 20) -> ColumnSchema:
    return ColumnSchema(
        id="S1",
        floor="1",
        width_mm=400,
        depth_mm=400,
        longitudinal=[RebarSchema(count=count, diameter_mm=diameter)],
        stirrup=StirrupSchema(
            diameter_mm=10,
            spacing_mm=200,
            spacing_confinement_mm=100,
            leg_count=4,
            crossties=2,
        ),
    )


@pytest.mark.asyncio
async def test_happy_path() -> None:
    agent = GeometryAgent()
    det = RebarDetection(
        photo_path="/tmp/s1.jpg",
        detected_rebar_count=8,
        estimated_diameter_mm=20,
        estimated_stirrup_spacing_mm=200,
    )
    diff = await agent.run(GeometryInput(column=_col(), detection=det))
    assert diff.rebar_count_ok is True
    assert diff.missing_rebar == 0
    assert diff.severity == "low"


@pytest.mark.asyncio
async def test_missing_rebar_critical() -> None:
    agent = GeometryAgent()
    det = RebarDetection(photo_path="/tmp/s1.jpg", detected_rebar_count=4)
    diff = await agent.run(GeometryInput(column=_col(count=8), detection=det))
    assert diff.missing_rebar == 4
    assert diff.severity == "critical"


@pytest.mark.asyncio
async def test_diameter_mismatch() -> None:
    agent = GeometryAgent()
    det = RebarDetection(
        photo_path="/tmp/s1.jpg", detected_rebar_count=8, estimated_diameter_mm=14
    )
    diff = await agent.run(GeometryInput(column=_col(diameter=20), detection=det))
    assert diff.diameter_ok is False
    assert diff.severity in {"critical", "high"}
