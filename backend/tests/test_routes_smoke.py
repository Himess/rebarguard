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


# ----------------------------- complaints --------------------------------


def _sample_complaint_payload() -> dict:
    return {
        "findings": [
            {
                "title": "Cover < 25mm",
                "severity": "fail",
                "bbox": {"x": 0.2, "y": 0.4, "w": 0.1, "h": 0.1},
                "detail": "Bottom-left corner reads ~22mm cover.",
                "ref": "TS 500 7.3",
                "confidence": 0.84,
            },
            {
                "title": "Stirrup spacing drift",
                "severity": "warn",
                "bbox": {"x": 0.55, "y": 0.3, "w": 0.08, "h": 0.07},
                "detail": "Spacing widens to 140mm in confinement zone.",
                "ref": "TBDY 7.3.6",
                "confidence": 0.71,
            },
        ],
        "address": {
            "parcel_no": "1340 ADA 43 PARSEL",
            "district": "Kadıköy",
            "city": "Istanbul",
            "contractor_name": "Demo İnşaat A.Ş.",
        },
        "grade": 58,
        "note": "Sahaya 3 kez gittim, etriye eksiği gözle görünür.",
        "citizen_name": "A. Vatandaş",
        "citizen_contact": "vatandas@example.com",
    }


def test_complaints_draft_pdf_returns_pdf_bytes() -> None:
    r = client.post("/api/complaints/draft-pdf", json=_sample_complaint_payload())
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content.startswith(b"%PDF")
    # 1-2 page PDF should be at least 3 KB
    assert len(r.content) > 3000


def test_complaints_submit_returns_tracking_id() -> None:
    r = client.post("/api/complaints", json=_sample_complaint_payload())
    assert r.status_code == 200
    body = r.json()
    assert body["tracking_id"].startswith("RG-")
    assert body["status"] == "mock_acknowledged"
    assert body["eta_days"] == 14
    assert "MOCK" in body["message"]


def test_complaints_list_includes_recent_submission() -> None:
    submit = client.post("/api/complaints", json=_sample_complaint_payload())
    tid = submit.json()["tracking_id"]
    listed = client.get("/api/complaints")
    assert listed.status_code == 200
    body = listed.json()
    assert any(c["tracking_id"] == tid for c in body["complaints"])
