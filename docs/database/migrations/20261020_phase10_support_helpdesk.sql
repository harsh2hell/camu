-- ====================================================================
-- CAMU-NEXT DATABASE MIGRATION: PHASE 10 (STUDENT SUPPORT & HELPDESK)
-- Date: 2026-10-20
-- Description: Creates support_tickets, ticket_messages, and ticket_audit_logs
--              with anti-tamper immutability triggers and performance indexes.
-- ====================================================================

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reopened_at TIMESTAMP WITH TIME ZONE,
    reopened_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reopen_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Performance Indexes on support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_student ON support_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_staff ON support_tickets(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_department ON support_tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- 2. Create ticket_messages table (supports public replies & internal notes)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE NOT NULL,
    attachment_file_key VARCHAR(255),
    attachment_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes on ticket_messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at ASC);

-- 3. Create ticket_audit_logs table (durable audit history)
CREATE TABLE IF NOT EXISTS ticket_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32),
    previous_assignee_id UUID,
    new_assignee_id UUID,
    reason TEXT,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes on ticket_audit_logs
CREATE INDEX IF NOT EXISTS idx_ticket_audit_ticket ON ticket_audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_performed_by ON ticket_audit_logs(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_ticket_audit_created_at ON ticket_audit_logs(created_at DESC);

-- 4. PostgreSQL Trigger to prevent mutation or deletion of audit logs (Immutability)
CREATE OR REPLACE FUNCTION prevent_ticket_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ticket_audit_logs rows are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_audit_logs_immutable ON ticket_audit_logs;
CREATE TRIGGER trg_ticket_audit_logs_immutable
BEFORE UPDATE OR DELETE ON ticket_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_ticket_audit_log_mutation();

-- 5. Ticket Number Sequence Generator
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;
