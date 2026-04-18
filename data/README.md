# RebarGuard — Data

## Structure

```
data/
  regulations/      # TBDY 2018, TS 500 PDFs (for RAG)
  sample_projects/  # Approved structural drawings (PDFs) for testing PlanParser
  rebar_photos/     # Site photos for Kimi-VL rebar detection testing
```

## Regulations

- **TBDY 2018** (`TBDY_2018.pdf`) — Türkiye Bina Deprem Yönetmeliği, downloaded from AFAD official source: https://www.afad.gov.tr/kurumlar/afad.gov.tr/2309/files/TBDY_2018.pdf
- **TS 500** — Betonarme Yapıların Tasarım ve Yapım Kuralları. TSE paywall; use academic summaries (İMO ders notları) as fallback.

## Rebar detection datasets (open source)

Recommended sources to seed `rebar_photos/` for Kimi-VL smoke tests:

| Source | Size | Notes |
|--------|------|-------|
| [Roboflow: isupervision/rebar-counting](https://universe.roboflow.com/isupervision/rebar-counting) | 250 images | Pre-trained model available |
| [Roboflow: Mohxfas/rebar-counting-e01uk v15](https://universe.roboflow.com/mohxfas/rebar-counting-e01uk/dataset/15) | 238 images | Multiple formats |
| [Roboflow: hof/rebar](https://universe.roboflow.com/hof/rebar) | 250 images | |
| [Roboflow: robobond/rebar-segment](https://universe.roboflow.com/robobond/rebar-segment-ysgc1-ogrpj) | 100 images | Spacing/intersection focus |
| [GitHub: Imama-Kainat/Rebar_Counter_ProjectLAB](https://github.com/Imama-Kainat/Rebar_Counter_ProjectLAB) | — | Reference implementation |

### Downloading (requires Roboflow account + API key)

```python
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_KEY")
project = rf.workspace("isupervision").project("rebar-counting")
dataset = project.version(1).download("yolov8", location="./rebar_photos/isupervision")
```

## Sample projects (Turkish structural drawings)

Target 3-4 real reinforced-concrete project PDFs for Phase-1 PlanParser testing.

Sources to try:
- Academic course materials (İnşaat mühendisliği lisans)
- Open portfolios on LinkedIn / academia.edu
- Self-generated with IdeCAD / ProtaStructure demo (if licenses allow)

Keep PDFs in `sample_projects/` — git-ignored by default except README.

## Kahramanmaraş open data (for demo narrative)

- AFAD post-earthquake damage assessment reports (public)
- TEHIS (Türkiye Deprem Tehlike Haritası) https://tdth.afad.gov.tr/

Use ONLY for the demo-video opening segment, not as a core feature.
