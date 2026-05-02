"""Builds the citizen complaint petition PDF.

Why ReportLab + a hand-laid page rather than a templating library: this PDF is
small (1-2 pages), needs strict control of the disclaimer block, and we want
zero external service dependency at petition time.

The petition body is rendered in English so the international hackathon jury
can read it directly. A `Demo notice` block at the head explains that the
production build emits the equivalent Turkish text required by CIMER (the
Turkish state complaint portal); switching the cover letter, citation
excerpts and filing instructions back to Turkish is a single-language flag.
Everything user-supplied is escaped before rendering.
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
    base.add(
        ParagraphStyle(
            name="DemoNotice",
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=HAZARD,
            alignment=TA_LEFT,
        )
    )
    return base


def _grade_band(g: int) -> tuple[str, colors.Color]:
    if g >= 80:
        return "OK", colors.HexColor("#3D9F4D")
    if g >= 60:
        return "AT RISK", colors.HexColor("#E0A93D")
    return "HIGH RISK", colors.HexColor("#D8443B")


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
        title="RebarGuard - Building Inspection Complaint Petition",
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
            f"Building Inspection Complaint Petition &middot; {now:%d %B %Y} &middot; "
            "AI-assisted preliminary assessment &middot; rebarguard.vercel.app",
            styles["HeaderSub"],
        )
    )
    story.append(HRFlowable(width="100%", thickness=0.6, color=HAZARD, spaceAfter=10))

    # ---------- demo notice (international jury context) ----------
    story.append(
        Paragraph(
            (
                "<b>Demo notice.</b> CIMER petition auto-draft &mdash; English shown for "
                "the international hackathon jury. The production build generates the "
                "equivalent Turkish text required by Turkey's state complaint portal "
                "(CIMER, e-Devlet, Yap&#305; Denetim Genel M&uuml;d&uuml;rl&uuml;&#287;&uuml;)."
            ),
            styles["DemoNotice"],
        )
    )
    story.append(Spacer(1, 6))

    # ---------- top summary card: grade + address ----------
    grade_label, grade_col = _grade_band(draft.grade)
    summary = [
        [
            Paragraph(
                f"<b>{draft.grade}</b><br/><font size=8 color='#5A6573'>/ 100</font>",
                styles["GradeBig"],
            ),
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
            "&mdash; findings are an AI preliminary assessment with no legal weight.",
            styles["Mono"],
        )
    )

    # ---------- cover letter ----------
    story.append(Paragraph("Subject", styles["SectionHead"]))
    story.append(Paragraph(_cover_letter(draft, grade_label), styles["BodyText"]))

    # ---------- findings table ----------
    story.append(Paragraph("Findings detected", styles["SectionHead"]))
    story.append(_findings_table(draft, styles))

    # ---------- regulation excerpts ----------
    cited = _cited_articles(draft)
    if cited:
        story.append(Paragraph("Cited regulations", styles["SectionHead"]))
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
        story.append(Paragraph("Citizen note", styles["SectionHead"]))
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
                "<b>LEGAL NOTICE.</b> This document is an AI-assisted "
                "<i>preliminary assessment report</i> generated by RebarGuard. "
                "Definitive identification of code violations and any legal "
                "process require an on-site inspection by a licensed Building "
                "Inspection (Yapi Denetim) firm. RebarGuard makes no warranty "
                "as to the accuracy, completeness or fitness of the assessment "
                "for any administrative or judicial proceeding. Legal liability "
                "for claims based on this report rests with the report holder."
            ),
            styles["Disclaimer"],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "RebarGuard &middot; Hermes Agent + Kimi K2.6 &middot; "
            f"Document no: RG-DRAFT-{now:%Y%m%d-%H%M%S}",
            styles["Mono"],
        )
    )

    doc.build(story)
    return buf.getvalue()


# --------------------------- helpers --------------------------------------


def _ascii_clean(s: str) -> str:
    """Map Turkish-extended characters to ASCII fallbacks before ReportLab
    renders them with built-in Helvetica (which has no Latin-Extended glyphs).
    Only used for free-form citizen-supplied fields where we keep proper
    nouns intact but want them legible."""
    table = str.maketrans(
        {
            "İ": "I",  # I with dot
            "ı": "i",  # dotless i
            "Ş": "S",
            "ş": "s",
            "Ğ": "G",
            "ğ": "g",
            "Ç": "C",
            "ç": "c",
            "Ö": "O",
            "ö": "o",
            "Ü": "U",
            "ü": "u",
            "Â": "A",
            "â": "a",
            "Î": "I",
            "î": "i",
            "Û": "U",
            "û": "u",
        }
    )
    return s.translate(table)


def _safe(s: str | None) -> str:
    """User-supplied text rendered through Helvetica: ASCII-fold + html escape."""
    if not s:
        return ""
    return escape(_ascii_clean(s))


def _address_block(addr, styles) -> Paragraph:
    parts = []
    if addr.parcel_no:
        parts.append(f"<b>Parcel:</b> {_safe(addr.parcel_no)}")
    if addr.full_address:
        parts.append(f"<b>Address:</b> {_safe(addr.full_address)}")
    if addr.district or addr.city:
        loc = " / ".join(filter(None, [addr.district, addr.city]))
        parts.append(f"<b>District / City:</b> {_safe(loc)}")
    if addr.contractor_name:
        parts.append(f"<b>Contractor:</b> {_safe(addr.contractor_name)}")
    if addr.apartment_no:
        parts.append(f"<b>Apartment:</b> {_safe(addr.apartment_no)}")
    if not parts:
        parts.append("<i>Address not provided</i>")
    return Paragraph("<br/>".join(parts), styles["BodyText"])


def _cover_letter(draft, grade_label: str) -> str:
    addr = draft.address
    where = _safe(addr.full_address or addr.parcel_no) or "the parcel listed below"
    contractor = (
        f" Contractor: <b>{_safe(addr.contractor_name)}</b>." if addr.contractor_name else ""
    )
    fail_count = sum(1 for f in draft.findings if f.severity == "fail")
    warn_count = sum(1 for f in draft.findings if f.severity == "warn")
    return (
        "To the relevant authority, with respect to the construction underway at "
        f"<b>{where}</b> &mdash; a unit I own or stand to acquire under a "
        "kat-karsiligi (land-for-share) agreement or sale contract &mdash; an "
        "AI preliminary assessment performed by RebarGuard returned a quality "
        f"score of <b>{draft.grade}/100</b> with <b>{fail_count} critical</b> "
        f"and <b>{warn_count} warning</b>-severity findings.{contractor} The "
        f"overall risk level has been classified as <b>{escape(grade_label)}</b>."
        "<br/><br/>"
        "Pursuant to TBDY 2018 (Turkey Building Earthquake Code) and TS 500 "
        "(reinforced-concrete design standard), I respectfully request an "
        "independent Yapi Denetim (Building Inspection) review and, if "
        "warranted, a stop-pour order on the cited element."
    )


def _findings_table(draft, styles) -> Table:
    head = [
        Paragraph("<b>#</b>", styles["BodyText"]),
        Paragraph("<b>Sev.</b>", styles["BodyText"]),
        Paragraph("<b>Finding</b>", styles["BodyText"]),
        Paragraph("<b>Conf.</b>", styles["BodyText"]),
        Paragraph("<b>Ref.</b>", styles["BodyText"]),
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
                    f"<b>{_safe(f.title)}</b><br/>{_safe(f.detail or '')}",
                    styles["BodyText"],
                ),
                Paragraph(f"{round(f.confidence * 100)}%", styles["BodyText"]),
                Paragraph(_safe(f.ref) or "&mdash;", styles["Mono"]),
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
    article and emit (code, English title, short English excerpt)."""
    seen: set[str] = set()
    out: list[tuple[str, str, str]] = []
    for f in draft.findings:
        if not f.ref or f.ref in seen:
            continue
        article = lookup_article(f.ref)
        if not article:
            continue
        seen.add(f.ref)
        text = article.text_en.strip()
        if len(text) > 360:
            text = text[:357].rstrip() + "..."
        out.append((article.code, article.title_en, text))
    return out


def _signature_block(draft, styles) -> Table:
    name = _safe(draft.citizen_name) or "[Full name]"
    contact = _safe(draft.citizen_contact) or "[Email or phone]"
    today = datetime.now(UTC).strftime("%d.%m.%Y")
    rows = [
        [
            Paragraph(
                f"<b>Date:</b> {today}<br/><b>Complainant:</b> {name}<br/>"
                f"<b>Contact:</b> {contact}",
                styles["BodyText"],
            ),
            Paragraph("<i>Signature</i><br/><br/><br/>__________________", styles["BodyText"]),
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
        Paragraph("How to file this petition", styles["SectionHead"]),
        Paragraph(
            "1) <b>e-Devlet -&gt; CIMER</b> (Presidential Communication Center): attach "
            "this PDF to the application form. Subject: 'Yapi Denetim &mdash; suspected "
            "TBDY 2018 violation'.<br/>"
            "2) <b>District Municipality, Yapi Kontrol Mudurlugu</b> (Building Control "
            "Office): in-person filing &mdash; this PDF plus a copy of the title deed "
            "(tapu).<br/>"
            "3) <b>Ministry of Environment, Urbanisation and Climate Change</b>, Yapi "
            "Denetim General Directorate (csb.gov.tr).<br/>"
            "Important: sign the petition with your real identity &mdash; anonymous "
            "complaints may be insufficient to start a legal process.",
            styles["BodyText"],
        ),
    ]
