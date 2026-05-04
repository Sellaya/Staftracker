-- Week 2 E2E: extend `timesheets` if you already ran an older `week1_schema.sql` (minimal timesheets).
-- Safe to run multiple times. New installs only need `week1_schema.sql` (includes full timesheets).

BEGIN;

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS worker_name text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS venue_name text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS scheduled_start text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS scheduled_end text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_check_in text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_check_out text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS issue_reason text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_by text;

CREATE INDEX IF NOT EXISTS idx_timesheets_shift ON timesheets (shift_id);

COMMIT;
