# AgriMobi AI API (Phase 13)

## What this is
A FastAPI service with a deterministic, evidence-weighted maize triage engine that matches the frontend's eight core knowledge-base categories. It is a rule-based MVP, not a trained ML model and not a replacement for an extension officer's field assessment. It deliberately asks follow-up questions when evidence is weak.

## Run locally
Requires Python 3.10+.

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

Check `http://127.0.0.1:8000/health` and interactive docs at `http://127.0.0.1:8000/docs`.

Example request:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/diagnosis \\
  -H "Content-Type: application/json" \\
  -d '{"crop":"maize","symptoms":"worms in the whorl with frass and ragged holes","answers":{}}'
```

Run tests from the project root:

```bash
cd backend
pytest -q
```

## API
- `GET /health`
- `GET /api/v1/knowledge`
- `POST /api/v1/diagnosis` with `{ "crop": "maize", "symptoms": "...", "answers": {} }`

`problem_id` is `null` if evidence is too weak. Confidence is evidence/margin-based and must not be interpreted as a calibrated probability.

## Data and deployment
The API reads `knowledgeBase.json` and `diagnosisRules.json` (shared with the frontend, so both give identical answers). Lookup order: `AGRIMOBI_DATA_DIR`, then `backend/app/data/`, then `frontend/src/data/`. For a standalone deploy run `python scripts/sync_data.py` before building. `database/001_initial_schema.sql` is the initial Supabase schema for profiles, farms, knowledge items, diagnoses and feedback. The SQL migration is not automatically applied, and this API does not yet persist diagnoses to PostgreSQL. Configure Supabase only in a trusted backend environment; never ship a service-role key in the mobile app.


## CORS
Set `ALLOWED_ORIGINS` (comma-separated) to every origin that serves the app, e.g. your deployed HTTPS site. For phone testing over Wi-Fi add `ALLOWED_ORIGIN_REGEX=https?://192\.168\.\d+\.\d+:(5173|4173)`. Capacitor (`http(s)://localhost`, `capacitor://localhost`) is allowed by default.

## Debugging checklist
1. `curl :8000/health` -> `ok`, `knowledge_items: 8`. 503 = data files not found (see lookup order above).
2. `curl -X POST :8000/api/v1/diagnosis ...` works but the app still uses the local engine -> open the browser console: `remote diagnosis failed` shows the reason (CORS, timeout, 4xx/5xx, wrong URL).
3. In the browser Network tab the POST should be to your API URL with status 200; a red `(blocked:cors)` means fix `ALLOWED_ORIGINS`.
4. Results contain `engine_version`; the app tags them `engine_source: remote|local`.
