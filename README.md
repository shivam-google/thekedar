# Thekedar

Thekedar is a construction marketplace connecting customers and contractors with labour, machine owners, and water tanker owners.

## Project structure

- `frontend/` - React and Vite client application
- `backend/` - Express REST API

## Requirements

- Node.js 18+
- npm 9+
- PostgreSQL (not used by the initial health endpoint)

## Install dependencies

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

1. Create a Supabase project.
2. Copy `backend/.env.example` to `backend/.env`.
3. Put the project URL, anon key, and service-role key in `backend/.env`.
4. Open `backend/supabase/schema.sql` in the Supabase SQL Editor and run it once.

The SQL migration creates the tables, constraints, indexes, triggers, RLS policies, and private Storage buckets. Storage guidance is documented in `backend/supabase/storage.md`.

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or expose it to the browser.
