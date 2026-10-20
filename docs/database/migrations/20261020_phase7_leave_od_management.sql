-- ============================================================================
-- CAMU-NEXT — PHASE 7: LEAVE & ON-DUTY (OD) MANAGEMENT MIGRATION
-- ============================================================================

-- 1. Extend leave_status enum with required workflow states
ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'NEEDS_CORRECTION';

-- 2. Extend leave_applications table with additive columns
ALTER TABLE leave_applications
  ADD COLUMN IF NOT EXISTS category VARCHAR(32) NOT NULL DEFAULT 'LEAVE',
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assigned_approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
  ADD COLUMN IF NOT EXISTS supporting_file_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Date sanity check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_leave_dates'
  ) THEN
    ALTER TABLE leave_applications
      ADD CONSTRAINT chk_leave_dates CHECK (end_date >= start_date);
  END IF;
END $$;

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_leave_applications_student_id ON leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_assigned_approver ON leave_applications(assigned_approver_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON leave_applications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_category ON leave_applications(category);
CREATE INDEX IF NOT EXISTS idx_leave_applications_created_at ON leave_applications(created_at DESC);

-- 3. Create Immutable Leave & OD Audit Trail Table
CREATE TABLE IF NOT EXISTS leave_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  previous_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_audit_logs_application_id ON leave_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_logs_action ON leave_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_leave_audit_logs_performed_by ON leave_audit_logs(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_leave_audit_logs_created_at ON leave_audit_logs(created_at DESC);

-- 4. Enforce Append-Only Immutability via Trigger on leave_audit_logs
CREATE OR REPLACE FUNCTION trg_prevent_leave_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: leave_audit_logs is an immutable append-only ledger and cannot be modified or deleted (Operation: %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_audit_logs_immutable ON leave_audit_logs;
CREATE TRIGGER trg_leave_audit_logs_immutable
BEFORE UPDATE OR DELETE ON leave_audit_logs
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_leave_audit_logs_mutation();

-- 5. Seed / Align Mentor Assignments for Development Fixtures
-- Student 1 (Harendra Pratap) mentored by Dr. Rajesh Sharma (Faculty Fixture)
UPDATE student_profiles
SET mentor_faculty_id = 'a0000000-0000-4000-8000-000000000002'::uuid
WHERE user_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  AND (mentor_faculty_id IS NULL OR mentor_faculty_id <> 'a0000000-0000-4000-8000-000000000002'::uuid);

-- Student 2 (Aaditya Sharma) mentored by Dr. Vivek Bhatt
UPDATE student_profiles
SET mentor_faculty_id = 'a0000000-0000-4000-8000-000000000011'::uuid
WHERE user_id = 'a0000000-0000-4000-8000-000000000003'::uuid
  AND (mentor_faculty_id IS NULL OR mentor_faculty_id <> 'a0000000-0000-4000-8000-000000000011'::uuid);
