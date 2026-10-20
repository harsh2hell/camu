-- ==============================================================================
-- CAMU-NEXT — PHASE 9: STUDENT PROFILE & ACADEMIC RECORDS MIGRATION
-- Migration: 20261020_phase9_student_profile_audit.sql
-- Description: Additive columns for student profiles, profile audit logging table,
--              and immutability trigger.
-- ==============================================================================

-- 1. Add additive personal and correspondence contact columns to student_profiles
ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line TEXT,
    ADD COLUMN IF NOT EXISTS city VARCHAR(64),
    ADD COLUMN IF NOT EXISTS state VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(16),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create profile_audit_logs table for durable audit history of profile changes
CREATE TABLE IF NOT EXISTS profile_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    changed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create performance indexes for profile audit queries
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_profile_id ON profile_audit_logs(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_changed_by ON profile_audit_logs(changed_by_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_created_at ON profile_audit_logs(created_at DESC);

-- 4. Immutability function and trigger for profile_audit_logs
CREATE OR REPLACE FUNCTION trg_prevent_profile_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Profile audit logs are strictly append-only; UPDATE and DELETE operations are prohibited.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_audit_logs_immutable ON profile_audit_logs;
CREATE TRIGGER trg_profile_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON profile_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_prevent_profile_audit_logs_mutation();
