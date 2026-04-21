"""Tests for the curated TBDY + TS 500 article DB and Kimi citation whitelist.

These guard against hallucinated regulation codes: Kimi is told it can only cite codes
from `REGULATIONS`, and `_validate_ref` must silently drop anything outside the set.
"""

from __future__ import annotations

from rebarguard.rag import REGULATIONS, cheatsheet_for_prompt, citation_codes, lookup
from rebarguard.routers.quick import _validate_ref


def test_articles_nonempty_and_grounded() -> None:
    assert len(REGULATIONS) > 0
    for code, article in REGULATIONS.items():
        assert article.code == code
        assert article.document in {"TBDY 2018", "TS 500"}
        assert article.title_en and article.title_tr
        assert article.text_en and article.text_tr
        assert article.source in {"document", "summary"}
        # TS 500 is paywalled → always summary; TBDY is the primary grounded source.
        if article.document == "TS 500":
            assert article.source == "summary"


def test_lookup_hit_and_miss() -> None:
    first_code = next(iter(REGULATIONS.keys()))
    found = lookup(first_code)
    assert found is not None
    assert found.code == first_code

    assert lookup("TBDY 99.99") is None
    assert lookup("made-up-code") is None


def test_cheatsheet_contains_every_code() -> None:
    cheatsheet = cheatsheet_for_prompt()
    for code in citation_codes():
        assert code in cheatsheet


def test_validate_ref_accepts_whitelisted_code() -> None:
    any_code = next(iter(REGULATIONS.keys()))
    assert _validate_ref(any_code) == any_code


def test_validate_ref_is_case_and_dash_tolerant() -> None:
    any_code = next(iter(REGULATIONS.keys()))
    assert _validate_ref(any_code.lower()) == any_code
    dashed = any_code.replace(" ", "-")
    assert _validate_ref(dashed) == any_code


def test_validate_ref_drops_hallucinations() -> None:
    assert _validate_ref(None) is None
    assert _validate_ref("") is None
    assert _validate_ref("TBDY 99.99") is None
    assert _validate_ref("totally made up reference") is None
    assert _validate_ref("ISO 9001") is None
