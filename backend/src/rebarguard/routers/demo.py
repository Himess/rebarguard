"""Demo seeder — creates realistic sample projects for end-to-end testing.

These endpoints inject hand-crafted `StructuralPlan` data into the in-memory store so the
full 7-agent debate can run without waiting for PDF column-schedules that a DWG hasn't
been exported for. Remove or gate this behind an env flag before production.
"""

from __future__ import annotations

from fastapi import APIRouter

from rebarguard.routers.projects import _STORE
from rebarguard.schemas import (
    BeamSchema,
    ColumnSchema,
    Coordinates,
    Project,
    ProjectMetadata,
    RebarSchema,
    ShearWallSchema,
    StirrupSchema,
    StructuralPlan,
)

router = APIRouter()


@router.post("/fistik", response_model=Project, summary="Seed the 1340 Ada 43 Parsel demo")
async def seed_fistik() -> Project:
    """Build a realistic StructuralPlan for Ferhat Baş's 1340 Ada 43 Parsel project.

    Metadata is taken from Kimi K2.5's real extraction on 1340.pdf (ideCAD metraj).
    Columns + beams + shear walls are typical for a 6+2 floor apartment on a 7.95×15 m
    footprint — realistic but hand-crafted because the original DWG hasn't been plotted
    to PDF yet.
    """
    metadata = ProjectMetadata(
        project_name="1340 Ada 43 Parsel",
        engineer_name="Ferhat Baş",
        engineer_license=None,
        parcel_no="1340 ADA 43 PARSEL",
        city="Istanbul",
        district=None,
        country="Türkiye",
        coordinates=Coordinates(latitude=41.0082, longitude=28.9784),
        earthquake_zone="Zone 1 (highest)",
        peak_ground_acceleration_g=0.43,
        soil_class="ZC",
        seismic_design_class="DTS=1",
        floor_count=6,
        basement_count=2,
        default_floor_height_m=3.0,
        total_height_m=24.0,
        footprint_width_m=7.95,
        footprint_depth_m=15.0,
    )

    # Six columns arranged on a typical 3×2 grid — axes A-C × 1-2
    column_positions = [
        ("S1", 0.0, 0.0),
        ("S2", 4.0, 0.0),
        ("S3", 7.95, 0.0),
        ("S4", 0.0, 15.0),
        ("S5", 4.0, 15.0),
        ("S6", 7.95, 15.0),
    ]

    columns: list[ColumnSchema] = []
    for floor in ("basement_2", "basement_1", "ground", "1", "2", "3", "4", "roof"):
        for cid, x, y in column_positions:
            columns.append(
                ColumnSchema(
                    id=f"{cid}-{floor}",
                    floor=floor,
                    position=_pos(x, y),
                    width_mm=400,
                    depth_mm=400,
                    longitudinal=[RebarSchema(count=8, diameter_mm=20, steel_class="S420", position="side")],
                    stirrup=StirrupSchema(
                        diameter_mm=10,
                        spacing_mm=200,
                        spacing_confinement_mm=100,
                        hook_angle_deg=135,
                        leg_count=4,
                        crossties=2,
                    ),
                    concrete_cover_mm=30,
                    concrete_class="C30/37",
                )
            )

    # Two shear walls — core (P1) + stairwell (P2) — full-height
    shear_walls = [
        ShearWallSchema(
            id="P1",
            floor_from="basement_2",
            floor_to="roof",
            start=_pos(3.0, 7.0),
            end=_pos(4.5, 7.0),
            thickness_mm=250,
            length_m=1.5,
            vertical_rebar=[RebarSchema(count=20, diameter_mm=12, steel_class="S420")],
            horizontal_rebar=[RebarSchema(count=30, diameter_mm=10, steel_class="S420")],
            boundary_element_rebar=[RebarSchema(count=6, diameter_mm=16, steel_class="S420")],
            stirrup=StirrupSchema(diameter_mm=10, spacing_mm=150, hook_angle_deg=135),
            concrete_cover_mm=25,
            concrete_class="C30/37",
        ),
        ShearWallSchema(
            id="P2",
            floor_from="basement_2",
            floor_to="roof",
            start=_pos(5.5, 7.0),
            end=_pos(7.0, 7.0),
            thickness_mm=250,
            length_m=1.5,
            vertical_rebar=[RebarSchema(count=20, diameter_mm=12, steel_class="S420")],
            horizontal_rebar=[RebarSchema(count=30, diameter_mm=10, steel_class="S420")],
            stirrup=StirrupSchema(diameter_mm=10, spacing_mm=150, hook_angle_deg=135),
            concrete_cover_mm=25,
            concrete_class="C30/37",
        ),
    ]

    # One beam per floor per axis — simplified
    beams: list[BeamSchema] = []
    for floor in ("ground", "1", "2", "3", "4", "roof"):
        beams.append(
            BeamSchema(
                id=f"K{floor}-A",
                floor=floor,
                start=_pos(0.0, 0.0),
                end=_pos(7.95, 0.0),
                width_mm=250,
                depth_mm=500,
                top_rebar=[RebarSchema(count=4, diameter_mm=20, steel_class="S420", position="top")],
                bottom_rebar=[RebarSchema(count=3, diameter_mm=16, steel_class="S420", position="bottom")],
                stirrup=StirrupSchema(diameter_mm=10, spacing_mm=200, hook_angle_deg=135, leg_count=2),
                concrete_cover_mm=25,
                concrete_class="C30/37",
            )
        )

    plan = StructuralPlan(
        metadata=metadata,
        columns=columns,
        beams=beams,
        slabs=[],
        shear_walls=shear_walls,
        stairs=[],
        notes=[
            "Seeded for end-to-end demo — metadata matches Kimi's extraction from 1340.pdf.",
            "Columns + beams + walls are typical for 6+2 floor apartment on 7.95×15 m footprint.",
            "Replace with the real column schedule once DWG is plotted to PDF.",
        ],
        confidence=0.5,
    )

    proj = Project(plan=plan)
    _STORE[str(proj.id)] = proj
    return proj


def _pos(x: float, y: float):
    from rebarguard.schemas import Position2D

    return Position2D(x_m=x, y_m=y)
