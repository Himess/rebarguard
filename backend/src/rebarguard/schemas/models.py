from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class InspectionPhase(str, Enum):
    FOUNDATION = "foundation"
    GROUND_FLOOR = "ground_floor"
    MID_FLOOR = "mid_floor"
    ROOF = "roof"
    OTHER = "other"


class AgentRole(str, Enum):
    PLAN_PARSER = "plan_parser"
    GEOMETRY = "geometry"
    CODE = "code"
    FRAUD = "fraud"
    RISK = "risk"
    MATERIAL = "material"
    COVER = "cover"
    MODERATOR = "moderator"


class AgentVerdict(str, Enum):
    APPROVE = "approve"
    CONDITIONAL = "conditional"
    REJECT = "reject"


class RebarSchema(BaseModel):
    """Longitudinal reinforcement specification for a structural element."""

    count: int
    diameter_mm: int = Field(description="Nominal diameter in millimeters, e.g. 16, 20, 22, 25")
    steel_class: str = Field(default="S420", description="e.g. S420, B500C")
    position: Literal["corner", "side", "middle"] | None = None


class StirrupSchema(BaseModel):
    """Transverse reinforcement (etriye) specification."""

    diameter_mm: int = Field(description="Typically 8, 10, or 12 mm")
    spacing_mm: int = Field(description="Center-to-center spacing")
    spacing_confinement_mm: int | None = Field(
        default=None, description="Tight spacing in confinement zones (TBDY 2018 Bölüm 7)"
    )
    hook_angle_deg: int = Field(default=135, description="Seismic standard = 135°")
    leg_count: int = Field(default=2, description="Number of stirrup legs")
    crossties: int = Field(default=0, description="Çiroz count")


class ColumnSchema(BaseModel):
    """Single column definition from the approved structural plan."""

    id: str = Field(description="e.g. S1, S2, K-A3")
    floor: str = Field(description="e.g. foundation, 1, 2, roof")
    width_mm: int
    depth_mm: int
    longitudinal: list[RebarSchema]
    stirrup: StirrupSchema
    concrete_cover_mm: int = Field(default=30, description="Paspayı, typically 25-40 mm")
    concrete_class: str = Field(default="C30/37", description="e.g. C25/30, C30/37, C35/45")


class StructuralPlan(BaseModel):
    """Structured output from parsing an approved project PDF."""

    project_name: str
    address: str | None = None
    columns: list[ColumnSchema] = Field(default_factory=list)
    earthquake_zone: str | None = None
    soil_class: str | None = None
    notes: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class PlanParseResult(BaseModel):
    plan: StructuralPlan
    source_pdf: str
    pages_processed: int
    warnings: list[str] = Field(default_factory=list)


class RebarDetection(BaseModel):
    """Kimi-VL output for a single site photo."""

    photo_path: str
    element_id: str | None = Field(default=None, description="User-supplied e.g. 'S1 foundation'")
    detected_rebar_count: int
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
    pga_g: float | None = Field(default=None, description="Peak Ground Acceleration in g")
    soil_class: str | None = None
    risk_multiplier: float = 1.0
    summary: str


class MaterialReport(BaseModel):
    agent: AgentRole = AgentRole.MATERIAL
    element_id: str
    detected_steel_class: str | None = None
    corrosion_level: int = Field(default=0, ge=0, le=3, description="0 none, 3 severe")
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
    """Single streamable message from an agent during debate."""

    id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent: AgentRole
    kind: Literal["observation", "challenge", "rebuttal", "verdict"] = "observation"
    content: str
    model: str | None = Field(
        default=None,
        description="LLM that produced this message, e.g. 'moonshotai/kimi-k2.5' or 'Hermes-4-70B'",
    )
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


class Project(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    address: str | None = None
    plan: StructuralPlan
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Inspection(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    phase: InspectionPhase
    element_id: str
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
