# Thekedar

Thekedar is a construction marketplace connecting customers and contractors with labour, machine owners, and water tanker owners.

## Project structure

- `frontend/` - React and Vite client application
- `backend/` - Express REST API

## Requirements

- Node.js 22+ and npm
- A Supabase project with the schema and multi-service migration applied

## Install dependencies

Run `npm ci` at the repository root to install test and deployment dependencies.


```bash
cd frontend
npm install

cd ../backend
npm install
```

## Start the applications

Open two terminals from the project root.

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

Health check: `GET http://localhost:5000/api/health`

## Supabase database setup

1. Create a Supabase project, or use your existing one.
2. Copy `backend/.env.example` to `backend/.env`.
3. Put the project URL, anon key, and service-role key in `backend/.env`.
4. For a new database only, run `backend/supabase/schema.sql` once.
5. Run `backend/supabase/multi_service_provider_migration.sql` for both existing and new databases.
6. Copy `frontend/.env.example` to `frontend/.env` and set the project URL and publishable/anon key.

The SQL migration creates the tables, constraints, indexes, triggers, RLS policies, and private Storage buckets. Storage guidance is documented in `backend/supabase/storage.md`.

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or expose it to the browser.

## Verification and deployment

Run `npm run verify` for PostgreSQL/RLS, API, recovery, location, build, and secret checks. Run `npm run test:ui` after `npx playwright install chromium` for browser verification.

See [production deployment](docs/DEPLOYMENT.md) for Vercel, Supabase settings, environment variables, and the live release checklist. Local tests use fixtures; hosted signup, SMTP delivery, bookings, and storage must be checked against your production project.
