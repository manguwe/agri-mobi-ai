import logging
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from . import diagnosis as engine

API_VERSION = "0.3.0"
log = logging.getLogger("agrimobi")

app = FastAPI(
    title="AgriMobi AI API",
    version=API_VERSION,
    description="Offline-first maize symptom triage API. Rule-based MVP; not a substitute for field assessment.",
)

# --- CORS -------------------------------------------------------------------
# Without this, a browser on http://localhost:5173 cannot read responses from
# http://localhost:8000: the request is blocked, the frontend silently falls
# back to its local engine, and the API looks "connected" while never used.
# ALLOWED_ORIGINS is a comma-separated list; "*" allows any origin (no cookies
# are used, so that is acceptable for a public read/triage API).
DEFAULT_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",  # vite dev
    "http://localhost:4173", "http://127.0.0.1:4173",  # vite preview
    "http://localhost", "https://localhost", "capacitor://localhost",  # Capacitor Android/iOS WebView
]


def _allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    extra = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    return ["*"] if "*" in extra else list(dict.fromkeys(DEFAULT_ORIGINS + extra))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,  # e.g. https?://192\.168\.\d+\.\d+:5173 for phone testing
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)


# --- Models -----------------------------------------------------------------
class DiagnosisRequest(BaseModel):
    crop: str = Field(default="maize", min_length=1, max_length=40)
    symptoms: str = Field(min_length=1, max_length=3000)
    answers: dict[str, str] = Field(default_factory=dict)

    @field_validator("symptoms")
    @classmethod
    def symptoms_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Please describe at least one crop symptom.")
        return value.strip()

    @field_validator("answers", mode="before")
    @classmethod
    def coerce_answers(cls, value: Any) -> dict[str, str]:
        # Be tolerant of clients that send numbers/booleans/lists, but bounded.
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise ValueError("answers must be an object of question-id to answer.")
        if len(value) > 20:
            raise ValueError("Too many answers (max 20).")
        clean: dict[str, str] = {}
        for key, item in value.items():
            if isinstance(item, dict):
                raise ValueError("Each answer must be text, not an object.")
            if isinstance(item, (list, tuple)):
                item = ", ".join(str(x) for x in item)
            clean[str(key)[:64]] = str(item)[:300]
        return clean


# --- Errors -----------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error. Please try again."})


@app.exception_handler(FileNotFoundError)
async def data_missing(request: Request, exc: FileNotFoundError):
    log.error("Data file missing: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Knowledge data is not available on the server."})


# --- Routes -----------------------------------------------------------------
@app.get("/health")
def health():
    """Liveness + data check. Returns 503 if the knowledge/rules files cannot be loaded."""
    try:
        rules = engine.get_rules()
        count = len(engine.get_problems())
    except Exception as exc:  # noqa: BLE001 - report any load failure as unhealthy
        log.error("Health check failed: %s", exc)
        return JSONResponse(status_code=503, content={"status": "unhealthy", "service": "agrimobi-api", "version": API_VERSION, "detail": str(exc)})
    return {"status": "ok", "service": "agrimobi-api", "version": API_VERSION, "engine_version": rules["version"], "knowledge_items": count}


@app.get("/api/v1/knowledge")
def knowledge():
    problems = engine.get_problems()
    return {
        "count": len(problems),
        "problems": [
            {"id": p["id"], "name": p["problem_name"], "category": p.get("category"), "crop": p.get("crop", "Maize"), "version": p.get("version", "1.1")}
            for p in problems
        ],
    }


@app.post("/api/v1/diagnosis")
def create_diagnosis(request: DiagnosisRequest):
    if request.crop.strip().lower() not in {"maize", "corn"}:
        raise HTTPException(status_code=422, detail="The MVP currently supports maize only.")
    result = engine.diagnose(request.symptoms, request.answers)
    result["crop"] = "maize"
    return result
