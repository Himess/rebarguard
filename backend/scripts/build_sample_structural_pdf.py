"""Generate a synthetic but realistic Turkish-style structural drawing PDF.

Data mirrors the `/api/demo/fistik` seed exactly so the PDF parse and the
seeded project end up with the same column / beam / wall schedule. Output
lands at `data/sample_projects/fistik-sample-statik.pdf` and is checked into
the repo so the `/upload` page's "Try with sample sheet" button can fetch
it without the demo depending on aspose-cad / DWG TrueView.

Why generate it: real Turkish statik projeler are paywalled or proprietary,
and the user's own DWG only opens in a paid CAD viewer. ReportLab gives us
the same column-schedule table format Turkish engineers actually publish
(parsel / kolon ID / kesit / boyuna donatı / etriye / paspayı), so Kimi can
OCR it the same way it would read a real plotted-to-PDF drawing.

Run:
    cd backend
    uv run python scripts/build_sample_structural_pdf.py
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _register_unicode_font() -> str:
    """Try to register a TTF that handles Turkish glyphs (ı, ş, ğ, …).

    Falls back to Helvetica if no system TTF is found — the Turkish chars then
    render as boxes, but the document still builds. Reportlab default Helvetica
    is Latin-1 only.
    """
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont("RG-Sans", path))
                return "RG-Sans"
            except Exception:
                continue
    return "Helvetica"


FONT = _register_unicode_font()

PROJECT = "1340 ADA 43 PARSEL"
ENGINEER = "İnş. Müh. Ferhat Baş"
LICENSE = "10HL-0364"
DATE = "20.11.2022"

# Mirror of routers/demo.py seed_fistik() — keep these in sync.
COLUMN_IDS = ["S1", "S2", "S3", "S4", "S5", "S6"]
FLOORS = [
    ("2. BODRUM", "B2"),
    ("1. BODRUM", "B1"),
    ("ZEMİN KAT", "Z"),
    ("1. KAT", "1"),
    ("2. KAT", "2"),
    ("3. KAT", "3"),
    ("4. KAT", "4"),
    ("ÇATI KAT", "ÇK"),
]


def _title_block(canvas, doc) -> None:  # noqa: ARG001
    """Draw a structural-sheet style title cartouche in the bottom-right."""
    w, h = landscape(A3)
    cx = w - 12 * mm
    cy = 10 * mm
    bw = 90 * mm
    bh = 20 * mm
    canvas.saveState()
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(0.6)
    canvas.rect(cx - bw, cy, bw, bh)
    canvas.line(cx - bw, cy + 10 * mm, cx, cy + 10 * mm)
    canvas.line(cx - bw + 45 * mm, cy + 10 * mm, cx - bw + 45 * mm, cy + bh)
    canvas.setFont(FONT, 8)
    canvas.drawString(cx - bw + 2, cy + bh - 3.5 * mm, "PROJE")
    canvas.drawString(cx - bw + 47 * mm, cy + bh - 3.5 * mm, "MÜHENDİS")
    canvas.drawString(cx - bw + 2, cy + 6 * mm, "PAFTA")
    canvas.drawString(cx - bw + 25 * mm, cy + 6 * mm, "TARİH")
    canvas.drawString(cx - bw + 50 * mm, cy + 6 * mm, "ÖLÇEK")
    canvas.drawString(cx - bw + 75 * mm, cy + 6 * mm, "SAYFA")
    canvas.setFont(FONT, 9)
    canvas.drawString(cx - bw + 2, cy + 11 * mm, PROJECT)
    canvas.drawString(cx - bw + 47 * mm, cy + 11 * mm, f"{ENGINEER} · {LICENSE}")
    canvas.setFont(FONT, 8)
    canvas.drawString(cx - bw + 2, cy + 1.5 * mm, "S-04 KOLON DONATI")
    canvas.drawString(cx - bw + 25 * mm, cy + 1.5 * mm, DATE)
    canvas.drawString(cx - bw + 50 * mm, cy + 1.5 * mm, "1:50")
    canvas.drawString(
        cx - bw + 75 * mm, cy + 1.5 * mm, f"{canvas.getPageNumber()} / 3"
    )
    canvas.restoreState()


def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName=FONT,
            fontSize=18,
            spaceAfter=4,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=FONT,
            fontSize=11,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName=FONT,
            fontSize=8,
            leading=10,
        ),
    }


def _column_schedule_rows() -> list[list[str]]:
    """Build the column-schedule table rows.

    Header: Kolon | Kat | Kesit (b×h) | Boyuna Donatı | Etriye | Paspayı | Beton
    Body:   one row per (floor, column) pair — same shape as a real Türk
    "kolon donatı paftası".
    """
    rows: list[list[str]] = [
        ["KOLON", "KAT", "KESİT (b×h cm)", "BOYUNA DONATI", "ETRİYE", "PASPAYI (mm)", "BETON SINIFI"],
    ]
    for floor_label, _floor_short in FLOORS:
        for col in COLUMN_IDS:
            rows.append(
                [
                    f"{col}-{_floor_short(floor_label)}",
                    floor_label,
                    "40 × 40",
                    "8Ø20",
                    "Ø10/100 (sarılma) · Ø10/200 (orta)",
                    "30",
                    "C30/37",
                ]
            )
    return rows


def _floor_short(label: str) -> str:
    short_map = {
        "2. BODRUM": "B2",
        "1. BODRUM": "B1",
        "ZEMİN KAT": "Z",
        "1. KAT": "1",
        "2. KAT": "2",
        "3. KAT": "3",
        "4. KAT": "4",
        "ÇATI KAT": "ÇK",
    }
    return short_map.get(label, label[:2])


def _shear_wall_rows() -> list[list[str]]:
    return [
        [
            "PERDE",
            "KAT ARALIĞI",
            "KESİT (mm × m)",
            "DİKEY DONATI",
            "YATAY DONATI",
            "UÇ BÖLGE",
            "ETRİYE",
            "PASPAYI",
        ],
        [
            "P1",
            "B2 → ÇK",
            "250 × 1.50",
            "20Ø12",
            "30Ø10",
            "6Ø16",
            "Ø10/150",
            "25 mm",
        ],
        [
            "P2",
            "B2 → ÇK",
            "250 × 1.50",
            "20Ø12",
            "30Ø10",
            "—",
            "Ø10/150",
            "25 mm",
        ],
    ]


def _beam_rows() -> list[list[str]]:
    rows = [
        ["KİRİŞ", "KAT", "AKS", "KESİT (cm)", "ÜST DONATI", "ALT DONATI", "ETRİYE", "PASPAYI"],
    ]
    for floor in ("ZEMİN", "1", "2", "3", "4", "ÇATI"):
        rows.append(
            [
                f"K{floor}-A",
                floor + " KAT" if floor.isdigit() or floor == "ÇATI" else floor,
                "A",
                "25 × 50",
                "4Ø20",
                "3Ø16",
                "Ø10/200 · 2 kollu",
                "25 mm",
            ]
        )
    return rows


def _table(rows: list[list[str]], col_widths: list[float]) -> Table:
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, 0), FONT, 9),
                ("FONT", (0, 1), (-1, -1), FONT, 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202830")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#444")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f5f7")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return t


def _project_metadata_table() -> Table:
    rows = [
        ["PROJE", PROJECT],
        ["MÜHENDİS", f"{ENGINEER} · {LICENSE}"],
        ["TARİH", DATE],
        ["ŞEHİR / İLÇE", "İstanbul"],
        ["DEPREM BÖLGESİ", "Zone 1 · PGA = 0.43 g"],
        ["ZEMİN SINIFI", "ZC"],
        ["KAT SAYISI", "6 normal + 2 bodrum (toplam 8)"],
        ["BİNA YÜKSEKLİĞİ", "24.0 m"],
        ["TABAN ALANI", "7.95 m × 15.00 m"],
        ["BETON SINIFI", "BS30 (C30/37)"],
        ["DONATI SINIFI", "B420C (S420)"],
        ["BETON METRAJI", "466.75 m³"],
        ["DONATI METRAJI", "58 514 kg"],
        ["KALIP METRAJI", "2 280 m²"],
    ]
    t = Table(rows, colWidths=[55 * mm, 130 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), FONT, 9),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eeeff2")),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ALIGN", (1, 0), (1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#888")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def build(out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=landscape(A3),
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=35 * mm,
    )
    styles = _build_styles()
    story: list = []

    # ---------------- Page 1 — project metadata + column schedule ----------------
    story.append(Paragraph(f"<b>{PROJECT}</b> · STATİK PROJE", styles["title"]))
    story.append(
        Paragraph(
            f"İnş. Müh. {ENGINEER.split(' ', 2)[-1]} · Lisans no: {LICENSE} · {DATE}",
            styles["small"],
        )
    )
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("PROJE METADATA", styles["h2"]))
    story.append(_project_metadata_table())
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("KOLON DONATI TABLOSU (S-04)", styles["h2"]))
    rows = [["KOLON", "KAT", "KESİT (b×h cm)", "BOYUNA DONATI", "ETRİYE", "PASPAYI (mm)", "BETON"]]
    for floor_label, floor_short in FLOORS:
        for col in COLUMN_IDS:
            rows.append(
                [
                    f"{col}-{floor_short}",
                    floor_label,
                    "40 × 40",
                    "8Ø20",
                    "Ø10/100 sarılma · Ø10/200 orta",
                    "30",
                    "C30/37",
                ]
            )
    story.append(_table(rows, [22 * mm, 30 * mm, 28 * mm, 28 * mm, 70 * mm, 25 * mm, 22 * mm]))

    story.append(PageBreak())

    # ---------------- Page 2 — shear walls + beams ----------------
    story.append(Paragraph(f"<b>{PROJECT}</b> · PERDE / KİRİŞ DETAYLARI", styles["title"]))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("PERDE DONATI TABLOSU (S-05)", styles["h2"]))
    story.append(
        _table(_shear_wall_rows(), [18 * mm, 28 * mm, 28 * mm, 25 * mm, 25 * mm, 22 * mm, 22 * mm, 22 * mm])
    )
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("KİRİŞ DONATI TABLOSU (S-06)", styles["h2"]))
    story.append(
        _table(_beam_rows(), [22 * mm, 25 * mm, 18 * mm, 25 * mm, 25 * mm, 25 * mm, 35 * mm, 22 * mm])
    )
    story.append(Spacer(1, 8 * mm))

    story.append(
        Paragraph(
            "<b>NOTLAR.</b> Tüm kolonlarda etriye sarılma bölgesi alt + üst 1/4 kat yüksekliğindedir. "
            "Etriye uçları 135° kanca ile bağlanacaktır. Tüm donatı sınıfı B420C (S420). "
            "Tüm beton sınıfı C30/37 (BS30). Paspayı toleransı ±5 mm. TBDY 2018 §7.3.4–7.3.6 ve TS 500 §7.3 uygulanır.",
            styles["small"],
        )
    )

    story.append(PageBreak())

    # ---------------- Page 3 — column elevation schematic ----------------
    story.append(Paragraph(f"<b>{PROJECT}</b> · KOLON APLİKASYON KROKİSİ", styles["title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "Kolonlar 6 adet (S1–S6), 3×2 aks ızgarasında. Tüm katlarda kesit 40 × 40 cm; "
            "boyuna donatı 8Ø20 (köşe + kenar); etriye Ø10/100 (sarılma bölgesi) ve Ø10/200 "
            "(orta bölge). Perde elemanları P1 (çekirdek) ve P2 (merdiven) tüm yükseklikte 250 mm "
            "kalınlığında 1.50 m boyunda. Kirişler her katta tek aksta K-A profilinde 25 × 50 cm.",
            styles["small"],
        )
    )
    story.append(Spacer(1, 6 * mm))

    schematic_rows = [
        ["", "AKS A", "AKS B", "AKS C"],
        ["AKS 1", "S1 (40×40)", "S2 (40×40)", "S3 (40×40)"],
        ["AKS 2", "S4 (40×40)", "S5 (40×40)", "S6 (40×40)"],
    ]
    t = Table(schematic_rows, colWidths=[28 * mm, 60 * mm, 60 * mm, 60 * mm], rowHeights=[10 * mm, 38 * mm, 38 * mm])
    t.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), FONT, 11),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202830")),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#202830")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("TEXTCOLOR", (0, 1), (0, -1), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#444")),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 6 * mm))

    story.append(
        Paragraph(
            "<b>UYARI.</b> Bu pafta RebarGuard demo amaçlı sentetik bir örnektir. Gerçek bir "
            "yapı denetiminde kullanmayınız. Veriler 1340 Ada 43 Parsel projesinin metadata "
            "ve metraj özetinden türetilmiştir.",
            styles["small"],
        )
    )

    doc.build(story, onFirstPage=_title_block, onLaterPages=_title_block)
    print(f"OK · {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    out = repo_root / "data" / "sample_projects" / "fistik-sample-statik.pdf"
    build(out)
