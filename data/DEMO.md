# RebarGuard — Real Demo Project: "Fıstık Ağacı"

> Demo artifacts are git-ignored (they're bulky and private). This file records what
> we've tested against, so future sessions and the demo writeup can reference it.

## Project: 1340 Ada 43 Parsel

A genuine Turkish reinforced-concrete apartment project by **İnş. Müh. Ferhat Baş**.
Provided to us as:

| Artifact | Path | Notes |
|----------|------|-------|
| Full static DWG (AutoCAD 2017) | `Desktop/İNŞAAT FISTIK AĞACI/1340 ADA 43 PARSEL TÜM STATİK.dwg` | 4.9 MB — full structural design |
| ideCAD metraj report | `Desktop/İNŞAAT FISTIK AĞACI/1340.pdf` | 57 KB, 1 page — parsed via Kimi |
| Ground-floor plan | `zemin.pdf` | Architectural floor plan, footprint 7.95 × 15 m |
| Basement 1, 2 | `1.bodrum.pdf`, `2.bodrum.pdf` | |
| Normal floors 1-3, 4 | `1.2.3.normal.pdf`, `4.normal.pdf` | |
| Attic | `çatı arası.pdf` | |
| Site photos (×19) | `C:/Users/USER/Downloads/Telegram Desktop/İnşaat foto/photo_*.jpg` | Real construction photos from various pour phases |

## Extracted project metadata (via Kimi K2.6 on 1340.pdf)

| Field | Value |
|-------|-------|
| Engineer | Ferhat Baş |
| Parcel | 1340 ADA 43 PARSEL |
| Country | Türkiye |
| Floors | 6 normal + 2 basement |
| Footprint (zemin.pdf) | 7.95 m × 15.0 m |
| Design software | ideCAD 10.94 |
| Report date | 20.11.2022 |
| Project code | 10HL-0364 Statik (Betonarme+Çelik) |
| Concrete class | BS30 (466.75 m³) |
| Rebar steel class | B420C (58,514.02 kg ≈ 58.5 tons) |
| Formwork | 2,280.25 m² |

## Kimi K2.6 rebar-detection on real photos — validated

### `fistik-01.jpg` (retaining wall with timber formwork)

```json
{
  "detected_rebar_count": 20,
  "estimated_diameter_mm": 12,
  "estimated_spacing_mm": 175,
  "stirrup_visible": false,
  "element_type_guess": "wall",
  "notes": [
    "Deep excavation with inadequate timber shoring - safety concern for trench collapse",
    "Concrete cover appears insufficient - rebar may contact soil directly",
    "Excess soil and debris at trench bottom needs cleaning before pour",
    "No blinding layer visible - base should have lean concrete layer for clean placement",
    "Informal/site-built timber shoring suggests lower-budget construction"
  ]
}
```

Kimi flagged FIVE real-world issues on its first look — the kind of checks a human
inspector takes minutes to catalog. **This is the demo WOW moment.**

### `fistik-10.jpg` (foundation pit with 8 column cages mid-pour)

```json
{
  "detected_rebar_count": "approx across 8 cages",
  "estimated_diameter_mm": "20-25 (column longitudinal)",
  "stirrup_visible": true,
  "crossties_visible": "visible",
  "element_type_guess": "column",
  "element_count_in_frame": 8,
  "notes": [
    "Approximately 8 distinct column cages visible rising from the slab",
    "Foundation slab pour with starter columns for upper levels",
    "Concrete pump is actively pouring - wet concrete visible around rebar",
    "Wall starter bars visible on left retaining wall at ~15-20cm spacing",
    "Rebar diameter estimated 20-25mm based on scale relative to workers",
    "Internal crossties visible connecting middle bars of column faces",
    "Blue painted markings '+.95' and '2.90' suggest elevation levels for formwork"
  ]
}
```

Notes even the **elevation markings** (`+0.95`, `2.90`) painted on formwork.

## Demo video outline (using this project)

1. **Intro (30s):** "Meet Ferhat Baş, a civil engineer in Turkey. His project on 1340 Ada
   43 Parcel uses 58.5 tons of B420C rebar. Once concrete pours, the steel is invisible."
2. **Upload (15s):** drop `1340.pdf` + `zemin.pdf` into `/upload`. Kimi extracts metadata +
   footprint live.
3. **3D viewer (20s):** the full-building wireframe rotates — 6 floors, basement +2, columns
   on the 7.95 × 15 m footprint.
4. **Site inspection (90s):** upload `fistik-01.jpg`. Watch 7 agents debate:
   - PlanParser/Kimi: "20 rebars, Ø12, spacing 175mm, wall-type"
   - Fraud: EXIF check
   - Code: TBDY §7.6 wall rules
   - Risk: Turkish city zone × ZC soil
   - Material: no close-up, skipped
   - Cover: **insufficient cover flagged by Kimi**
   - Moderator: Hermes 4 70B synthesizes → CONDITIONAL
5. **Second run (30s):** upload `fistik-10.jpg`. Kimi counts 8 columns, reads elevation
   markings, flags safety notes. Verdict.
6. **Outro (15s):** "Public at rebarguard.app. Open-source. Built on Hermes Agent + Kimi K2.6
   for the Hermes Creative Hackathon 2026."

## Next steps with this project

- [ ] Convert `.dwg` to a PDF that shows the actual column schedule (structural sheets,
      not just architectural) — requires AutoCAD/LibreCAD on the user's machine.
- [ ] Upload every floor PDF to build a richer combined `StructuralPlan`.
- [ ] Curate 3-4 of the 19 photos as the "happy path" and 3-4 others as the "issues case".
- [ ] Phase the demo around one pour: "basement rebar installation → inspection → verdict".
