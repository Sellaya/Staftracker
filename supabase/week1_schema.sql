-- Staftracker — schema aligned with Next.js API routes using Supabase (see hasSupabaseEnv() routes).
-- Run once in Supabase SQL Editor on a fresh project (or adjust IF NOT EXISTS usage).
--
-- Notes:
-- - Server routes use the Supabase service role / server client; enable RLS only after you add policies,
--   or the anon key from the browser will not match server behavior.
-- - IDs are application-generated text prefixes (U-, W-, C-, V-, J-, S-, INV-, LOG-).
-- - `audit_logs` and `timesheets` exist so GET /api/supabase/health passes; `recordLog()` still writes
--   to audit_logs.json until you migrate audit to Postgres.

BEGIN;

-- ---------------------------------------------------------------------------
-- users (signup worker/client, admin POST /api/users, login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  password text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- ---------------------------------------------------------------------------
-- workers (worker signup, /api/workers, /api/worker/profile — see worker-supabase.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workers (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  document_status text NOT NULL DEFAULT 'Pending',
  reliability numeric NOT NULL DEFAULT 100,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  role_overrides jsonb NOT NULL DEFAULT '[]'::jsonb,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  shift_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  lifetime_earnings text NOT NULL DEFAULT '$0.00',
  legal_status text NOT NULL DEFAULT '',
  linkedin text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  neighborhoods jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_experience text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  smart_serve_has boolean NOT NULL DEFAULT false,
  smart_serve_number text NOT NULL DEFAULT '',
  food_handler_has boolean NOT NULL DEFAULT false,
  food_handler_number text NOT NULL DEFAULT '',
  resume_file_name text,
  extra_doc_file_name text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- clients (signup/client + /api/clients — toClientDto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  payment_method text NOT NULL DEFAULT 'Credit Card',
  address text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  tax_id text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  custom_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_workers jsonb NOT NULL DEFAULT '[]'::jsonb,
  invoices jsonb NOT NULL DEFAULT '[]'::jsonb,
  venue_count integer NOT NULL DEFAULT 0,
  billing_email text,
  venue_type text,
  staffing_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  staffing_frequency text NOT NULL DEFAULT '',
  logistics jsonb,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON clients (lower(email));

-- ---------------------------------------------------------------------------
-- venues (/api/venues, signup/client venue insert — toVenueDto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venues (
  id text PRIMARY KEY,
  client_id text NOT NULL,
  client_name text,
  name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  gps text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  contact_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  venue_type text NOT NULL DEFAULT '',
  departments jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text NOT NULL DEFAULT '',
  dress_code text NOT NULL DEFAULT '',
  parking_info text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_client ON venues (client_id);

-- ---------------------------------------------------------------------------
-- jobs (/api/jobs, apply, withdraw, assignment — jobRowToClientJob + payloads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  client_id text,
  client_name text,
  venue_id text,
  venue_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Open',
  date date,
  start_time text,
  end_time text,
  hours numeric,
  rate numeric,
  headcount numeric,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  assigned_worker_id text,
  assigned_worker_name text,
  applicants jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Read by jobRowToClientJob for dashboards (optional on insert; defaults cover UI)
  is_urgent boolean NOT NULL DEFAULT false,
  instructions text NOT NULL DEFAULT '',
  uniform text NOT NULL DEFAULT '',
  parking text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs (client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);

-- ---------------------------------------------------------------------------
-- shifts (/api/shifts, jobs assignment creates rows — toShiftDto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id text PRIMARY KEY,
  job_id text,
  client_id text,
  client_name text,
  venue_id text,
  venue_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  date date,
  scheduled_start text,
  scheduled_end text,
  hours numeric,
  rate numeric,
  status text NOT NULL DEFAULT 'Upcoming',
  worker_id text,
  worker_name text,
  actual_check_in text,
  actual_check_out text,
  gps_status text,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  timesheet_id text,
  payment_status text NOT NULL DEFAULT 'pending',
  invoice_status text NOT NULL DEFAULT 'pending',
  is_approved boolean NOT NULL DEFAULT false,
  is_invoiced boolean NOT NULL DEFAULT false,
  invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_worker ON shifts (worker_id);
CREATE INDEX IF NOT EXISTS idx_shifts_client ON shifts (client_id);
CREATE INDEX IF NOT EXISTS idx_shifts_job ON shifts (job_id);

-- ---------------------------------------------------------------------------
-- invoices (/api/invoices POST — toInvoiceDto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  client_id text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  shift_count integer NOT NULL DEFAULT 0,
  shift_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices (client_id);

-- ---------------------------------------------------------------------------
-- timesheets — worker check-out creates rows; client approval & GET /api/timesheets (Week 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timesheets (
  id text PRIMARY KEY,
  shift_id text,
  worker_id text,
  worker_name text,
  client_id text,
  client_name text,
  venue_name text,
  role text,
  date text,
  scheduled_start text,
  scheduled_end text,
  actual_check_in text,
  actual_check_out text,
  hours numeric,
  rate numeric,
  status text NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_worker ON timesheets (worker_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON timesheets (client_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_shift ON timesheets (shift_id);

-- ---------------------------------------------------------------------------
-- audit_logs — required by /api/supabase/health; matches recordLog shape for future migration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  action text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  user_email text NOT NULL DEFAULT '',
  user_id text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);

COMMIT;
