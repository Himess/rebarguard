from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================


class InspectionPhase(str, Enum):
    FOUNDATION = "foundation"
    GROUND_FLOOR = "ground_floor"
    MID_FLOOR = "mid_floor"
    ROOF = "roof"
    OTHER = "other"


class ElementType(str, Enum):
    """Structural elements supported for inspection."""

    COLUMN = "column"
    BEAM = "beam"
    SLAB = "slab"
    SHEAR_WALL = "shear_wall"
    STAIR = "stair"
    FOUNDATION = "foundation"


class AgentRole(str, Enum):
    PLAN_PARSER = "plan_parser"
    GEOMETRY = "geometry"
    CODE = "code"
    FRAUD = "fraud"
    RISK = "risk"
    MATERIAL = "material"
    COVER = "cover"
    MODERATOR = "moderator"
    MUNICIPALITY = "municipality"


class AgentVerdict(str, Enum):
    APPROVE = "approve"
    CONDITIONAL = "conditional"
    REJECT = "reject"


# ============================================================================
# Common rebar specs
# ============================================================================


class RebarSchema(BaseModel):
    """Longitudinal reinforcement specification."""

    count: int
    diameter_mm: int = Field(description="Nominal diameter (12, 14, 16, 18, 20, 22, 25, 28, 32)")
    steel_class: str = Field(default="S420", description="e.g. S420, B500C")
    position: Literal["corner", "side", "middle", "top", "bottom"] | None = None


class StirrupSchema(BaseModel):
    """Transverse reinforcement (etriye)."""

    diameter_mm: int = Field(description="Typically 8, 10, or 12 mm")
    spacing_mm: int
    spacing_confinement_mm: int | None = Field(
        default=None, description="Tighter spacing in confinement zones (TBDY §7.3.6)"
    )
    hook_angle_deg: int = Field(default=135, description="Seismic standard = 135°")
    leg_count: int = Field(default=2)
    crossties: int = Field(default=0, description="Çiroz count")


class MeshRebarSchema(BaseModel):
    """Slab mesh reinforcement."""

    diameter_mm: int
    spacing_mm: int
    direction: Literal["x", "y", "both"] = "both"
    layer: Literal["top", "bottom"] = "bottom"


# ============================================================================
# Structural elements (each has geometry sufficient for 3D rendering)
# ============================================================================


class Position2D(BaseModel):
    x_m: float
    y_m: float


class ColumnSchema(BaseModel):
    id: str = Field(description="e.g. S1, K-A3, C-01")
    element_type: ElementType = ElementType.COLUMN
    floor: str = Field(description="e.g. foundation, 1, 2, roof")
    position: Position2D | None = None
    width_mm: int
    depth_mm: int
    longitudinal: list[RebarSchema]
    stirrup: StirrupSchema
    concrete_cover_mm: int = Field(default=30)
    concrete_class: str = Field(default="C30/37")


class BeamSchema(BaseModel):
    id: str = Field(description="e.g. K101, B-A1")
    element_type: ElementType = ElementType.BEAM
    floor: str
    start: Position2D | None = None
    end: Position2D | None = None
    width_mm: int
    depth_mm: int
    top_rebar: list[RebarSchema] = Field(default_factory=list)
    bottom_rebar: list[RebarSchema] = Field(default_factory=list)
    stirrup: StirrupSchema
    concrete_cover_mm: int = Field(default=30)
    concrete_class: str = Field(default="C30/37")


class SlabSchema(BaseModel):
    id: str
    element_type: ElementType = ElementType.SLAB
    floor: str
    corners_m: list[Position2D] = Field(
        default_factory=list, description="Polygon corners in plan view"
    )
    thickness_mm: int
    mesh_top: MeshRebarSchema | None = None
    mesh_bottom: MeshRebarSchema | None = None
    concrete_cover_mm: int = Field(default=25)
    concrete_class: str = Field(default="C25/30")


class ShearWallSchema(BaseModel):
    id: str = Field(description="e.g. P1, W-01")
    element_type: ElementType = ElementType.SHEAR_WALL
    floor_from: str
    floor_to: str
    start: Position2D | None = None
    end: Position2D | None = None
    thickness_mm: int
    length_m: float | None = None
    vertical_rebar: list[RebarSchema] = Field(default_factory=list)
    horizontal_rebar: list[RebarSchema] = Field(default_factory=list)
    boundary_element_rebar: list[RebarSchema] = Field(default_factory=list)
    stirrup: StirrupSchema | None = None
    concrete_cover_mm: int = Field(default=25)
    concrete_class: str = Field(default="C30/37")


class StairSchema(BaseModel):
    id: str
    element_type: ElementType = ElementType.STAIR
    floor_from: str
    floor_to: str
    position: Position2D | None = None
    width_m: float | None = None
    length_m: float | None = None
    rebar: list[RebarSchema] = Field(default_factory=list)
    concrete_class: str = Field(default="C25/30")


StructuralElement = ColumnSchema | BeamSchema | SlabSchema | ShearWallSchema | StairSchema


# ============================================================================
# Project metadata (auto-extracted by Kimi from the drawing)
# ============================================================================


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class ProjectMetadata(BaseModel):
    project_name: str
    owner_name: str | None = None
    contractor_name: str | None = None
    engineer_name: str | None = None
    engineer_license: str | None = None
    address: str | None = None
    district: str | None = None
    city: str | None = None
    country: str = Field(default="Türkiye")
    coordinates: Coordinates | None = None
    parcel_no: str | None = None
    earthquake_zone: str | None = Field(
        default=None, description="e.g. Zone 1 (highest) ... Zone 4"
    )
    peak_ground_acceleration_g: float | None = None
    soil_class: Literal["ZA", "ZB", "ZC", "ZD", "ZE"] | None = None
    seismic_design_class: str | None = Field(default=None, description="TBDY DTS")
    floor_count: int | None = None
    basement_count: int = 0
    default_floor_height_m: float = 3.0
    total_height_m: float | None = None
    footprint_width_m: float | None = None
    footprint_depth_m: float | None = None


# ============================================================================
# StructuralPlan — root of Phase-1 PlanParser output
# ============================================================================


class StructuralPlan(BaseModel):
    """Complete structural plan extracted from an approved PDF drawing."""

    metadata: ProjectMetadata
    columns: list[ColumnSchema] = Field(default_factory=list)
    beams: list[BeamSchema] = Field(default_factory=list)
    slabs: list[SlabSchema] = Field(default_factory=list)
    shear_walls: list[ShearWallSchema] = Field(default_factory=list)
    stairs: list[StairSchema] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @property
    def all_elements(self) -> list[StructuralElement]:
        return [*self.columns, *self.beams, *self.slabs, *self.shear_walls, *self.stairs]

    def find_element(self, element_id: str) -> StructuralElement | None:
        for el in self.all_elements:
            if el.id == element_id:
                return el
        return None


class PlanParseResult(BaseModel):
    plan: StructuralPlan
    source_pdf: str
    pages_processed: int
    warnings: list[str] = Field(default_factory=list)


# ============================================================================
# Site inspection detections + agent reports
# ============================================================================


class RebarDetection(BaseModel):
    """Kimi output for a single site photo of an RC element."""

    photo_path: str
    element_id: str | None = None
    element_type: ElementType | None = None
    detected_rebar_count: int = 0
    estimated_diameter_mm: int | None = None
    estimated_spacing_mm: int | None = None
    stirrup_visible: bool = False
    estimated_stirrup_spacing_mm: int | None = None
    crossties_visible: int = 0
    reference_marker_found: bool = False
    notes: list[str] = Field(default_factory=list)
    raw_response: dict[str, Any] = Field(default_factory=dict)


class GeometryDiff(BaseModel):
    agent: AgentRole = AgentRole.GEOMETRY
    element_id: str
    element_type: ElementType
    rebar_count_expected: int
    rebar_count_actual: int
    rebar_count_ok: bool
    diameter_ok: bool | None = None
    spacing_ok: bool | None = None
    stirrup_ok: bool | None = None
    missing_rebar: int = 0
    severity: Literal["low", "medium", "high", "critical"] = "low"
    summary: str


class ComplianceReport(BaseModel):
    agent: AgentRole = AgentRole.CODE
    element_id: str
    element_type: ElementType
    applicable_articles: list[str] = Field(default_factory=list)
    violations: list[str] = Field(default_factory=list)
    passes: list[str] = Field(default_factory=list)
    severity: Literal["low", "medium", "high", "critical"] = "low"
    summary: str


class FraudReport(BaseModel):
    agent: AgentRole = AgentRole.FRAUD
    exif_timestamp_valid: bool = True
    geolocation_valid: bool | None = None
    reference_marker_present: bool = False
    photo_hash_duplicate: bool = False
    inconsistencies: list[str] = Field(default_factory=list)
    severity: Literal["low", "medium", "high", "critical"] = "low"
    summary: str


class RiskReport(BaseModel):
    agent: AgentRole = AgentRole.RISK
    afad_zone: str | None = None
    pga_g: float | None = None
    soil_class: str | None = None
    risk_multiplier: float = 1.0
    summary: str


class MaterialReport(BaseModel):
    agent: AgentRole = AgentRole.MATERIAL
    element_id: str
    detected_steel_class: str | None = None
    corrosion_level: int = Field(default=0, ge=0, le=3)
    surface_condition: Literal["clean", "light_rust", "flaking", "pitting"] = "clean"
    severity: Literal["low", "medium", "high", "critical"] = "low"
    summary: str


class ConcreteCoverReport(BaseModel):
    agent: AgentRole = AgentRole.COVER
    element_id: str
    expected_cover_mm: int
    estimated_cover_mm: int | None
    within_tolerance: bool
    severity: Literal["low", "medium", "high", "critical"] = "low"
    summary: str


class AgentMessage(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent: AgentRole
    kind: Literal["observation", "challenge", "rebuttal", "verdict"] = "observation"
    content: str
    model: str | None = None
    evidence: dict[str, Any] | None = None


class InspectionScore(BaseModel):
    overall: float = Field(ge=0, le=100)
    geometry: float = Field(ge=0, le=100)
    compliance: float = Field(ge=0, le=100)
    fraud: float = Field(ge=0, le=100)
    risk: float = Field(ge=0, le=100)
    material: float = Field(ge=0, le=100)
    cover: float = Field(ge=0, le=100)


class ModeratorReport(BaseModel):
    agent: AgentRole = AgentRole.MODERATOR
    verdict: AgentVerdict
    score: InspectionScore
    narrative: str
    critical_issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class MunicipalityReport(BaseModel):
    """Independent belediye-reviewer verdict on the Moderator's decision."""

    agent: AgentRole = AgentRole.MUNICIPALITY
    verdict_agrees: bool
    concerns: list[str] = Field(default_factory=list)
    additional_requirements: list[str] = Field(default_factory=list)
    recommendation: Literal["uphold", "downgrade", "escalate_to_human"]
    narrative: str


# ============================================================================
# Top-level entities (Project, Inspection)
# ============================================================================


class Project(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    plan: StructuralPlan
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def name(self) -> str:
        return self.plan.metadata.project_name

    @property
    def address(self) -> str | None:
        return self.plan.metadata.address


class Inspection(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    phase: InspectionPhase
    element_id: str
    element_type: ElementType
    photo_paths: list[str]
    detections: list[RebarDetection] = Field(default_factory=list)
    geometry: GeometryDiff | None = None
    compliance: ComplianceReport | None = None
    fraud: FraudReport | None = None
    risk: RiskReport | None = None
    material: MaterialReport | None = None
    cover: ConcreteCoverReport | None = None
    moderator: ModeratorReport | None = None
    debate: list[AgentMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
