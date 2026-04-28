"""RiskAgent — AFAD earthquake zone + soil class → risk multiplier.

Zone × soil × floor multiplier comes from the official TBDY 2018 / AFAD table — a
fixed lookup, never an LLM "guess." After the deterministic computation, Hermes 4 70B
narrates *what the numbers mean for the structure* in a single English sentence so
the debate stream reads as agentic prose. Hermes failures fall back to the
deterministic summary; the multiplier is unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, RiskReport


@dataclass
class RiskInput:
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    soil_class: str | None = None  # ZA, ZB, ZC, ZD, ZE per TBDY 2018
    floors: int = 5


# Demo hardcoded AFAD zone PGA values (g) per major Turkish city center.
# Day-8 task: swap for live tdth.afad.gov.tr API.
_DEMO_PGA: dict[str, float] = {
    "istanbul": 0.43,
    "ankara": 0.25,
    "izmir": 0.53,
    "kahramanmaras": 0.65,
    "kahramanmaraş": 0.65,
    "hatay": 0.58,
    "duzce": 0.62,
    "düzce": 0.62,
    "van": 0.55,
    "erzurum": 0.48,
    "bursa": 0.45,
    "bolu": 0.60,
}

_SOIL_MULTIPLIER: dict[str, float] = {
    "ZA": 0.8,
    "ZB": 0.9,
    "ZC": 1.0,
    "ZD": 1.2,
    "ZE": 1.5,
}


class RiskAgent(BaseAgent[RiskInput, RiskReport]):
    role = AgentRole.RISK

    async def run(self, payload: RiskInput) -> RiskReport:
        key = (payload.city or "").strip().lower()
        pga = _DEMO_PGA.get(key)
        zone: str | None = None
        if pga is not None:
            if pga >= 0.5:
                zone = "Zone 1 (highest)"
            elif pga >= 0.35:
                zone = "Zone 2"
            elif pga >= 0.2:
                zone = "Zone 3"
            else:
                zone = "Zone 4 (lowest)"

        soil_mult = _SOIL_MULTIPLIER.get((payload.soil_class or "ZC").upper(), 1.0)
        floor_mult = 1.0 + max(0, payload.floors - 3) * 0.05
        base = (pga or 0.3) / 0.3  # reference PGA 0.3g
        multiplier = round(base * soil_mult * floor_mult, 2)

        base_summary = (
            f"{payload.city or 'Unknown city'}: PGA {pga or 'N/A'} g, "
            f"soil {payload.soil_class or 'ZC'}, {payload.floors} floor(s) → "
            f"risk multiplier ×{multiplier}"
        )

        summary = base_summary
        if pga is not None:  # Skip narrative for unknown cities (no signal to narrate)
            try:
                narrative = await self._hermes_narrative(
                    city=payload.city or "Unknown",
                    zone=zone,
                    pga=pga,
                    soil_class=payload.soil_class or "ZC",
                    floors=payload.floors,
                    multiplier=multiplier,
                )
                if narrative:
                    summary = narrative
            except Exception:
                summary = base_summary

        return RiskReport(
            afad_zone=zone,
            pga_g=pga,
            soil_class=payload.soil_class,
            risk_multiplier=multiplier,
            summary=summary,
        )

    async def _hermes_narrative(
        self,
        *,
        city: str,
        zone: str | None,
        pga: float,
        soil_class: str,
        floors: int,
        multiplier: float,
    ) -> str | None:
        system = (
            "You are a structural seismic-risk agent reading the AFAD lookup result. "
            "The PGA, zone, and multiplier are fixed regulatory values — do not change "
            "them. Narrate in 1–2 concrete English sentences what this risk profile "
            "means for the structure and which findings (cover, stirrup spacing, etc.) "
            "become high-impact at this seismicity. No markdown, no bullets."
        )
        user = (
            f"Site: {city}. AFAD {zone or 'unmapped'} (PGA {pga:.2f} g). "
            f"Soil class {soil_class}. Floors: {floors}. "
            f"Composite risk multiplier ×{multiplier}."
        )
        resp = await self.hermes.complete(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=self.hermes.reasoning_model,
            max_tokens=180,
            temperature=0.3,
            skills=["moderate-inspection"],
        )
        text = (resp.get("content") or "").strip()
        return text or None
