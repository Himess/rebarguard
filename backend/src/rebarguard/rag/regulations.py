"""Curated TBDY 2018 + TS 500 article database.

The Turkish codes most commonly cited by on-site inspectors are captured here with a
short authoritative summary. We expose this set to Kimi as a whitelist so the model can
only cite codes we have verified text for — no hallucinated article numbers reach the
user.

TBDY 2018 excerpts are paraphrased from the official AFAD document
(`data/regulations/TBDY_2018.pdf`). TS 500 is paywalled by TSE, so TS 500 entries are
hand-curated summaries based on engineering references and academic course materials;
each such entry is marked `source='summary'` so the UI can add a disclaimer.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Article:
    code: str                          # canonical citation, e.g. "TBDY 7.3.4.2"
    document: Literal["TBDY 2018", "TS 500"]
    chapter: str                       # human-readable chapter title
    title_en: str
    title_tr: str
    text_en: str
    text_tr: str
    source: Literal["document", "summary"] = "document"
    tags: tuple[str, ...] = ()


_RAW: list[Article] = [
    # ────────────────────────────────────────────────────────────────────
    # TBDY 2018 — Chapter 7 (betonarme binaların tasarımı)
    # ────────────────────────────────────────────────────────────────────
    Article(
        code="TBDY 7.3.4.1",
        document="TBDY 2018",
        chapter="Bölüm 7.3 — Kolonlar (columns)",
        title_tr="Kolon kesit minimum ölçüleri",
        title_en="Minimum column cross-section",
        text_tr=(
            "Kolonların kısa kenarı 300 mm'den ve kesit alanı 90 000 mm²'den az olamaz. "
            "Dairesel kesitli kolonlarda çap en az 300 mm olmalıdır."
        ),
        text_en=(
            "Column short side shall not be less than 300 mm and cross-section area not less "
            "than 90 000 mm². Circular columns shall have a diameter of at least 300 mm."
        ),
        tags=("column", "geometry"),
    ),
    Article(
        code="TBDY 7.3.4.2",
        document="TBDY 2018",
        chapter="Bölüm 7.3 — Kolonlar (columns)",
        title_tr="Kolon boyuna donatı oranı",
        title_en="Column longitudinal reinforcement ratio",
        text_tr=(
            "Kolonlarda boyuna donatı alanının brüt kesit alanına oranı %1'den az, %4'ten "
            "fazla olamaz. Bindirmeli eklerde bu oran geçici olarak %6'ya çıkabilir."
        ),
        text_en=(
            "The ratio of longitudinal reinforcement area to the gross cross-section shall "
            "be not less than 1% and not more than 4%. Within lap-splice zones the ratio "
            "may temporarily reach 6%."
        ),
        tags=("column", "longitudinal", "ratio"),
    ),
    Article(
        code="TBDY 7.3.4.3",
        document="TBDY 2018",
        chapter="Bölüm 7.3 — Kolonlar (columns)",
        title_tr="Minimum boyuna donatı adedi ve çapı",
        title_en="Minimum longitudinal bar count and diameter",
        text_tr=(
            "Dikdörtgen kolonlarda en az 4 adet, dairesel kolonlarda en az 6 adet Ø14 mm "
            "boyuna donatı kullanılacaktır."
        ),
        text_en=(
            "Rectangular columns shall have at least 4 longitudinal bars and circular columns "
            "at least 6, each not less than Ø14 mm in diameter."
        ),
        tags=("column", "longitudinal", "diameter"),
    ),
    Article(
        code="TBDY 7.3.6",
        document="TBDY 2018",
        chapter="Bölüm 7.3 — Kolonlar (columns)",
        title_tr="Kolon enine donatısı (etriye)",
        title_en="Column transverse reinforcement (stirrups)",
        text_tr=(
            "Kolonlarda etriye çapı en az Ø8 mm, sismik derzlendirme bölgelerinde en az "
            "Ø10 mm olmalıdır. Etriye kancaları 135° açıyla bükülür. Sıklaştırma bölgesinde "
            "etriye aralığı en fazla 100 mm veya en küçük kenar uzunluğunun 1/3'ü kadardır; "
            "orta bölgede en fazla 200 mm veya 0.5×b'dir."
        ),
        text_en=(
            "Column stirrup diameter shall be at least Ø8 mm (Ø10 mm in seismic confinement "
            "zones). Hooks shall be bent to 135°. Stirrup spacing in confinement zones: "
            "max 100 mm or b/3 (whichever smaller); mid-zone: max 200 mm or b/2."
        ),
        tags=("column", "stirrup", "confinement"),
    ),
    Article(
        code="TBDY 7.3.7",
        document="TBDY 2018",
        chapter="Bölüm 7.3 — Kolonlar (columns)",
        title_tr="Kolon çirozları (crossties)",
        title_en="Column crossties",
        text_tr=(
            "Kolonun her iki doğrultusunda çiroz kullanılacak; çiroz sayısı her yüzde en "
            "az 1 adet olmak üzere boyuna donatı sayısı ve aralıklarına göre belirlenir. "
            "Çirozlar boyuna donatıya ve etriyeye kenetlenmelidir."
        ),
        text_en=(
            "Crossties are required in both directions of the column, at least 1 per face, "
            "count determined by longitudinal bar layout. Crossties shall engage both a "
            "longitudinal bar and the perimeter stirrup."
        ),
        tags=("column", "crossties"),
    ),
    Article(
        code="TBDY 7.4.2",
        document="TBDY 2018",
        chapter="Bölüm 7.4 — Kirişler (beams)",
        title_tr="Kiriş boyuna donatısı",
        title_en="Beam longitudinal reinforcement",
        text_tr=(
            "Kirişlerde alt ve üst boyuna donatı en az 2 adet Ø12 mm olmalıdır. Toplam "
            "boyuna donatı oranı %0.3'ten küçük, %2.5'ten büyük olamaz. Süreklilik mesnetleri "
            "boyunca üst donatının en az 1/3'ü devam etmelidir."
        ),
        text_en=(
            "Beam top and bottom reinforcement shall be at least 2 bars of Ø12 mm. Total "
            "ratio between 0.3% and 2.5%. At continuous supports, at least one-third of the "
            "top reinforcement shall run through."
        ),
        tags=("beam", "longitudinal"),
    ),
    Article(
        code="TBDY 7.4.5",
        document="TBDY 2018",
        chapter="Bölüm 7.4 — Kirişler (beams)",
        title_tr="Kiriş etriye sıklaştırması",
        title_en="Beam stirrup confinement zones",
        text_tr=(
            "Kiriş mesnet bölgelerinde 2h uzunluğunda sıklaştırma bölgesi oluşturulur "
            "(h: kiriş yüksekliği). Bu bölgede etriye aralığı en fazla d/4 veya 100 mm'dir "
            "(d: faydalı yükseklik). Orta bölgede en fazla d/2'dir."
        ),
        text_en=(
            "A 2h confinement zone (h = beam depth) is formed at supports. Stirrup spacing "
            "in this zone: max d/4 or 100 mm. In the middle span: max d/2."
        ),
        tags=("beam", "stirrup", "confinement"),
    ),
    Article(
        code="TBDY 7.6.2",
        document="TBDY 2018",
        chapter="Bölüm 7.6 — Perde duvarlar (shear walls)",
        title_tr="Perde kalınlığı ve minimum boyutlar",
        title_en="Shear wall thickness and minimum dimensions",
        text_tr=(
            "Perde duvar kalınlığı en az 200 mm olmalıdır. Kritik perde yüksekliği boyunca "
            "bu değer 250 mm'ye yükseltilir. Perde uzunluğunun kalınlığa oranı en az 6 "
            "olmalıdır."
        ),
        text_en=(
            "Shear wall thickness shall be at least 200 mm, raised to 250 mm over the "
            "critical wall height. Length-to-thickness ratio shall be at least 6."
        ),
        tags=("shear_wall", "geometry"),
    ),
    Article(
        code="TBDY 7.6.5",
        document="TBDY 2018",
        chapter="Bölüm 7.6 — Perde duvarlar (shear walls)",
        title_tr="Perde başlık bölgesi (boundary element)",
        title_en="Wall boundary element",
        text_tr=(
            "Perde uçlarında başlık bölgesi oluşturulur; bu bölgede boyuna donatı oranı "
            "en az %1, başlık uzunluğu perde kalınlığının 2 katı veya 0.15×perde uzunluğu "
            "arasındaki büyük olandır."
        ),
        text_en=(
            "Boundary elements are formed at wall ends with longitudinal ratio ≥ 1%. The "
            "boundary length is the larger of 2× wall thickness or 0.15× wall length."
        ),
        tags=("shear_wall", "boundary"),
    ),
    Article(
        code="TBDY 7.11",
        document="TBDY 2018",
        chapter="Bölüm 7.11 — Döşemeler (slabs)",
        title_tr="Döşeme kalınlığı ve hasır donatı",
        title_en="Slab thickness and mesh reinforcement",
        text_tr=(
            "Tek doğrultuda çalışan plak döşemeler için minimum kalınlık 100 mm, iki "
            "doğrultulu sistemlerde 120 mm'dir. Minimum hasır donatı oranı %0.2'dir."
        ),
        text_en=(
            "Minimum slab thickness: 100 mm one-way, 120 mm two-way. Minimum mesh "
            "reinforcement ratio: 0.2%."
        ),
        tags=("slab", "thickness"),
    ),
    # ────────────────────────────────────────────────────────────────────
    # TS 500 — key articles (summarized because TSE paywalls the official text)
    # ────────────────────────────────────────────────────────────────────
    Article(
        code="TS 500 5.2",
        document="TS 500",
        chapter="Bölüm 5 — Beton ve donatı sınıfları",
        title_tr="Beton basınç sınıfları",
        title_en="Concrete compressive strength classes",
        text_tr=(
            "Taşıyıcı sistem elemanlarında en az C20 beton kullanılır. Deprem bölgesi 1'de "
            "ve perdelerde en az C25, yüksek katlı binalarda ve özel durumlarda C30 ve "
            "üzeri beton sınıfları gerekir."
        ),
        text_en=(
            "Structural elements shall use at least C20 concrete. C25 minimum in seismic "
            "zone 1 and for shear walls; C30+ for taller structures and special cases."
        ),
        source="summary",
        tags=("material", "concrete"),
    ),
    Article(
        code="TS 500 5.3",
        document="TS 500",
        chapter="Bölüm 5 — Beton ve donatı sınıfları",
        title_tr="Donatı çeliği sınıfları",
        title_en="Reinforcement steel classes",
        text_tr=(
            "Betonarme elemanlarda S420 (B420C) nervürlü donatı çeliği kullanılır. "
            "S220 düz çubuk sadece etriye ve çiroz için sınırlı olarak kullanılabilir. "
            "Sismik detaylandırmada B420C tercih edilir."
        ),
        text_en=(
            "Ribbed S420 (B420C) steel is used for reinforced concrete. Plain S220 is "
            "limited to ties and crossties. B420C is preferred for seismic detailing."
        ),
        source="summary",
        tags=("material", "rebar", "steel"),
    ),
    Article(
        code="TS 500 7.2",
        document="TS 500",
        chapter="Bölüm 7.2 — Aderans ve bindirme",
        title_tr="Bindirmeli ek (lap splice) boyu",
        title_en="Lap splice length",
        text_tr=(
            "Bindirmeli ek boyu donatı çapının en az 40 katıdır (40×φ). Çekme altında "
            "çalışan donatılarda bu değer 50×φ'ye çıkar. Eklerin en fazla %50'si aynı "
            "kesitte yapılabilir; çevresi düz çelik halka veya çiroz ile sıklaştırılmalıdır."
        ),
        text_en=(
            "Lap splice length shall be at least 40× bar diameter (40φ), increased to 50φ "
            "under tension. At most 50% of splices may occur at the same section; the "
            "splice zone shall be confined with tighter stirrups."
        ),
        source="summary",
        tags=("lap", "splice", "anchorage"),
    ),
    Article(
        code="TS 500 7.3",
        document="TS 500",
        chapter="Bölüm 7.3 — Paspayı (concrete cover)",
        title_tr="Beton paspayı — minimum değerler",
        title_en="Minimum concrete cover",
        text_tr=(
            "Paspayı değerleri: iç mekân kolon/kiriş 25 mm, dış hava veya toprağa bitişik "
            "eleman 40 mm, toprakla doğrudan temas eden eleman 50 mm, agresif ortamda "
            "60 mm. Sismik bölgede minimumlar 10 mm artırılabilir."
        ),
        text_en=(
            "Minimum concrete cover: 25 mm indoor columns/beams, 40 mm exposed to weather "
            "or adjacent to earth, 50 mm cast against earth, 60 mm in aggressive "
            "environments. Add 10 mm in seismic zones."
        ),
        source="summary",
        tags=("cover", "durability"),
    ),
    Article(
        code="TS 500 7.4",
        document="TS 500",
        chapter="Bölüm 7.4 — Donatı detaylandırma",
        title_tr="Etriye kancası ve çiroz detayları",
        title_en="Stirrup hook and crosstie details",
        text_tr=(
            "Sismik bölgelerde etriye kancası 135° olmalıdır; serbest uç en az 6×φ veya "
            "60 mm uzunluğunda olacaktır. Çirozlar en az 135° ve 90° kancalara sahip "
            "U-bükümleri içerir; 90° uçlar kat katlarında alternatif yönlere yönlendirilir."
        ),
        text_en=(
            "Stirrup hooks in seismic zones shall be 135° with free end ≥ 6φ or 60 mm. "
            "Crossties have 135° + 90° hooks; alternate the 90° ends between floors."
        ),
        source="summary",
        tags=("stirrup", "hook", "crosstie"),
    ),
    Article(
        code="TS 500 7.6",
        document="TS 500",
        chapter="Bölüm 7.6 — Plastik takozlar (spacers)",
        title_tr="Plastik paspayı takozları",
        title_en="Plastic cover spacers",
        text_tr=(
            "Donatı hasırının kalıp yüzeyinden paspayı kadar mesafede tutulması için "
            "plastik veya beton takozlar kullanılır. Takoz aralığı en fazla 1 m; takozlar "
            "beton basıncı altında ezilmeyecek dayanımda olmalıdır."
        ),
        text_en=(
            "Plastic or concrete spacers hold rebar cages at the required cover distance "
            "from formwork. Spacer spacing shall not exceed 1 m; spacers shall not crush "
            "under concrete pressure."
        ),
        source="summary",
        tags=("spacer", "cover"),
    ),
]

REGULATIONS: dict[str, Article] = {a.code: a for a in _RAW}


def lookup(code: str) -> Article | None:
    """Fetch by canonical code. Also tolerates 'TBDY 7.3.4.2' vs 'TBDY-7.3.4.2' forms."""
    if not code:
        return None
    key = code.strip().replace("-", " ").upper()
    # Normalize whitespace
    key = " ".join(key.split())
    # Try exact match
    for k, v in REGULATIONS.items():
        if k.upper() == key:
            return v
    # Try prefix match ("TBDY 7.3" returns "TBDY 7.3.4.2" if unique)
    matches = [v for k, v in REGULATIONS.items() if k.upper().startswith(key)]
    if len(matches) == 1:
        return matches[0]
    return None


def citation_codes() -> list[str]:
    """List of all canonical citation codes — used to constrain Kimi output."""
    return list(REGULATIONS.keys())


def cheatsheet_for_prompt(focus: str | None = None) -> str:
    """A compact one-liner summary of each article, for injection into Kimi's prompt.

    `focus` can filter by tag (e.g. 'column', 'cover') so prompts stay short.
    """
    items = list(REGULATIONS.values())
    if focus:
        items = [a for a in items if focus in a.tags]
    lines = [
        f"- **{a.code}** ({a.title_en}): {a.text_en.split('.')[0]}."
        for a in items
    ]
    return "\n".join(lines)
