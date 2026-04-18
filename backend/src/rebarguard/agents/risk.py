"""RiskAgent — AFAD earthquake zone + soil class → risk multiplier."""

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

        summary = (
            f"{payload.city or 'Unknown city'}: PGA {pga or 'N/A'} g, "
            f"soil {payload.soil_class or 'ZC'}, {payload.floors} floor(s) → "
            f"risk multiplier ×{multiplier}"
        )
        return RiskReport(
            afad_zone=zone,
            pga_g=pga,
            soil_class=payload.soil_class,
            risk_multiplier=multiplier,
            summary=summary,
        )
