"""Regulation lookup API — clickable REF badges fetch the real article text."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from rebarguard.rag import REGULATIONS, lookup

router = APIRouter()


class ArticleOut(BaseModel):
    code: str
    document: str
    chapter: str
    title_en: str
    title_tr: str
    text_en: str
    text_tr: str
    source: str
    tags: list[str]


def _to_out(a) -> ArticleOut:
    return ArticleOut(
        code=a.code,
        document=a.document,
        chapter=a.chapter,
        title_en=a.title_en,
        title_tr=a.title_tr,
        text_en=a.text_en,
        text_tr=a.text_tr,
        source=a.source,
        tags=list(a.tags),
    )


@router.get("", response_model=list[ArticleOut])
def list_articles() -> list[ArticleOut]:
    return [_to_out(a) for a in REGULATIONS.values()]


@router.get("/{code:path}", response_model=ArticleOut)
def get_article(code: str) -> ArticleOut:
    # `code:path` allows dots in the URL without them being treated as extensions
    a = lookup(code)
    if a is None:
        raise HTTPException(404, f"article not found: {code}")
    return _to_out(a)
