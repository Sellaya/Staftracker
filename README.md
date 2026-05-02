## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure environment variables:

```bash
cp .env.example .env.local
```

Update `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3) Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Supabase Health Check

After setting env vars, verify Supabase wiring with:

- [http://localhost:3001/api/supabase/health](http://localhost:3001/api/supabase/health)

Expected:

```json
{ "ok": true, "message": "Supabase connection configured" }
```

If values are missing or invalid, the endpoint returns a clear error.

## Notes

- `src/lib/supabase.ts` now holds shared Supabase client config for browser and server usage.
- `src/utils/supabase/client.ts` reuses the shared browser client helper.

### MVP marketplace (Week 2)

When Supabase env vars are **not** set, jobs/shifts use JSON files under the project root (`jobs.json`, `shifts.json`). When **Supabase is configured**, the same flows run against Postgres (`jobs`, `shifts`, etc.): workers **apply** / **withdraw**, admins **confirm**, **direct assign**, **reject**, and **unassign** (with linked shift cancel / insert). Assignment responses use the same client job shape as `GET /api/jobs` (`jobRowToClientJob`). First staffed slot only; `headcount` is stored for future multi-slot work.

**Week 2 (marketplace + field ops, Supabase):**

- Job posts persist **`is_urgent`**, **`instructions`**, **`uniform`**, **`parking`** (`POST`/`PUT /api/jobs`); responses use **`jobRowToClientJob`**.
- **`POST /api/shifts/actions`** (check-in/out, client timesheet approval, admin overrides / payment flags) updates **`shifts`** and **`timesheets`** in Postgres when env is set.
- **`GET /api/timesheets`** reads **`timesheets`** with role-scoped filters (admin / client / worker).
- **`recordLog`** writes **`audit_logs`** first when Supabase is configured (falls back to `audit_logs.json` on failure); **`GET /api/audit`** reads **`audit_logs`** from Postgres.

**Database:** Fresh installs: run **`supabase/week1_schema.sql`** (includes full **`timesheets`** definition). If you created tables from an **older** minimal timesheets DDL, run **`supabase/week2_e2e.sql`** once to add missing columns (see file header).

## MVP: jobs marketplace (Week 2)

When `NEXT_PUBLIC_SUPABASE_URL` / keys are **not** set (or `hasSupabaseEnv()` is false), the app uses **JSON files** in the project root (`jobs.json`, `shifts.json`, `workers.json`) for jobs, apply, withdraw, and admin assignment.

When Supabase env **is** configured, the same flows use the **`jobs`**, **`shifts`**, and **`workers`** tables. Admin staffing actions go through **`POST /api/jobs/assignment`** (not `PUT /api/jobs`). Workers use **`POST /api/jobs/apply`** and **`POST /api/jobs/withdraw`**.

If your Supabase schema differs (column names or missing `applicants` JSON), align migrations with `src/app/api/jobs/route.ts` inserts and `src/lib/job-client-dto.ts` field mapping.

### Week 3 (billing & analytics)

- **Worker** `/worker/earnings` loads **`/api/shifts`**, **`/api/timesheets`**, and **`/api/worker/profile`**: gross pay from completed shifts (hours × rate), “marked paid” sum where shift payment status is `paid`, CSV export.
- **Admin** `/dashboard/reports` uses **jobs, shifts, invoices, timesheets** for fulfillment rate, invoiced totals, monthly shift counts, and CSV export (no placeholder metrics).

### Week 1 backend (onboarding & admin)

With **Supabase**, worker onboarding uses **`POST /api/signup/worker`** → `users` + `workers` rows (see `workerSignupToDbRow` / `workerFileShapeToDb` in `src/lib/worker-supabase.ts`). **`GET`/`PUT /api/worker/profile`**, **`/api/workers`** (admin CRUD), and **`/api/users`** (admin portal users) all run against Postgres when env is configured; otherwise they use `users.json` / `workers.json`. Ensure your `workers` table includes JSON/array columns expected by those helpers (e.g. `documents`, `roles`, `neighborhoods`) or adjust mappings to match your migration.

