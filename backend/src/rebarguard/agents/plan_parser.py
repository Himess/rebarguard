"""PlanParserAgent — Phase 1. PDF structural drawing → StructuralPlan JSON.

Pipeline:
1. Rasterize each PDF page to PNG via pdf2image (needs poppler-utils).
2. Kimi K2.6 (via Hermes Agent CLI) reads each page with PLAN_PARSE_PROMPT.
3. Merge per-page outputs into a single StructuralPlan with metadata + all elements.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pypdf import PdfReader

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import (
    AgentRole,
    PlanParseResult,
    ProjectMetadata,
    StructuralPlan,
)
from rebarguard.vision.prompts import PLAN_PARSE_PROMPT


class PlanParserAgent(BaseAgent[Path, PlanParseResult]):
    role = AgentRole.PLAN_PARSER

    async def run(self, payload: Path) -> PlanParseResult:
        pdf_path = Path(payload)
        if not pdf_path.exists():
            raise FileNotFoundError(str(pdf_path))

        image_paths = self._pdf_to_images(pdf_path)
        warnings: list[str] = []
        merged = self._empty_plan_dict(pdf_path.stem)

        # Kimi K2.6 'agent swarm' fan-out: each PDF page goes to its own isolated
        # Hermes subprocess in parallel (bounded by max_concurrency). For a 20-page
        # drawing this drops wall-clock time from ~30 min to ~6 min on Nous Portal.
        swarm = await self.kimi.analyze_images(
            image_paths,
            PLAN_PARSE_PROMPT,
            skills=["parse-structural-plan"],
            max_concurrency=4,
        )
        for i, parsed in enumerate(swarm.get("images", [])):
            if isinstance(parsed, dict) and "error" in parsed and "raw" not in parsed:
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
    def _empty_plan_dict(stem: str) -> dict[str, Any]:
        return {
            "metadata": {"project_name": stem, "country": "Türkiye"},
            "columns": [],
            "beams": [],
            "slabs": [],
            "shear_walls": [],
            "stairs": [],
            "notes": [],
            "confidence": 0.0,
        }

    @staticmethod
    def _pdf_to_images(pdf_path: Path) -> list[Path]:
        cache = pdf_path.parent / ".cache" / pdf_path.stem
        cache.mkdir(parents=True, exist_ok=True)
        existing = sorted(cache.glob("page_*.png"))
        if existing:
            return existing

        try:
            from pdf2image import convert_from_path  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "pdf2image required. Run: `apt-get install -y poppler-utils` in WSL."
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
        # metadata — prefer first non-null value seen
        pmeta = parsed.get("metadata") or {}
        ameta = acc["metadata"]
        for key, value in pmeta.items():
            if value in (None, "", [], {}):
                continue
            if ameta.get(key) in (None, "", [], {}):
                ameta[key] = value

        # element lists — concatenate, dedupe by id
        for list_key in ("columns", "beams", "slabs", "shear_walls", "stairs"):
            items = parsed.get(list_key) or []
            if not isinstance(items, list):
                continue
            seen_ids = {e.get("id") for e in acc[list_key] if isinstance(e, dict)}
            for el in items:
                if isinstance(el, dict) and el.get("id") and el["id"] not in seen_ids:
                    acc[list_key].append(el)
                    seen_ids.add(el["id"])
                elif isinstance(el, dict) and not el.get("id"):
                    acc[list_key].append(el)

        # notes
        notes = parsed.get("notes") or []
        if isinstance(notes, list):
            acc["notes"].extend(n for n in notes if n and n not in acc["notes"])

        # confidence — max across pages
        conf = parsed.get("confidence")
        if isinstance(conf, (int, float)):
            acc["confidence"] = max(acc["confidence"], float(conf))

    @staticmethod
    def _fallback_metadata(stem: str) -> ProjectMetadata:
        return ProjectMetadata(project_name=stem)
