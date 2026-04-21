"""Prompt templates for Kimi K2.5 vision calls."""

PLAN_PARSE_PROMPT = """You are a senior structural engineer analyzing an approved \
reinforced-concrete (RC) structural drawing page. Extract the project metadata and ALL \
structural elements on this page into strict JSON.

Look for these items:

METADATA (title block + first sheet):
- project_name
- owner_name, contractor_name, engineer_name, engineer_license
- address / district / city / country
- coordinates (latitude/longitude if printed; else null)
- parcel_no
- earthquake_zone ("Zone 1 (highest)" / "Zone 2" / "Zone 3" / "Zone 4 (lowest)")
- peak_ground_acceleration_g (from TBDY map if shown)
- soil_class (ZA | ZB | ZC | ZD | ZE)
- seismic_design_class (TBDY DTS: 1, 2, 3, 4)
- floor_count, basement_count
- default_floor_height_m (usually 2.8-3.2), total_height_m
- footprint_width_m, footprint_depth_m (from plan dimensions)

ELEMENTS (columns, beams, slabs, shear walls, stairs):

COLUMNS:
- id, floor, position (x_m, y_m) if axis grid is visible
- width_mm × depth_mm
- longitudinal rebars: [{count, diameter_mm, steel_class, position}]
- stirrup: {diameter_mm, spacing_mm, spacing_confinement_mm, hook_angle_deg, leg_count, crossties}
- concrete_cover_mm, concrete_class

BEAMS (kirişler):
- id, floor, start/end positions in meters
- width_mm × depth_mm
- top_rebar, bottom_rebar: [{count, diameter_mm, steel_class}]
- stirrup: like columns
- concrete_cover_mm, concrete_class

SLABS (döşemeler):
- id, floor, corners_m (list of {x_m, y_m} polygon vertices)
- thickness_mm
- mesh_top / mesh_bottom: {diameter_mm, spacing_mm, direction}
- concrete_cover_mm, concrete_class

SHEAR WALLS (perde duvarlar):
- id, floor_from, floor_to, start/end positions, thickness_mm, length_m
- vertical_rebar, horizontal_rebar, boundary_element_rebar
- stirrup (if detailed), concrete_cover_mm, concrete_class

STAIRS (merdivenler):
- id, floor_from, floor_to, position, width_m, length_m
- rebar (simplified), concrete_class

OUTPUT FORMAT — respond with this JSON object only (no markdown fences, no prose):

{
  "metadata": {
    "project_name": "string",
    "owner_name": null,
    "contractor_name": null,
    "engineer_name": null,
    "engineer_license": null,
    "address": null,
    "district": null,
    "city": null,
    "country": "Türkiye",
    "coordinates": null,
    "parcel_no": null,
    "earthquake_zone": null,
    "peak_ground_acceleration_g": null,
    "soil_class": null,
    "seismic_design_class": null,
    "floor_count": null,
    "basement_count": 0,
    "default_floor_height_m": 3.0,
    "total_height_m": null,
    "footprint_width_m": null,
    "footprint_depth_m": null
  },
  "columns": [],
  "beams": [],
  "slabs": [],
  "shear_walls": [],
  "stairs": [],
  "notes": [],
  "confidence": 0.85
}

RULES:
- Set unseen fields to null. NEVER invent values.
- Only include an element if you can read at least its id and section.
- Merge your findings with any previous page's data (you'll see page context separately).
- Do NOT wrap in markdown fences. Output raw JSON only.
"""

REBAR_DETECT_PROMPT = """You are analyzing a construction-site photo of an RC element \
BEFORE concrete is poured. Count and measure the rebar precisely.

Observe:
- detected_rebar_count: number of longitudinal (main direction) rebars visible
- estimated_diameter_mm: one of {12, 14, 16, 18, 20, 22, 25, 28, 32}
- estimated_spacing_mm: center-to-center for longitudinal rebars if applicable
- stirrup_visible: are transverse ties visible?
- estimated_stirrup_spacing_mm: vertical distance between consecutive stirrups
- crossties_visible: count of crossties per stirrup
- reference_marker_found: any tape, ruler, person, or known-size object in frame
- notes: rust, deformation, misalignment, cold joint, etc.

Respond ONLY as JSON:
{
  "detected_rebar_count": 8,
  "estimated_diameter_mm": 20,
  "estimated_spacing_mm": null,
  "stirrup_visible": true,
  "estimated_stirrup_spacing_mm": 200,
  "crossties_visible": 2,
  "reference_marker_found": false,
  "notes": []
}

Be conservative. If unsure, pick a tight range and note the uncertainty. Do not count stirrups \
as longitudinal rebars. No markdown.
"""

MATERIAL_PROMPT = """Analyze this rebar close-up photo:
- detected_steel_class: read any text on the rebar (S420, B500C, BST500, etc.) else null
- corrosion_level: 0 (clean) → 3 (severe pitting)
- surface_condition: "clean" | "light_rust" | "flaking" | "pitting"
- summary: one sentence in English

Respond ONLY as JSON:
{"detected_steel_class": null, "corrosion_level": 0, "surface_condition": "clean", "summary": ""}
"""

COVER_PROMPT = """Estimate concrete cover (mm) from outermost rebar to form surface.
A reference marker in the frame is required for accurate measurement.

Respond ONLY as JSON:
{
  "estimated_cover_mm": null,
  "within_tolerance": false,
  "reference_used": null,
  "summary": ""
}

If no reference visible, set estimated_cover_mm to null and explain in summary.
"""

QUICK_SCAN_PROMPT_TEMPLATE = """You are a senior structural inspector reviewing a \
construction-site photograph for defects and safety issues per TBDY 2018 \
(Türkiye Bina Deprem Yönetmeliği) and TS 500. Identify up to 6 findings and return \
their bounding boxes for annotation.

For each issue, output:
- title: short English phrase (e.g. "Cover < 25mm", "Stirrup spacing drift", "Spacer missing")
- severity: one of "fail" | "warn" | "info"
    fail = violates code (reject the pour)
    warn = needs attention before pour
    info = observation, within tolerance
- bbox: bounding box in normalized image coordinates where top-left is (0,0) and
    bottom-right is (1,1). Provide x (left), y (top), w (width), h (height), all in [0,1].
- detail: 1–2 sentences explaining the issue and measurement if estimable
- ref: MUST be one of the exact citation codes from the WHITELIST below, or null. NEVER
    invent a code that is not on the whitelist.
- confidence: number in [0.0, 1.0] reflecting how certain you are from the photo
    (0.9+ = clearly visible and measurable, 0.6-0.9 = strong indication, <0.6 = guess)

Focus on: cover thickness, stirrup spacing, splice length, crossties, plastic spacer presence,
rebar alignment, corrosion, concrete honeycombing, formwork debris, and shoring adequacy.

WHITELIST of allowed `ref` values (use ONLY these):
{cheatsheet}

Respond ONLY as JSON with this exact shape — NO markdown, NO prose outside JSON:

{{
  "findings": [
    {{
      "title": "Cover < 25mm",
      "severity": "fail",
      "bbox": {{"x": 0.18, "y": 0.38, "w": 0.12, "h": 0.10}},
      "detail": "Bottom-left corner measures ~22mm concrete cover. TS 500 minimum is 25mm.",
      "ref": "TS 500 7.3",
      "confidence": 0.88
    }}
  ]
}}

If no defects are visible, return {{"findings": []}}. Be conservative: only flag what you
can actually see. Never invent measurements. Only cite codes on the whitelist.
"""


def build_quick_scan_prompt() -> str:
    """Materializes the quick-scan prompt with the current regulation whitelist.

    Callers must use this function (not the bare template) — the template's
    `{cheatsheet}` placeholder must be substituted with the runtime regulation list so
    Kimi only cites codes in `REGULATIONS`.
    """
    from rebarguard.rag import cheatsheet_for_prompt

    return QUICK_SCAN_PROMPT_TEMPLATE.format(cheatsheet=cheatsheet_for_prompt())
