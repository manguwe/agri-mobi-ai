"""Copy the shared data files into backend/app/data for deployment.

The backend and the frontend share two JSON files (knowledgeBase.json and
diagnosisRules.json). In the monorepo the backend reads them straight from
frontend/src/data. When the backend is deployed on its own (Docker, Render,
Railway...) there is no frontend folder, so run this before building:

    cd backend && python scripts/sync_data.py

or set AGRIMOBI_DATA_DIR to a folder that contains both files.
"""
import shutil
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
source = backend.parent / "frontend" / "src" / "data"
target = backend / "app" / "data"
FILES = ["knowledgeBase.json", "diagnosisRules.json"]

missing = [f for f in FILES if not (source / f).is_file()]
if missing:
    sys.exit(f"Cannot find {missing} in {source}")
target.mkdir(parents=True, exist_ok=True)
for name in FILES:
    shutil.copy2(source / name, target / name)
    print(f"copied {name} -> {target / name}")
