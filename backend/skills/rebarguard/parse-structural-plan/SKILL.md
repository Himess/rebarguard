---
name: parse-structural-plan
description: Use when given an approved reinforced-concrete (RC) structural drawing page. Extracts project metadata and ALL structural elements (columns, beams, slabs, shear walls, stairs) into a strict JSON schema that RebarGuard downstream agents consume.
version: 0.2.0
author: RebarGuard
license: MIT
metadata:
  hermes:
    tags: [structural-engineering, ocr, rc, rebarguard, vision, multi-element]
    related_skills: [inspect-rebar, moderate-inspection]
---

# Parse Structural Plan

## Overview

You are a senior structural engineer reading a municipality-approved RC drawing. Your
job is to extract BOTH project metadata and EVERY structural element visible on the page.

## When to use

- User attaches a single PDF page image of an approved RC structural drawing.
- Goal: produce a `StructuralPlan` JSON consumable by PlanParserAgent → GeometryAgent → CodeAgent.

## Output schema (strict JSON — no markdown fences)

```json
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
  "columns": [
    {
      "id": "S1",
      "floor": "1",
      "position": {"x_m": 0.0, "y_m": 0.0},
      "width_mm": 400,
      "depth_mm": 400,
      "longitudinal": [{"count": 8, "diameter_mm": 20, "steel_class": "S420", "position": "side"}],
      "stirrup": {"diameter_mm": 10, "spacing_mm": 200, "spacing_confinement_mm": 100, "hook_angle_deg": 135, "leg_count": 4, "crossties": 2},
      "concrete_cover_mm": 30,
      "concrete_class": "C30/37"
    }
  ],
  "beams": [
    {
      "id": "K101",
      "floor": "1",
      "start": {"x_m": 0.0, "y_m": 0.0},
      "end":   {"x_m": 5.0, "y_m": 0.0},
      "width_mm": 250,
      "depth_mm": 500,
      "top_rebar":    [{"count": 4, "diameter_mm": 20, "steel_class": "S420"}],
      "bottom_rebar": [{"count": 3, "diameter_mm": 16, "steel_class": "S420"}],
      "stirrup": {"diameter_mm": 10, "spacing_mm": 200, "hook_angle_deg": 135, "leg_count": 2, "crossties": 0},
      "concrete_cover_mm": 25,
      "concrete_class": "C30/37"
    }
  ],
  "slabs": [
    {
      "id": "D1",
      "floor": "1",
      "corners_m": [{"x_m":0,"y_m":0},{"x_m":5,"y_m":0},{"x_m":5,"y_m":4},{"x_m":0,"y_m":4}],
      "thickness_mm": 150,
      "mesh_bottom": {"diameter_mm": 8, "spacing_mm": 150, "direction": "both", "layer": "bottom"},
      "mesh_top":    null,
      "concrete_cover_mm": 25,
      "concrete_class": "C25/30"
    }
  ],
  "shear_walls": [
    {
      "id": "P1",
      "floor_from": "foundation",
      "floor_to": "roof",
      "start": {"x_m": 0, "y_m": 0},
      "end":   {"x_m": 3, "y_m": 0},
      "thickness_mm": 250,
      "length_m": 3.0,
      "vertical_rebar":   [{"count": 20, "diameter_mm": 14, "steel_class": "S420"}],
      "horizontal_rebar": [{"count": 30, "diameter_mm": 10, "steel_class": "S420"}],
      "concrete_cover_mm": 25,
      "concrete_class": "C30/37"
    }
  ],
  "stairs": [],
  "notes": [],
  "confidence": 0.85
}
```

## Rules

- Unseen fields → `null`. Never invent.
- Only include an element when you can read at least its id and cross-section.
- Turkish drawing codes: S420/S500 steel, C25/30–C35/45 concrete, Zone 1–4, ZA–ZE soil.
- Crosstie (çiroz) count >= 2 is typical; stirrup hook 135° for seismic.
- For walls spanning floors, specify `floor_from` and `floor_to`.
- Respond with the JSON object ONLY.
