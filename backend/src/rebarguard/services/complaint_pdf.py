"""Builds the citizen complaint petition PDF.

Why ReportLab + a hand-laid page rather than a templating library: this PDF is
small (1-2 pages), needs strict control of the disclaimer block, and we want
zero external service dependency at petition time.

The output is intentionally formal — a Turkish citizen will paste the cover
letter into CIMER's free-text field and attach this PDF as the supporting
document. Everything user-supplied gets escaped before rendering.
"""

from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from io import BytesIO
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from rebarguard.rag import lookup as lookup_article

if TYPE_CHECKING:
    from rebarguard.routers.complaints import ComplaintDraft

# Brand colour from the OKLCH design system, expressed as a sRGB approximation
# acceptable for ReportLab. --hazard ≈ #FF6A1F.
HAZARD = colors.HexColor("#FF6A1F")
INK = colors.HexColor("#0E1116")
MUTED = colors.HexColor("#5A6573")
RULE = colors.HexColor("#D7DCE3")
SEVERITY_COLOR = {
    "fail": colors.HexColor("#D8443B"),
    "warn": colors.HexColor("#E0A93D"),
    "info": colors.HexColor("#3B7FD8"),
}


def _hexweb(col: colors.Color) -> str:
    """ReportLab's `<font color='...'>` markup needs a leading `#`. The
    `Color.hexval()` method returns `0xRRGGBB`, so we strip and prefix."""
    return "#" + col.hexval()[2:]


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    base["BodyText"].fontName = "Helvetica"
    base["BodyText"].fontSize = 10
    base["BodyText"].leading = 14
    base["BodyText"].alignment = TA_JUSTIFY
    base["BodyText"].textColor = INK

    base.add(
        ParagraphStyle(
            name="HeaderTitle",
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=INK,
            spaceAfter=2,
        )
    )
    base.add(
        ParagraphStyle(
            name="HeaderSub",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            spaceAfter=10,
        )
    )
    base.add(
        ParagraphStyle(
            name="SectionHead",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=HAZARD,
            spaceBefore=10,
            spaceAfter=4,
        )
    )
    base.add(
        ParagraphStyle(
            name="Mono",
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=MUTED,
        )
    )
    base.add(
        ParagraphStyle(
            name="GradeBig",
            fontName="Helvetica-Bold",
            fontSize=42,
            leading=46,
            alignment=TA_CENTER,
            textColor=HAZARD,
        )
    )
    base.add(
        ParagraphStyle(
            name="Disclaimer",
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_LEFT,
        )
    )
    return base


def _grade_band(g: int) -> tuple[str, colors.Color]:
    if g >= 80:
        return "OK", colors.HexColor("#3D9F4D")
    if g >= 60:
        return "RİSKLİ", colors.HexColor("#E0A93D")
    return "AĞIR RİSK", colors.HexColor("#D8443B")


def build_complaint_pdf(draft: ComplaintDraft) -> bytes:
    """Render the full petition. Returns raw bytes ready to stream to the client."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="RebarGuard — Yapı Denetim Ihbar Dilekçesi",
        author="RebarGuard",
    )
    styles = _styles()
    story: list = []

    # ---------- header band ----------
    now = datetime.now(UTC)
    addr = draft.address
    story.append(Paragraph("RebarGuard", styles["HeaderTitle"]))
    story.append(
        Paragraph(
            f"Yapı Denetim Ihbar Dilekçesi · {now:%d %B %Y} · "
            f"AI-destekli ön değerlendirme · rebarguard.vercel.app",
            styles["HeaderSub"],
        )
    )
    story.append(HRFlowable(width="100%", thickness=0.6, color=HAZARD, spaceAfter=10))

    # ---------- top summary card: grade + address ----------
    grade_label, grade_col = _grade_band(draft.grade)
    summary = [
        [
            Paragraph(f"<b>{draft.grade}</b><br/><font size=8 color='#5A6573'>/ 100</font>",
                      styles["GradeBig"]),
            _address_block(addr, styles),
        ]
    ]
    summary_table = Table(summary, colWidths=[40 * mm, 116 * mm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F4F6FA")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FAFBFC")),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("TEXTCOLOR", (0, 0), (0, 0), grade_col),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 4))
    grade_hex = _hexweb(grade_col)
    story.append(
        Paragraph(
            f"<font color='{grade_hex}'><b>{grade_label}</b></font> "
            "— bulgular AI ön değerlendirmesidir, hukuki bağlayıcılığı yoktur.",
            styles["Mono"],
        )
    )

    # ---------- cover letter ----------
    story.append(Paragraph("Konu", styles["SectionHead"]))
    story.append(
        Paragraph(
            _cover_letter(draft, grade_label),
            styles["BodyText"],
        )
    )

    # ---------- findings table ----------
    story.append(Paragraph("Tespit edilen bulgular", styles["SectionHead"]))
    story.append(_findings_table(draft, styles))

    # ---------- regulation excerpts ----------
    cited = _cited_articles(draft)
    if cited:
        story.append(Paragraph("Atıfta bulunulan mevzuat", styles["SectionHead"]))
        for code, title, excerpt in cited:
            story.append(
                Paragraph(
                    f"<b>{escape(code)}</b> &mdash; {escape(title)}",
                    styles["BodyText"],
                )
            )
            story.append(Paragraph(escape(excerpt), styles["BodyText"]))
            story.append(Spacer(1, 4))

    # ---------- citizen note ----------
    if draft.note.strip():
        story.append(Paragraph("Vatandaş notu", styles["SectionHead"]))
        story.append(Paragraph(escape(draft.note), styles["BodyText"]))

    # ---------- signature block ----------
    story.append(Spacer(1, 14))
    story.append(_signature_block(draft, styles))

    # ---------- how to file ----------
    story.append(Spacer(1, 8))
    story.append(KeepTogether(_how_to_file(styles)))

    # ---------- disclaimer ----------
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.4, color=RULE, spaceAfter=4))
    story.append(
        Paragraph(
            (
                "<b>YASAL UYARI.</b> Bu belge RebarGuard tarafından üretilmiş "
                "yapay-zeka destekli bir <i>ön değerlendirme raporudur</i>. "
                "Kesin tespit ve hukuki süreç için lisanslı bir Yapı Denetim "
                "kuruluşunun saha incelemesi gerekir. RebarGuard, üretilen "
                "değerlendirmenin doğruluğu, eksiksizliği veya bir mahkeme "
                "süreci için yeterliliği konusunda hiçbir garanti vermez. "
                "Bu rapora dayanarak yapılan iddiaların hukuki sorumluluğu "
                "rapor sahibine aittir."
            ),
            styles["Disclaimer"],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "RebarGuard · Hermes Agent + Kimi K2.6 · "
            f"Belge no: RG-DRAFT-{now:%Y%m%d-%H%M%S}",
            styles["Mono"],
        )
    )

    doc.build(story)
    return buf.getvalue()


# --------------------------- helpers --------------------------------------


def _address_block(addr, styles) -> Paragraph:
    parts = []
    if addr.parcel_no:
        parts.append(f"<b>Parsel:</b> {escape(addr.parcel_no)}")
    if addr.full_address:
        parts.append(f"<b>Adres:</b> {escape(addr.full_address)}")
    if addr.district or addr.city:
        loc = " / ".join(filter(None, [addr.district, addr.city]))
        parts.append(f"<b>İlçe / İl:</b> {escape(loc)}")
    if addr.contractor_name:
        parts.append(f"<b>Müteahhit:</b> {escape(addr.contractor_name)}")
    if addr.apartment_no:
        parts.append(f"<b>Daire:</b> {escape(addr.apartment_no)}")
    if not parts:
        parts.append("<i>Adres alanı doldurulmamış</i>")
    return Paragraph("<br/>".join(parts), styles["BodyText"])


def _cover_letter(draft, grade_label: str) -> str:
    addr = draft.address
    where = addr.full_address or addr.parcel_no or "tanımlı parsel"
    contractor = (
        f" Müteahhit: <b>{escape(addr.contractor_name)}</b>." if addr.contractor_name else ""
    )
    fail_count = sum(1 for f in draft.findings if f.severity == "fail")
    warn_count = sum(1 for f in draft.findings if f.severity == "warn")
    return (
        f"İlgili makama, kat karşılığı sözleşme veya satış yoluyla daire sahibi "
        f"olduğum/olabileceğim <b>{escape(where)}</b> adresindeki yapının inşaat "
        f"sürecinde RebarGuard üzerinden alınan AI ön değerlendirmesinde "
        f"<b>{draft.grade}/100</b> kalite skoru ve "
        f"<b>{fail_count} kritik</b>, <b>{warn_count} uyarı</b> niteliğinde bulgu "
        f"tespit edilmiştir.{contractor} Genel risk seviyesi "
        f"<b>{escape(grade_label)}</b> olarak işaretlenmiştir.<br/><br/>"
        "TBDY 2018 ve TS 500 hükümleri kapsamında bağımsız bir Yapı Denetim "
        "incelemesi yapılması ve gerektiğinde dökümün durdurulması talebimi iletirim."
    )


def _findings_table(draft, styles) -> Table:
    head = [
        Paragraph("<b>#</b>", styles["BodyText"]),
        Paragraph("<b>Sev.</b>", styles["BodyText"]),
        Paragraph("<b>Bulgu</b>", styles["BodyText"]),
        Paragraph("<b>Conf.</b>", styles["BodyText"]),
        Paragraph("<b>Atıf</b>", styles["BodyText"]),
    ]
    rows = [head]
    for i, f in enumerate(draft.findings, 1):
        sev_col = SEVERITY_COLOR.get(f.severity, MUTED)
        rows.append(
            [
                Paragraph(str(i), styles["BodyText"]),
                Paragraph(
                    f"<font color='{_hexweb(sev_col)}'><b>{f.severity.upper()}</b></font>",
                    styles["BodyText"],
                ),
                Paragraph(
                    f"<b>{escape(f.title)}</b><br/>{escape(f.detail or '')}",
                    styles["BodyText"],
                ),
                Paragraph(f"{round(f.confidence * 100)}%", styles["BodyText"]),
                Paragraph(escape(f.ref or "—"), styles["Mono"]),
            ]
        )
    table = Table(rows, colWidths=[8 * mm, 16 * mm, 80 * mm, 16 * mm, 36 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F6FA")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, INK),
                ("INNERGRID", (0, 1), (-1, -1), 0.25, RULE),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _cited_articles(draft) -> list[tuple[str, str, str]]:
    """For each unique RAG-validated ref in the findings, look up the curated
    article and emit (code, Turkish title, short excerpt)."""
    seen: set[str] = set()
    out: list[tuple[str, str, str]] = []
    for f in draft.findings:
        if not f.ref or f.ref in seen:
            continue
        article = lookup_article(f.ref)
        if not article:
            continue
        seen.add(f.ref)
        # Trim to ~340 characters so the petition stays under 2 pages.
        text = article.text_tr.strip()
        if len(text) > 340:
            text = text[:337].rstrip() + "…"
        out.append((article.code, article.title_tr, text))
    return out


def _signature_block(draft, styles) -> Table:
    name = draft.citizen_name or "[Ad / Soyad]"
    contact = draft.citizen_contact or "[E-posta veya telefon]"
    today = datetime.now(UTC).strftime("%d.%m.%Y")
    rows = [
        [
            Paragraph(
                f"<b>Tarih:</b> {today}<br/><b>Şikâyet eden:</b> {escape(name)}<br/>"
                f"<b>İletişim:</b> {escape(contact)}",
                styles["BodyText"],
            ),
            Paragraph("<i>İmza</i><br/><br/><br/>__________________", styles["BodyText"]),
        ]
    ]
    table = Table(rows, colWidths=[100 * mm, 56 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _how_to_file(styles) -> list:
    return [
        Paragraph("Bu dilekçeyi nasıl iletirsiniz?", styles["SectionHead"]),
        Paragraph(
            "1) <b>e-Devlet → CIMER</b> → 'Cumhurbaşkanlığı İletişim Merkezi' başvuru "
            "formuna bu PDF'i ek olarak yükleyin. Konu: 'Yapı Denetim — TBDY 2018 "
            "ihlali şüphesi'.<br/>"
            "2) <b>İlçe Belediyesi Yapı Kontrol Müdürlüğü</b> şahsen başvuru — bu "
            "PDF + tapu fotokopisi.<br/>"
            "3) <b>Çevre, Şehircilik ve İklim Değişikliği Bakanlığı</b> Yapı "
            "Denetim Genel Müdürlüğü dilekçesi (csb.gov.tr).<br/>"
            "Önemli: ihbarınızı kişisel bilgilerinizle imzalayın; anonim ihbarlar "
            "yasal süreç başlatmak için yeterli olmayabilir.",
            styles["BodyText"],
        ),
    ]
