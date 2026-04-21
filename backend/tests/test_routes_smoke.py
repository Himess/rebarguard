"""HTTP smoke tests — exercise every router without calling external LLMs.

We spin up the FastAPI app with the TestClient and assert the routes that don't require
Nous Portal / Moonshot credentials return sane responses. The LLM-dependent endpoints
(`/api/projects`, `/api/quick/analyze`, `/api/inspections/stream`) are covered by the
manual `e2e_hermes_bridge.py` runner once Hermes OAuth exists; these smoke tests ensure
the router wiring itself can't regress silently.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from rebarguard.main import app
from rebarguard.rag import REGULATIONS
from rebarguard.routers.projects import _STORE

client = TestClient(app)


def test_health_ok() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"] == "rebarguard"


def test_regulations_list() -> None:
    r = client.get("/api/regulations")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) == len(REGULATIONS)
    for entry in items:
        assert "code" in entry
        assert "document" in entry


def test_regulations_lookup_hit() -> None:
    code = next(iter(REGULATIONS.keys()))
    r = client.get(f"/api/regulations/{code}")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == code
    assert body["title_en"]
    assert body["title_tr"]


def test_regulations_lookup_miss_returns_404() -> None:
    r = client.get("/api/regulations/TBDY%2099.99")
    assert r.status_code == 404


def test_projects_list_empty_by_default() -> None:
    _STORE.clear()
    r = client.get("/api/projects")
    assert r.status_code == 200
    assert r.json() == []


def test_demo_fistik_seeds_a_project() -> None:
    _STORE.clear()
    r = client.post("/api/demo/fistik")
    assert r.status_code == 200
    seed = r.json()
    assert seed["plan"]["metadata"]["project_name"] == "1340 Ada 43 Parsel"
    assert seed["plan"]["metadata"]["city"] == "Istanbul"
    assert len(seed["plan"]["columns"]) > 0

    listed = client.get("/api/projects")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = client.get(f"/api/projects/{seed['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == seed["id"]
    _STORE.clear()


def test_projects_get_unknown_id_returns_404() -> None:
    _STORE.clear()
    r = client.get("/api/projects/does-not-exist")
    assert r.status_code == 404


def test_quick_analyze_rejects_missing_photo() -> None:
    # Sending an empty multipart body — FastAPI returns 422 for the missing file field.
    r = client.post("/api/quick/analyze")
    assert r.status_code in {400, 422}


def test_inspections_stream_rejects_unknown_project() -> None:
    _STORE.clear()
    # Minimal multipart body that satisfies field requirements except project_id
    r = client.post(
        "/api/inspections/stream",
        data={"project_id": "not-a-real-id", "element_id": "S1"},
        files={"photos": ("x.jpg", b"\x00", "image/jpeg")},
    )
    assert r.status_code == 404
