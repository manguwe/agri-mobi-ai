# AgriMobi AI — Phase 13

Offline-first agricultural decision support for maize farmers in Zambia and Zimbabwe.

## What's in this package

- `frontend/` — React/Vite mobile-first PWA, offline knowledge cache and local diagnosis engine.
- `backend/` — FastAPI API with matching deterministic diagnosis rules and automated tests.
- `database/001_initial_schema.sql` — initial Supabase/PostgreSQL schema and row-level security policies.
- `frontend/src/data/diagnosisRules.json` — **shared** diagnosis vocabulary/weights/thresholds read by BOTH the app and the API (edit rules here only).
- `PHASE12_NOTES.md`, `PHASE13_NOTES.md` — delivered changes, fixes and what remains.

## 1. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Run local diagnosis tests:

```bash
node tests/diagnosisEngine.test.mjs
```

`tests/goldenCases.json` is also asserted by the backend tests, so if both suites pass the app and the API agree.

## 2. Run the backend

In a second terminal:

```bash
cd backend
python -m venv .venv
```

Activate it, then install and run:

```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

Check `http://127.0.0.1:8000/health` (returns 503 if the data files cannot be found) and `http://127.0.0.1:8000/docs`.

Run backend tests from `backend/`:

```bash
pytest -q
```

## 3. Connect the frontend to the API

Copy `frontend/.env.example` to `frontend/.env.local`, then set:

```dotenv
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=http://localhost:8000
```

Restart Vite after changing environment variables. The API must allow the origin the app is served from (`ALLOWED_ORIGINS` in `backend/.env`); localhost:5173/4173 and Capacitor are allowed by default. If the API is unavailable, the frontend falls back to its local engine. For a physical phone, `localhost` points to the phone itself; use the computer's LAN IP address or a deployed HTTPS API URL instead.

## 4. Supabase database foundation

Review `database/001_initial_schema.sql`, then run it in the Supabase SQL Editor. It creates profiles, farms, knowledge items, diagnoses, feedback tables, indexes and RLS policies. The schema is not automatically applied, and the current FastAPI endpoint does not yet write diagnosis records to it. Never include a Supabase service-role key in the frontend or Android app.

## Important limitations

- Diagnosis is a rule-based evidence engine, not a trained machine-learning model. Confidence is a heuristic score/margin, not a calibrated probability.
- The current MVP supports maize and eight core problem categories only.
- The knowledge base still needs expert/agricultural authority verification before advice is treated as definitive.
- The Android project/APK is not yet generated or device-tested.
