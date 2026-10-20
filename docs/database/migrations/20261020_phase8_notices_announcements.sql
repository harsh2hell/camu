-- ============================================================================
-- CAMU-NEXT — PHASE 8: NOTICES & ANNOUNCEMENTS MANAGEMENT MIGRATION
-- ============================================================================

-- 1. Create notice_status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_status') THEN
    CREATE TYPE notice_status AS ENUM (
      'DRAFT',
      'SCHEDULED',
      'PUBLISHED',
      'ARCHIVED',
      'CANCELLED'
    );
  END IF;
END $$;

-- 2. Extend notices Table with Additive Columns
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS status notice_status NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_semester INT,
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_file_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure all existing notices have status = 'PUBLISHED' and published_at set
UPDATE notices
SET status = 'PUBLISHED',
    published_at = COALESCE(published_at, created_at)
WHERE status IS NULL OR status = 'PUBLISHED';

-- 3. Check Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_notice_dates'
  ) THEN
    ALTER TABLE notices
      ADD CONSTRAINT chk_notice_dates
      CHECK (expires_at IS NULL OR publish_at IS NULL OR expires_at > publish_at);
  END IF;
END $$;

-- 4. Performance & Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_notices_status_publish ON notices(status, publish_at);
CREATE INDEX IF NOT EXISTS idx_notices_status_created ON notices(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_audience_role ON notices(target_role, status);
CREATE INDEX IF NOT EXISTS idx_notices_department ON notices(department_id, status);
CREATE INDEX IF NOT EXISTS idx_notices_program ON notices(program_id, status);
CREATE INDEX IF NOT EXISTS idx_notices_batch ON notices(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_notices_posted_by ON notices(posted_by);
CREATE INDEX IF NOT EXISTS idx_notices_priority ON notices(priority);
CREATE INDEX IF NOT EXISTS idx_notices_expires_at ON notices(expires_at);

-- 5. Create Immutable Notice Audit Trail Table
CREATE TABLE IF NOT EXISTS notice_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  previous_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notice_audit_logs_notice_id ON notice_audit_logs(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_audit_logs_action ON notice_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_notice_audit_logs_performed_by ON notice_audit_logs(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_notice_audit_logs_created_at ON notice_audit_logs(created_at DESC);

-- 6. Enforce Append-Only Immutability via Trigger on notice_audit_logs
CREATE OR REPLACE FUNCTION trg_prevent_notice_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: notice_audit_logs is an immutable append-only ledger and cannot be modified or deleted (Operation: %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_audit_logs_immutable ON notice_audit_logs;
CREATE TRIGGER trg_notice_audit_logs_immutable
BEFORE UPDATE OR DELETE ON notice_audit_logs
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_notice_audit_logs_mutation();

-- 7. Create Read Acknowledgement Table
CREATE TABLE IF NOT EXISTS notice_acknowledgements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notice_user_acknowledgement UNIQUE (notice_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_ack_user_id ON notice_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_notice_ack_notice_id ON notice_acknowledgements(notice_id);
