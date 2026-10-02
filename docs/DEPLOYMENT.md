# Production deployment

The frontend and Express API can run together in one Vercel project using the root `vercel.json` and `api/index.js`. Supabase remains the database, authentication, and storage backend. A separate API host is optional.

## Database

For an existing project, back up the database and run `backend/supabase/multi_service_provider_migration.sql` in Supabase's SQL Editor. It is transactional and safe to re-run. It adds managed-worker ownership and optional listing coordinates, replaces role-specific creation policies, and protects listing and booking integrity. Existing accounts and listings are preserved.

For a new project, run `backend/supabase/schema.sql` once, followed by the migration. **Do not re-run `schema.sql` on an existing project.** The optional `profile_fix_review.sql` is only for projects missing profile triggers or rows; its null-role fallback has been corrected.

Providers can list every service without changing their account role. Machines and tankers still start as `PENDING`; an existing administrator approves them. Providers cannot self-approve. Listings with booking history must be paused rather than deleted. Booking totals are calculated from stored rates; daily rentals include both dates, and other rental units use one listed rate per requested quantity.

The migration is tested against PostgreSQL through PGlite with Supabase auth/storage fixtures. It has not been applied to a hosted Supabase project in this workspace.

## Vercel

Import or deploy this checkout with the project root set to the repository root, not `frontend/`. Use Node.js 22 and the committed build/output configuration. Add these variables to Production and Preview in Vercel's environment settings:

| Variable | Value | Browser-visible |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key | Yes |
| `SUPABASE_URL` | Same project URL | No |
| `SUPABASE_ANON_KEY` | Same publishable/anon key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key from that project | **Never** |
| `VITE_API_URL` | Leave unset for the same-origin API | Yes |

Only the URL and publishable/anon key belong in `VITE_*` values. Changing a `VITE_*` value requires a rebuild. `/api/health` checks the process, while `/api/health/db` checks database connectivity. Production browser API requests use the current site's origin by default.

For separate hosting, start the API with `npm ci --prefix backend` and `npm start --prefix backend`. Set `VITE_API_URL` to the HTTPS API origin and the backend's `CORS_ORIGINS` to the exact frontend origin. Multiple comma-separated origins are supported. Set `PORT` if required by the API host.

Configuration follows the official [Vercel project configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

## Supabase Auth

Set Authentication → URL Configuration → Site URL to the final HTTPS frontend origin. Add the exact `https://YOUR-SITE/reset-password` redirect URL. Keep `http://localhost:5173/reset-password` for local testing. The reset email template should use `{{ .ConfirmationURL }}` so the requested redirect is preserved.

Configure an SMTP sender for production email delivery and a minimum password length of eight characters. See the official [password authentication guide](https://supabase.com/docs/guides/auth/passwords) and [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Release verification

```sh
npm ci
npm ci --prefix frontend
npm ci --prefix backend
npm run verify
npx playwright install chromium
npm run test:ui
```

On the deployed site, use test accounts to check:

- Signup, confirmation email, login, logout, and role-protected pages.
- Receive a reset email, open it, save a new password, and log in with that password. Verify the old password fails and an expired link cannot update a password.
- As a contractor, add multiple listings of all four types; edit, pause, reactivate, and delete an unbooked listing. Approve pending machines/tankers as an administrator.
- As another provider, request a managed driver. Confirm the contractor sees the request, completes its lifecycle, and receives a review.
- Confirm another account cannot update/delete a listing, self-approve, forge a booking provider/price, or delete a booked listing.
- Browse all marketplaces as a guest and authenticated user; filter city/state; share browser location and check Nearby distance order. Listings without coordinates follow with city/state relevance. Add coordinates to legacy listings for distance sorting.
- Upload machine/profile images and reload. Visible machine images can load for guests; unpublished/unavailable machine images require owner authentication.
- Open deep links such as `/services` and `/reset-password` directly; verify both API health endpoints return JSON.

Browser tests use controlled API fixtures. They validate UI behavior, not real SMTP delivery, hosted Supabase settings, or production storage. Live checks require a real project and inbox.
