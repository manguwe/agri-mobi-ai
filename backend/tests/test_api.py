"""HTTP-level tests for the FastAPI app (needs httpx, see requirements.txt)."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
ORIGIN = "http://localhost:5173"


def test_health_ok_and_reports_data():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["knowledge_items"] == 8 and body["engine_version"]


def test_knowledge_lists_core_items():
    r = client.get("/api/v1/knowledge")
    assert r.status_code == 200 and r.json()["count"] == 8


def test_diagnosis_happy_path():
    r = client.post("/api/v1/diagnosis", json={"crop": "maize", "symptoms": "worms in the whorl with frass and ragged holes", "answers": {}})
    assert r.status_code == 200
    body = r.json()
    assert body["problem_id"] == "faw-001" and body["crop"] == "maize"


def test_diagnosis_with_followup_answers():
    r = client.post("/api/v1/diagnosis", json={"symptoms": "yellow marks on leaves", "answers": {"leaf_pattern": "Yellow streaks or stripes along the veins"}})
    assert r.status_code == 200 and r.json()["problem_id"] == "msv-001"


def test_blank_symptoms_rejected():
    assert client.post("/api/v1/diagnosis", json={"symptoms": "   "}).status_code == 422
    assert client.post("/api/v1/diagnosis", json={}).status_code == 422


def test_unsupported_crop_rejected():
    assert client.post("/api/v1/diagnosis", json={"crop": "cassava", "symptoms": "yellow leaves"}).status_code == 422


def test_non_string_answers_are_tolerated():
    r = client.post("/api/v1/diagnosis", json={"symptoms": "leaves yellow", "answers": {"n": 1, "ok": True, "multi": ["a", "b"]}})
    assert r.status_code == 200


def test_too_many_answers_rejected():
    r = client.post("/api/v1/diagnosis", json={"symptoms": "x", "answers": {str(i): "a" for i in range(25)}})
    assert r.status_code == 422


def test_cors_preflight_allows_the_vite_origin():
    r = client.options("/api/v1/diagnosis", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == ORIGIN


def test_cors_header_present_on_real_response():
    r = client.post("/api/v1/diagnosis", json={"symptoms": "powdery rust pustules"}, headers={"Origin": ORIGIN})
    assert r.headers.get("access-control-allow-origin") == ORIGIN


def test_cors_blocks_unknown_origin():
    r = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
