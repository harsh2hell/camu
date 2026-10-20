-- Phase 6: Fees & Finance Schema Extensions
-- Migration: 20261020_phase6_fees_finance.sql

-- 1. Extend fee_payment_status enum
ALTER TYPE fee_payment_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE fee_payment_status ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE fee_payment_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 2. Extend fee_invoices table
ALTER TABLE fee_invoices 
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32) DEFAULT '2026-27',
    ADD COLUMN IF NOT EXISTS semester INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS concession_reason TEXT,
    ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Extend fee_transactions table
ALTER TABLE fee_transactions
    ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(64) DEFAULT 'UNCONFIGURED',
    ADD COLUMN IF NOT EXISTS gateway_response TEXT,
    ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(128) UNIQUE,
    ADD COLUMN IF NOT EXISTS reconciled_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create fee_invoice_items table for itemized invoice breakdowns
CREATE TABLE IF NOT EXISTS fee_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_fee_item_amount CHECK (amount >= 0)
);

-- 5. Create fee_audit_logs table for immutable financial audit trails
CREATE TABLE IF NOT EXISTS fee_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES fee_invoices(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES fee_transactions(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add Financial Constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fee_invoice_total') THEN
        ALTER TABLE fee_invoices ADD CONSTRAINT chk_fee_invoice_total CHECK (total_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fee_invoice_paid') THEN
        ALTER TABLE fee_invoices ADD CONSTRAINT chk_fee_invoice_paid CHECK (paid_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fee_invoice_concession') THEN
        ALTER TABLE fee_invoices ADD CONSTRAINT chk_fee_invoice_concession CHECK (concession_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fee_tx_amount') THEN
        ALTER TABLE fee_transactions ADD CONSTRAINT chk_fee_tx_amount CHECK (amount > 0);
    END IF;
END $$;

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_id ON fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_due_date ON fee_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_invoice_id ON fee_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_student_id ON fee_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_status ON fee_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fee_invoice_items_invoice_id ON fee_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_invoice_id ON fee_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_action ON fee_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_fee_audit_logs_performed_by ON fee_audit_logs(performed_by_id);
