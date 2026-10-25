#!/usr/bin/env bash
# One-command verification. Run from the project root: bash check_all.sh
# Needs: Node 18+, Python 3.10+, and a one-time `pip install -r backend/requirements.txt` + `npm install` in frontend/.
set -e
echo "== 1/4 Frontend engine + golden tests"; (cd frontend && node tests/diagnosisEngine.test.mjs)
echo "== 2/4 Backend tests (engine + HTTP + CORS)"; (cd backend && python -m pytest -q)
echo "== 3/4 Frontend production build"; (cd frontend && npm run build)
echo "== 4/4 Backend data sync dry-run"; (cd backend && python scripts/sync_data.py >/dev/null && echo "data files found")
echo "ALL CHECKS PASSED"
