# Phase 13 — developer review and fixes

## Found and fixed
1. **Backend had no CORS** (`ALLOWED_ORIGINS` was in `.env.example` but never used). Browsers blocked every API response, so the app silently fell back to the local engine and the API looked connected but was never used. Added CORS middleware (env-driven, Capacitor-aware).
2. **App and API disagreed on 7 of 25 test inputs** (two hand-copied vocabularies). e.g. "my old farm has yellow leaves" -> nitrogen deficiency on the phone, "no match" on the API. Moved all rules into `frontend/src/data/diagnosisRules.json`, read by both. Verified identical on 1,500 random inputs plus 35 golden cases.
3. **Follow-up answers were not understood** ("Dead central shoot" matched nothing). Fixed and covered by a test over every tappable option.
4. **Possible infinite follow-up loop offline** when answers stayed unclear. Now ends in an extension-officer referral (also no more empty red box on the result screen).
5. **No fetch timeout**: on a weak rural connection the app could hang instead of falling back. 8s timeout + response-shape validation + trailing-slash handling.
6. **Racing syncs** (start-up, `online` event, after each diagnosis, History/Account) now run single-flight with one re-run if something was saved mid-pass.
7. **Service worker served a stale `index.html` forever** after a deploy. Page loads are now network-first (4s cap) with offline fallback; cache bumped to v5.
8. Backend hardening: tolerant bounded `answers`, JSON error handlers, `/health` returns 503 if data is missing, data lookup works outside the monorepo (`scripts/sync_data.py`, `AGRIMOBI_DATA_DIR`), regex look-behind removed so old Android WebViews work, History screen shows problem names for cloud-only records.

## Verified here
- `node tests/diagnosisEngine.test.mjs` passes; engine pytest functions pass; Python/JS fuzz parity 1500/1500; client fallback/timeout tested against 6 mocked failure modes; `py_compile` on all backend files.

## NOT verified here (no network in the review sandbox)
- `pytest` for `tests/test_api.py` (needs `pip install -r requirements.txt`), `npm run build`, and Supabase sign-in/sync against a real project.

## Still open
- `diagnoses.client_record_id` unique index is global; a per-user `(user_id, client_record_id)` index is cleaner.
- Rule-based, not ML; no Bemba/Nyanja input; KB claims still need expert verification.
