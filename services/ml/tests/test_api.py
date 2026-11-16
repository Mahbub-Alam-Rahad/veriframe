from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
TOKEN = "test-internal-token-0123456789abcdef"


def test_health_is_public() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mock"] is True
    assert body["model_id"]


def test_analyze_requires_internal_token() -> None:
    response = client.post("/v1/analyze", json={})
    assert response.status_code == 401


def test_analyze_validates_payload() -> None:
    response = client.post(
        "/v1/analyze",
        headers={"x-internal-token": TOKEN},
        json={"videoKey": "videos/x/y.mp4"},
    )
    assert response.status_code == 422


def test_models_endpoint() -> None:
    response = client.get("/v1/models")
    assert response.status_code == 200
    body = response.json()
    assert body["configuredBackend"] == "mock"
    assert "hf" in body["availableBackends"]
