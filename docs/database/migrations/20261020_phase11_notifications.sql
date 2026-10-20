-- ============================================================================
-- CAMU-NEXT — PHASE 11: NOTIFICATIONS & COMMUNICATION CENTER MIGRATION
-- Database: PostgreSQL (dbs_camu_dev)
-- ============================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL, -- e.g. 'NOTICE', 'ASSIGNMENT', 'LEAVE_OD', 'FINANCE', 'SUPPORT_TICKET', 'ACADEMIC', 'SYSTEM'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    resource_type VARCHAR(64), -- e.g. 'NOTICE', 'ASSIGNMENT', 'LEAVE_APPLICATION', 'FEE_INVOICE', 'FEE_RECEIPT', 'SUPPORT_TICKET'
    resource_id VARCHAR(255),
    action_url VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(128),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for fast retrieval and filtering
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications(type);

-- 3. Unique constraint on recipient_id + idempotency_key (when idempotency_key is present)
-- Ensures duplicate event delivery or job retries cannot produce duplicate notifications for the same recipient
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_recipient_idempotency
    ON notifications(recipient_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
