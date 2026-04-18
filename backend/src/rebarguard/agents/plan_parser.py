"""PlanParserAgent — Phase 1. Converts an approved PDF structural drawing into StructuralPlan JSON.

Pipeline:
1. Split PDF into page images (pypdf + PIL).
2. For each page, ask Kimi-VL to read the column schedule.
3. Merge and validate with Pydantic.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, PlanParseResult, StructuralPlan
from rebarguard.vision.prompts import PLAN_PARSE_PROMPT


class PlanParserAgent(BaseAgent[Path, PlanParseResult]):
    role = AgentRole.PLAN_PARSER

    async def run(self, payload: Path) -> PlanParseResult:
        pdf_path = Path(payload)
        if not pdf_path.exists():
            raise FileNotFoundError(str(pdf_path))

        image_paths = self._pdf_to_images(pdf_path)
        warnings: list[str] = []
        merged: dict[str, Any] = {
            "project_name": pdf_path.stem,
            "address": None,
            "earthquake_zone": None,
            "soil_class": None,
            "columns": [],
            "notes": [],
            "confidence": 0.0,
        }

        for i, img_path in enumerate(image_paths):
            try:
                parsed = await self.kimi.analyze_image(img_path, PLAN_PARSE_PROMPT)
            except Exception as e:  # noqa: BLE001
                warnings.append(f"page {i + 1} failed: {e}")
                continue
            if "error" in parsed:
                warnings.append(f"page {i + 1}: {parsed.get('error')}")
                continue
            self._merge(merged, parsed)

        plan = StructuralPlan.model_validate(merged)
        return PlanParseResult(
            plan=plan,
            source_pdf=str(pdf_path),
            pages_processed=len(image_paths),
            warnings=warnings,
        )

    @staticmethod
    def _pdf_to_images(pdf_path: Path) -> list[Path]:
        """Rasterize each PDF page into a PNG in sibling `.cache/` folder.

        Uses pypdf for metadata + Pillow via pdf2image if available; falls back to
        sending raw page text-extraction isn't ideal for drawings so we rely on
        a caller who installs pdf2image (poppler) separately.
        """
        cache = pdf_path.parent / ".cache" / pdf_path.stem
        cache.mkdir(parents=True, exist_ok=True)
        existing = sorted(cache.glob("page_*.png"))
        if existing:
            return existing

        try:
            from pdf2image import convert_from_path  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "pdf2image + poppler required. Install: `pip install pdf2image` and poppler."
            ) from exc

        reader = PdfReader(str(pdf_path))
        page_count = len(reader.pages)
        images = convert_from_path(str(pdf_path), dpi=200, last_page=min(page_count, 20))
        out: list[Path] = []
        for i, img in enumerate(images):
            p = cache / f"page_{i + 1:03d}.png"
            img.save(p, "PNG")
            out.append(p)
        return out

    @staticmethod
    def _merge(acc: dict[str, Any], parsed: dict[str, Any]) -> None:
        for key in ("project_name", "address", "earthquake_zone", "soil_class"):
            if acc.get(key) is None and parsed.get(key):
                acc[key] = parsed[key]
        cols = parsed.get("columns") or []
        if isinstance(cols, list):
            acc["columns"].extend(cols)
        notes = parsed.get("notes") or []
        if isinstance(notes, list):
            acc["notes"].extend(notes)
        conf = parsed.get("confidence")
        if isinstance(conf, (int, float)):
            acc["confidence"] = max(acc["confidence"], float(conf))
