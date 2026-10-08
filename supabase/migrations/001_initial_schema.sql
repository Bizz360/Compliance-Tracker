-- ==============================================================================
-- SAP-Style CRM / Customs Process Management System
-- Initial Migration: 001_initial_schema.sql
-- Compatible with Supabase PostgreSQL 15+
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER PROFILES TABLE (Linked to auth.users in Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('TEAM', 'PCO', 'HQ', 'ADMIN')),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- 3. MASTER DATA TABLE
CREATE TABLE IF NOT EXISTS public.master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN (
        'TEAM_NAME', 'DIVISION', 'ISSUE_CATEGORY', 'ERROR_CATEGORY', 'OWNERSHIP', 'STATUS'
    )),
    value TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 10,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_category_value UNIQUE(category, value)
);

-- 4. BPO RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.bpo_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT,
    customer TEXT NOT NULL,
    division TEXT NOT NULL,
    issue_category TEXT NOT NULL,
    permit_no TEXT NOT NULL,
    importer_exporter_name TEXT NOT NULL,
    mabl_obl_job_ref TEXT,
    error_category TEXT NOT NULL,
    description_of_error TEXT NOT NULL,
    root_cause TEXT,
    preventive_action TEXT,
    vdp_nod_refund_customs_reference TEXT,
    ownership TEXT NOT NULL,
    lsp_cs_name TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. HQ RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.hq_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bpo_id UUID NOT NULL REFERENCES public.bpo_records(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    submitted_date DATE DEFAULT CURRENT_DATE,
    permit_no TEXT,
    vdp_nod_refund_customs_reference TEXT,
    ownership TEXT,
    approval_date DATE,
    status TEXT NOT NULL DEFAULT 'Open',
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL,
    bpo_id UUID REFERENCES public.bpo_records(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_by_name TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    reference TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RECORD ATTACHMENTS (STORAGE INTEGRATION)
CREATE TABLE IF NOT EXISTS public.record_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bpo_id UUID NOT NULL REFERENCES public.bpo_records(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR ENTERPRISE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bpo_records_reference ON public.bpo_records(reference);
CREATE INDEX IF NOT EXISTS idx_bpo_records_team_id ON public.bpo_records(team_id);
CREATE INDEX IF NOT EXISTS idx_bpo_records_status ON public.bpo_records(status);
CREATE INDEX IF NOT EXISTS idx_bpo_records_issue_date ON public.bpo_records(issue_date);
CREATE INDEX IF NOT EXISTS idx_bpo_records_customer ON public.bpo_records(customer);
CREATE INDEX IF NOT EXISTS idx_bpo_records_permit_no ON public.bpo_records(permit_no);
CREATE INDEX IF NOT EXISTS idx_bpo_records_created_by ON public.bpo_records(created_by);
CREATE INDEX IF NOT EXISTS idx_bpo_records_is_deleted ON public.bpo_records(is_deleted);

CREATE INDEX IF NOT EXISTS idx_hq_records_bpo_id ON public.hq_records(bpo_id);
CREATE INDEX IF NOT EXISTS idx_hq_records_reference ON public.hq_records(reference);
CREATE INDEX IF NOT EXISTS idx_hq_records_status ON public.hq_records(status);

CREATE INDEX IF NOT EXISTS idx_status_history_bpo_id ON public.status_history(bpo_id);
CREATE INDEX IF NOT EXISTS idx_status_history_reference ON public.status_history(reference);

CREATE INDEX IF NOT EXISTS idx_audit_logs_reference ON public.audit_logs(reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Reference Generator: COM-YYMMDDHHMMSS with auto-collision resolver
CREATE OR REPLACE FUNCTION public.generate_bpo_reference()
RETURNS TEXT AS $$
DECLARE
    new_ref TEXT;
    counter INT := 0;
    candidate TEXT;
BEGIN
    new_ref := 'COM-' || TO_CHAR(NOW(), 'YYMMDDHH24MISS');
    candidate := new_ref;
    
    WHILE EXISTS (SELECT 1 FROM public.bpo_records WHERE reference = candidate) LOOP
        counter := counter + 1;
        candidate := new_ref || '-' || LPAD(counter::TEXT, 2, '0');
    END LOOP;
    
    RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate reference if not supplied
CREATE OR REPLACE FUNCTION public.trg_bpo_reference_auto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL OR NEW.reference = '' THEN
        NEW.reference := public.generate_bpo_reference();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bpo_reference ON public.bpo_records;
CREATE TRIGGER set_bpo_reference
    BEFORE INSERT OR UPDATE ON public.bpo_records
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_bpo_reference_auto();

-- Auto-sync HQ record when BPO record is created
CREATE OR REPLACE FUNCTION public.trg_sync_hq_on_bpo_create()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.hq_records (
        bpo_id,
        reference,
        submitted_date,
        permit_no,
        vdp_nod_refund_customs_reference,
        ownership,
        status,
        created_by
    ) VALUES (
        NEW.id,
        NEW.reference,
        NEW.issue_date,
        NEW.permit_no,
        NEW.vdp_nod_refund_customs_reference,
        NEW.ownership,
        NEW.status,
        NEW.created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_hq_on_bpo_insert ON public.bpo_records;
CREATE TRIGGER sync_hq_on_bpo_insert
    AFTER INSERT ON public.bpo_records
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_hq_on_bpo_create();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_attachments ENABLE ROW LEVEL SECURITY;

-- Helper to get current profile
CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS public.profiles AS $$
    SELECT * FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Master data: anyone authenticated can read active, only ADMIN can insert/update/delete
CREATE POLICY "Allow read master_data" ON public.master_data
    FOR SELECT TO authenticated
    USING (active = true OR (public.get_current_profile()).role = 'ADMIN');

CREATE POLICY "Admin manage master_data" ON public.master_data
    FOR ALL TO authenticated
    USING ((public.get_current_profile()).role = 'ADMIN')
    WITH CHECK ((public.get_current_profile()).role = 'ADMIN');

-- Profiles: users read profiles, only ADMIN manage
CREATE POLICY "Allow read profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin manage profiles" ON public.profiles
    FOR ALL TO authenticated
    USING ((public.get_current_profile()).role = 'ADMIN')
    WITH CHECK ((public.get_current_profile()).role = 'ADMIN');

-- Teams: read active teams, ADMIN manage
CREATE POLICY "Allow read teams" ON public.teams
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin manage teams" ON public.teams
    FOR ALL TO authenticated
    USING ((public.get_current_profile()).role = 'ADMIN');

-- BPO Records RLS:
-- ADMIN: ALL
-- HQ: SELECT all active BPO records, UPDATE status/process
-- PCO: SELECT, INSERT, UPDATE, DELETE for permitted records
-- TEAM: SELECT, INSERT, UPDATE, DELETE for own team records
CREATE POLICY "bpo_select_policy" ON public.bpo_records
    FOR SELECT TO authenticated
    USING (
        is_deleted = false AND (
            (public.get_current_profile()).role = 'ADMIN' OR
            (public.get_current_profile()).role = 'HQ' OR
            (public.get_current_profile()).role = 'PCO' OR
            (team_id = (public.get_current_profile()).team_id)
        )
    );

CREATE POLICY "bpo_insert_policy" ON public.bpo_records
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.get_current_profile()).role IN ('ADMIN', 'PCO', 'TEAM') AND
        (
            (public.get_current_profile()).role IN ('ADMIN', 'PCO') OR
            team_id = (public.get_current_profile()).team_id
        )
    );

CREATE POLICY "bpo_update_policy" ON public.bpo_records
    FOR UPDATE TO authenticated
    USING (
        (public.get_current_profile()).role = 'ADMIN' OR
        ((public.get_current_profile()).role = 'HQ') OR
        ((public.get_current_profile()).role = 'PCO' AND created_by = (public.get_current_profile()).id) OR
        ((public.get_current_profile()).role = 'TEAM' AND team_id = (public.get_current_profile()).team_id AND created_by = (public.get_current_profile()).id)
    );

CREATE POLICY "bpo_delete_policy" ON public.bpo_records
    FOR DELETE TO authenticated
    USING (
        (public.get_current_profile()).role = 'ADMIN' OR
        ((public.get_current_profile()).role = 'PCO' AND created_by = (public.get_current_profile()).id) OR
        ((public.get_current_profile()).role = 'TEAM' AND team_id = (public.get_current_profile()).team_id AND created_by = (public.get_current_profile()).id)
    );

-- Audit logs: readable by ADMIN only, insertable by system
CREATE POLICY "audit_admin_read" ON public.audit_logs
    FOR SELECT TO authenticated
    USING ((public.get_current_profile()).role = 'ADMIN');

CREATE POLICY "audit_insert_any" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
