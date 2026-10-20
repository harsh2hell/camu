-- ============================================================================
-- CAMU-NEXT — PHASE 6.1: FINANCIAL INTEGRITY AND AUDIT HARDENING MIGRATION
-- ============================================================================

-- 1. Extend fee_transactions with verification level and key version
ALTER TABLE fee_transactions
  ADD COLUMN IF NOT EXISTS verification_source VARCHAR(64) DEFAULT 'MANUAL_STAFF_ENTRY',
  ADD COLUMN IF NOT EXISTS receipt_key_version VARCHAR(32) DEFAULT 'v1';

COMMENT ON COLUMN fee_transactions.verification_source IS 
  'Distinguishes manual staff-recorded entries from provider-verified or bank-reconciled transactions (e.g. MANUAL_STAFF_ENTRY, GATEWAY_VERIFIED, BANK_STATEMENT_AUDITED)';

COMMENT ON COLUMN fee_transactions.receipt_key_version IS 
  'Key version identifier used to cryptographically sign the official digital receipt';

-- 2. Enforce Immutable Append-Only Ledger on fee_audit_logs
CREATE OR REPLACE FUNCTION trg_prevent_fee_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: fee_audit_logs is an immutable append-only ledger and cannot be modified or deleted (Operation: %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fee_audit_logs_immutable ON fee_audit_logs;
CREATE TRIGGER trg_fee_audit_logs_immutable
BEFORE UPDATE OR DELETE ON fee_audit_logs
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_fee_audit_logs_mutation();

-- 3. Enforce Subtotal Reconciliation Invariant via Deferred Constraint Triggers
-- Ensures that at transaction commit, the sum of line items matches invoice subtotal exactly.
CREATE OR REPLACE FUNCTION fn_verify_invoice_subtotal_matches_items()
RETURNS TRIGGER AS $$
DECLARE
  v_items_sum NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0.00) INTO v_items_sum
  FROM fee_invoice_items
  WHERE invoice_id = NEW.id;

  IF v_items_sum <> NEW.subtotal_amount THEN
    RAISE EXCEPTION 'Financial Invariant Violation: Invoice subtotal (₹%) does not match sum of line items (₹%) for invoice %',
      NEW.subtotal_amount, v_items_sum, NEW.invoice_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_invoice_subtotal ON fee_invoices;
CREATE CONSTRAINT TRIGGER trg_verify_invoice_subtotal
AFTER INSERT OR UPDATE OF subtotal_amount ON fee_invoices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_verify_invoice_subtotal_matches_items();

CREATE OR REPLACE FUNCTION fn_verify_invoice_items_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_inv_id UUID;
  v_subtotal NUMERIC(12,2);
  v_items_sum NUMERIC(12,2);
BEGIN
  v_inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT subtotal_amount INTO v_subtotal FROM fee_invoices WHERE id = v_inv_id;
  
  IF v_subtotal IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0.00) INTO v_items_sum 
    FROM fee_invoice_items 
    WHERE invoice_id = v_inv_id;

    IF v_items_sum <> v_subtotal THEN
      RAISE EXCEPTION 'Financial Invariant Violation: Line items sum (₹%) does not reconcile with invoice subtotal (₹%)', 
        v_items_sum, v_subtotal;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_items_mutation ON fee_invoice_items;
CREATE CONSTRAINT TRIGGER trg_verify_items_mutation
AFTER INSERT OR UPDATE OR DELETE ON fee_invoice_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_verify_invoice_items_mutation();
