-- DEPRECATED: This early schema is not compatible with the current MVP app.
-- Use supabase/week1_schema.sql for a fresh Supabase project.
-- Use supabase/week2_e2e.sql only to patch older Week 1 installs.
--
-- Staff Tracker (Powered by Ferrari) - legacy draft schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------
-- 1. WORKERS
--------------------------------------------------------
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    postal_code TEXT,
    neighborhoods TEXT[], -- Array of strings (e.g., '{"Downtown Core", "King West"}')
    status TEXT DEFAULT 'Pending', -- 'Active', 'Suspended', 'Pending'
    rating NUMERIC(3, 2) DEFAULT 0.00,
    reliability INTEGER DEFAULT 100,
    lifetime_earnings NUMERIC(10, 2) DEFAULT 0.00,
    legal_status TEXT, -- 'citizen', 'pr', 'work_permit', etc.
    linkedin_url TEXT,
    resume_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Approved Roles
CREATE TABLE worker_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    is_admin_override BOOLEAN DEFAULT FALSE,
    UNIQUE(worker_id, role_name)
);

-- Internal Admin Notes for Workers
CREATE TABLE worker_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Documents & Certifications
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'SmartServe', 'Food Handler', 'Government ID'
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Expired'
    file_url TEXT NOT NULL,
    expiry_date DATE,
    rejection_reason TEXT,
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 2. CLIENTS (VENUES/AGENCIES)
--------------------------------------------------------
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_first_name TEXT NOT NULL,
    contact_last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'Pending', -- 'Active', 'Suspended', 'Pending Payment'
    fee_percentage NUMERIC(5, 2) DEFAULT 15.00,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Custom Hourly Rates per Role
CREATE TABLE client_custom_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    hourly_rate NUMERIC(6, 2) NOT NULL,
    UNIQUE(client_id, role_name)
);

-- Client's Preferred Worker Roster
CREATE TABLE preferred_workers (
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    PRIMARY KEY (client_id, worker_id)
);

-- Client Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Paid', 'Pending', 'Failed'
    billing_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 3. VENUES (LOCATIONS)
--------------------------------------------------------
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    venue_name TEXT NOT NULL,
    venue_type TEXT,
    address TEXT NOT NULL,
    gps_coordinates TEXT,
    status TEXT DEFAULT 'Active', -- 'Active', 'Deactivated'
    arrival_instructions TEXT,
    dress_code TEXT,
    parking_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments active within a specific venue
CREATE TABLE venue_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(venue_id, department_name)
);

--------------------------------------------------------
-- 4. SHIFTS (FIELD WORK)
--------------------------------------------------------
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL, -- Null if unassigned
    role_name TEXT NOT NULL,
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    status TEXT DEFAULT 'Upcoming', -- 'Upcoming', 'Active', 'Completed', 'Cancelled'
    
    -- Telemetry & Timesheets
    actual_check_in TIME,
    actual_check_out TIME,
    gps_status TEXT DEFAULT 'Pending', -- 'Pending', 'Verified', 'Out of Bounds'
    
    -- Administrative Flags
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 5. RLS (Row Level Security) - BASE SETUP
--------------------------------------------------------
-- We enable RLS on all tables to ensure secure database querying later.
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_custom_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create a basic policy allowing full read/write for now (Will restrict via API keys)
CREATE POLICY "Allow full access for MVP" ON workers FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON worker_roles FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON worker_notes FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON documents FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON clients FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON client_custom_rates FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON preferred_workers FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON venues FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON venue_departments FOR ALL USING (true);
CREATE POLICY "Allow full access for MVP" ON shifts FOR ALL USING (true);
