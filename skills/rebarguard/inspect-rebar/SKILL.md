---
name: inspect-rebar
description: Use when given a site photo of a reinforced-concrete column BEFORE the concrete is poured. Counts and measures rebar precisely for RebarGuard's geometry check.
version: 0.1.0
author: RebarGuard
license: MIT
metadata:
  hermes:
    tags: [structural-engineering, construction-inspection, rebarguard, vision]
    related_skills: [parse-structural-plan, moderate-inspection]
---

# Inspect Rebar

## Overview

You are analyzing a construction-site photograph of an RC column before concrete is
poured. Produce a structured rebar-detection report.

## When to use

- User attaches a single site photo of exposed rebar.
- Goal: JSON output for the GeometryAgent diff (plan vs. site).

## Output schema (strict JSON — no markdown)

```json
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
```

## Rules

- `detected_rebar_count` = total longitudinal (vertical) rebars visible.
- `estimated_diameter_mm` from {12, 14, 16, 18, 20, 22, 25, 28, 32}; pick the closest. If
  uncertain, pick a range-midpoint and note it.
- `estimated_stirrup_spacing_mm` = vertical distance between two consecutive stirrups.
- `crossties_visible` = number of internal ties (çiroz) per stirrup visible.
- `reference_marker_found`: true if any tape, ruler, person, or known-size object is in
  the frame that allows size calibration.
- Be conservative. If ambiguous, say so in `notes` and lower your stated counts.
- Do NOT count stirrup wires as longitudinal rebars.
- Do NOT guess beyond what is visible.

## Critical: respond with the JSON object only. No prose, no code fences.
