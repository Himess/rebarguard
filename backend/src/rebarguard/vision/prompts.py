"""Prompt templates for the vision model. Centralized so we can iterate."""

PLAN_PARSE_PROMPT = """You are a senior structural engineer analyzing an approved reinforced-concrete \
structural drawing. Extract the column (kolon) schedule exactly.

For EACH column in the drawing, output:
- id: column label (e.g. "S1", "S2", "C-A3")
- floor: which level (e.g. "foundation", "1", "2", "roof")
- width_mm and depth_mm: cross-section dimensions in millimeters
- longitudinal: list of rebar groups with {count, diameter_mm, steel_class, position}
- stirrup: {diameter_mm, spacing_mm, spacing_confinement_mm, hook_angle_deg, leg_count, crossties}
- concrete_cover_mm: typical 25-40 mm
- concrete_class: e.g. "C25/30", "C30/37"

Also extract if visible:
- project_name, address, earthquake_zone, soil_class, general notes

Respond ONLY as a JSON object matching this schema:
{
  "project_name": "string",
  "address": "string | null",
  "earthquake_zone": "string | null",
  "soil_class": "string | null",
  "columns": [
    {
      "id": "S1",
      "floor": "1",
      "width_mm": 400,
      "depth_mm": 400,
      "longitudinal": [{"count": 8, "diameter_mm": 20, "steel_class": "S420", "position": "side"}],
      "stirrup": {
        "diameter_mm": 10, "spacing_mm": 200, "spacing_confinement_mm": 100,
        "hook_angle_deg": 135, "leg_count": 4, "crossties": 2
      },
      "concrete_cover_mm": 30,
      "concrete_class": "C30/37"
    }
  ],
  "notes": ["string"],
  "confidence": 0.85
}

If a field is not visible, set it to null. Do not hallucinate. Do not wrap the JSON in markdown.
"""

REBAR_DETECT_PROMPT = """You are analyzing a construction site photograph of a reinforced-concrete \
column BEFORE concrete is poured. Count and measure the rebar precisely.

Observe:
- detected_rebar_count: total number of longitudinal (vertical) rebars visible
- estimated_diameter_mm: estimated diameter class (12, 14, 16, 18, 20, 22, 25, 28, 32)
- estimated_spacing_mm: average center-to-center spacing of longitudinal rebars
- stirrup_visible: boolean — are transverse ties visible
- estimated_stirrup_spacing_mm: vertical spacing between stirrups
- crossties_visible: number of crossties visible per stirrup
- reference_marker_found: boolean — is a calibration marker/ruler/known-size object present
- notes: anything relevant (rust, deformation, missing ties, alignment issues)

Respond ONLY as JSON:
{
  "detected_rebar_count": 8,
  "estimated_diameter_mm": 20,
  "estimated_spacing_mm": null,
  "stirrup_visible": true,
  "estimated_stirrup_spacing_mm": 200,
  "crossties_visible": 2,
  "reference_marker_found": false,
  "notes": ["string"]
}

Be conservative. If you cannot count precisely, pick a tight range and note the uncertainty.
Do not wrap in markdown.
"""

MATERIAL_PROMPT = """Analyze this rebar close-up photo for:
- detected_steel_class: read any text on the rebar (S420, B500C, BST500, etc.), else null
- corrosion_level: integer 0 (clean) to 3 (severe pitting)
- surface_condition: one of "clean", "light_rust", "flaking", "pitting"
- summary: one-sentence verdict in English

Respond ONLY as JSON:
{"detected_steel_class": "S420", "corrosion_level": 1, "surface_condition": "light_rust", "summary": "string"}
"""

COVER_PROMPT = """Estimate the concrete cover (distance from the outermost rebar to the form \
surface) in this photo in millimeters.

A reference marker in the photo is required for accurate estimation.

Respond ONLY as JSON:
{
  "estimated_cover_mm": 30,
  "within_tolerance": true,
  "reference_used": "tape_measure" | "standard_spacer" | "ruler" | null,
  "summary": "string in English"
}

If no reference is visible, set estimated_cover_mm to null and explain in summary.
"""
