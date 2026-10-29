"""
FusionAI — API End-to-End Tests

Tests the FastAPI endpoints using TestClient:
- GET /api/health
- GET /api/demo-families
- GET /api/demo-families/{family_id}
- POST /api/recommend (full ranking pipeline)
- POST /api/feedback (submitting dislikes/likes)
- Pipeline re-run with adjustments (exclusion verified)
- DELETE /api/feedback/{family_id}
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from contracts.demo_families import ALL_DEMO_FAMILIES


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "FusionAI"


def test_list_demo_families(client):
    response = client.get("/api/demo-families")
    assert response.status_code == 200
    families = response.json()
    assert len(families) >= 3
    ids = [f["family_id"] for f in families]
    assert "demo-sharma" in ids
    assert "demo-tanaka-rodriguez" in ids
    assert "demo-williams" in ids


def test_get_demo_family(client):
    response = client.get("/api/demo-families/demo-sharma")
    assert response.status_code == 200
    data = response.json()
    assert data["family_id"] == "demo-sharma"
    assert "profile" in data
    assert len(data["profile"]["members"]) == 3


def test_get_demo_family_not_found(client):
    response = client.get("/api/demo-families/nonexistent-id")
    assert response.status_code == 404


def test_recommendation_pipeline(client):
    # Use Sharma family profile
    profile = ALL_DEMO_FAMILIES["demo-sharma"]["profile"]
    payload = {
        "family_profile": profile.model_dump(),
        "adjustment": None,
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0

    first = data["results"][0]
    assert "group_score" in first
    assert first["group_score"] > 0
    assert "per_person_details" in first
    assert len(first["per_person_details"]) == 3
    assert first["group_explanation"] != ""
    assert "scoring_params" in data


def test_feedback_and_adjustment_cycle(client):
    profile = ALL_DEMO_FAMILIES["demo-sharma"]["profile"]

    # 1. First get initial results
    res1 = client.post("/api/recommend", json={"family_profile": profile.model_dump()})
    assert res1.status_code == 200
    first_result = res1.json()["results"][0]
    disliked_id = first_result["entity"]["qloo_id"]
    disliked_name = first_result["entity"]["name"]

    # 2. Submit feedback disliking the top candidate
    fb_payload = {
        "family_id": profile.family_id,
        "feedback": [
            {
                "candidate_id": disliked_id,
                "candidate_name": disliked_name,
                "reaction": "dislike",
                "reason": "Not in the mood for this",
            }
        ],
    }
    fb_res = client.post("/api/feedback", json=fb_payload)
    assert fb_res.status_code == 200
    adj = fb_res.json()
    assert disliked_id in adj["excluded_candidates"]

    # 3. Request recommendations again with adjustment
    res2 = client.post(
        "/api/recommend",
        json={
            "family_profile": profile.model_dump(),
            "adjustment": adj,
        },
    )
    assert res2.status_code == 200
    new_results = res2.json()["results"]
    new_ids = [r["entity"]["qloo_id"] for r in new_results]
    assert disliked_id not in new_ids

    # 4. Clear feedback
    del_res = client.delete(f"/api/feedback/{profile.family_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "cleared"
