# AgriMobi AI

Offline-first agricultural decision support for maize farmers.

## Current architecture

- React + Vite frontend
- Deterministic evidence-based diagnosis engine shared by online/local and offline paths
- Bundled agricultural knowledge base
- IndexedDB persistence for the knowledge base
- PWA shell/offline support
- Optional FastAPI backend contract
- Mobile-first UI, ready for Android packaging with Capacitor in the next packaging step

## Run

```bash
cd frontend
npm install
npm run dev
```

## Test diagnosis logic

```bash
cd frontend
node tests/diagnosisEngine.test.mjs
```

## Optional backend

```bash
cd backend
python -m venv .venv
# activate the environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The frontend does not require the backend for the core diagnosis workflow.


## Supabase account and diagnosis-history sync (Phase 13)

1. Create a Supabase project. In **Project Settings → API**, copy the project URL and the public anon/publishable key. Never use a `service_role` key in the frontend.
2. In Supabase **SQL Editor**, run `database/001_initial_schema.sql`, then `database/002_seed_core_knowledge.sql`. The second script seeds the eight core knowledge items referenced by diagnosis history.
3. In Supabase **Authentication → Providers**, enable Email. Configure email confirmation and password policies for your deployment.
4. Copy `.env.example` to `.env.local` in this `frontend` folder and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These variables are included in the public client bundle, so only the public anon/publishable key is appropriate.
5. Install dependencies and run the app: `npm install`, then `npm run dev`. After changing Vite environment variables, restart the dev server.
6. In the app, open **Account / Cloud sync**, create an account or sign in. Diagnoses are saved to IndexedDB first; pending records sync when a signed-in user has connectivity. Open **Diagnosis history** to refresh and inspect local/cloud records.

### Sync and privacy behavior

- A diagnosis is stored on the device before a cloud sync is attempted. Failed syncs remain queued and are not deleted.
- Only a signed-in user can sync records, and Supabase Row Level Security restricts cloud rows to their account. Local records remain on the device after sign-out.
- Unsynced local records can be attached to the first account that signs in on that device. Do not use shared devices without considering this behavior; clear browser/app storage when handing a device to another person.
- This MVP sync stores text symptom descriptions and the diagnosis result. Tell users clearly before deployment; add a separate consent/privacy flow before collecting photos, GPS, or other sensitive farm data.
- The FastAPI service remains optional for diagnosis; Supabase sync is performed directly by the client using the public key and RLS, not a service-role secret.
- Cloud sync has not been tested against a live Supabase project in this environment. Configure credentials and run an end-to-end test before launch.
