import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { clearRateLimitStore } from '../src/middlewares/rateLimiter.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { prisma } from '../src/lib/prisma.js';
import { toMinorUnits, fromMinorUnits, addMinorUnits, subtractMinorUnits } from '../src/utils/financialMath.js';
import { financeService } from '../src/services/finance.service.js';
import { config } from '../src/config/env.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 6: Fees & Finance Test Suite', () => {
  let student1Cookie: string[];
  let student2Cookie: string[];
  let facultyCookie: string[];
  let adminCookie: string[];

  let student1Id: string;
  let student2Id: string;
  let adminId: string;
  let student1TxId: string;
  let student1ReceiptNumber: string;

  beforeAll(async () => {
    clearRateLimitStore();

    // 1. Authenticate Student 1 (Harendra Pratap)
    const s1Res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(s1Res.status).toBe(200);
    student1Cookie = getCookies(s1Res);
    student1Id = s1Res.body.data.user.id;

    // 2. Authenticate Student 2 (Aaditya Sharma)
    const s2Res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'aaditya.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(s2Res.status).toBe(200);
    student2Cookie = getCookies(s2Res);
    student2Id = s2Res.body.data.user.id;

    // 3. Authenticate Faculty (Dr. Rajesh Sharma)
    const fRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(fRes.status).toBe(200);
    facultyCookie = getCookies(fRes);

    // 4. Authenticate Registrar Admin (admin.dev@dgu.ac.in)
    const admRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'admin.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });
    expect(admRes.status).toBe(200);
    adminCookie = getCookies(admRes);
    adminId = admRes.body.data.user.id;
  });

  beforeEach(() => {
    sessionRepository.clearMemoryStore();
    clearRateLimitStore();
  });

  describe('1. Financial Math & Zero Floating-Point Arithmetic', () => {
    it('should accurately convert INR strings/numbers to minor units (paise) as BigInt', () => {
      expect(toMinorUnits(100)).toBe(10000n);
      expect(toMinorUnits(100.5)).toBe(10050n);
      expect(toMinorUnits('1234.56')).toBe(123456n);
      expect(toMinorUnits('0.01')).toBe(1n);
      expect(toMinorUnits(0)).toBe(0n);
    });

    it('should accurately convert BigInt paise back to decimal formatted string', () => {
      expect(fromMinorUnits(10000n)).toBe('100.00');
      expect(fromMinorUnits(10050n)).toBe('100.50');
      expect(fromMinorUnits(123456n)).toBe('1234.56');
      expect(fromMinorUnits(1n)).toBe('0.01');
      expect(fromMinorUnits(0n)).toBe('0.00');
    });

    it('should perform exact BigInt additions and subtractions without IEEE-754 precision loss', () => {
      // Classic 0.1 + 0.2 floating point anomaly
      const a = toMinorUnits('0.10');
      const b = toMinorUnits('0.20');
      const sum = addMinorUnits(a, b);
      expect(sum).toBe(30n);
      expect(fromMinorUnits(sum)).toBe('0.30');

      const sub = subtractMinorUnits(sum, toMinorUnits('0.15'));
      expect(sub).toBe(15n);
      expect(fromMinorUnits(sub)).toBe('0.15');
    });
  });

  describe('2. Role-Based Access Control & Isolation', () => {
    it('should reject unauthenticated requests to student ledger with 401', async () => {
      const res = await request(app).get('/api/finance/student/ledger');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject faculty access to student finance ledger with 403', async () => {
      const res = await request(app)
        .get('/api/finance/student/ledger')
        .set('Cookie', facultyCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject faculty access to finance administration endpoints with 403', async () => {
      const res = await request(app)
        .get('/api/finance/admin/invoices')
        .set('Cookie', facultyCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject student access to finance administration endpoints with 403', async () => {
      const res = await request(app)
        .get('/api/finance/admin/invoices')
        .set('Cookie', student1Cookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Invoice Creation, Validation, and Itemization', () => {
    it('should reject invoice creation without line items with 400', async () => {
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Odd Semester 2026-27',
          category: 'Tuition Fee',
          dueDate: '2026-11-30',
          items: [],
        });
      expect(res.status).toBe(422);
      expect(JSON.stringify(res.body)).toContain('At least one line item is required');
    });

    it('should reject invoice creation when concession > 0 but reason is missing with 422', async () => {
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Odd Semester 2026-27',
          category: 'Tuition Fee',
          dueDate: '2026-11-30',
          items: [{ description: 'Tuition', amount: 50000 }],
          concessionAmount: 10000,
          concessionReason: '',
        });
      expect(res.status).toBe(422);
      expect(JSON.stringify(res.body)).toContain('Concession reason is required');
    });

    it('should allow REGISTRAR_ADMIN to create an itemized invoice for Student 1 with concession', async () => {
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Autumn 2026-27',
          academicYear: '2026-27',
          semester: 5,
          category: 'Tuition & Laboratory Fee',
          description: 'Regular semester academic tuition with merit scholarship',
          dueDate: '2026-11-15',
          items: [
            { description: 'Tuition Fee Component', amount: 65000 },
            { description: 'Computer Lab & AI Cluster Access', amount: 15000 },
            { description: 'Library & Academic E-Resources', amount: 5000 },
          ],
          concessionAmount: 10000,
          concessionReason: 'Merit Academic Scholarship (Dean Approval #DBS/2026/089)',
          status: 'ISSUED',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      const inv = res.body.data;
      expect(inv.invoiceNumber).toMatch(/^DBS\/\d{4}\/FEE\/[A-F0-9]{6}$/);
      expect(inv.subtotalAmount).toBe(85000);
      expect(inv.concessionAmount).toBe(10000);
      expect(inv.totalAmount).toBe(75000);
      expect(inv.paidAmount).toBe(0);
      expect(inv.outstandingBalance).toBe(75000);
      expect(inv.items.length).toBe(3);
      expect(inv.status).toBe('ISSUED');
    });
  });

  describe('4. Cross-Student Financial Record Isolation', () => {
    let student1InvoiceId: string;

    beforeAll(async () => {
      // Create a private invoice for Student 1
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Isolation Test Term',
          category: 'Private Student 1 Fee',
          dueDate: '2026-12-01',
          items: [{ description: 'Private Component', amount: 25000 }],
          status: 'ISSUED',
        });
      expect(res.status).toBe(201);
      student1InvoiceId = res.body.data.id;
    });

    it('should allow Student 1 to view their own invoice details', async () => {
      const res = await request(app)
        .get(`/api/finance/student/invoices/${student1InvoiceId}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(student1InvoiceId);
      expect(res.body.data.studentId).toBe(student1Id);
    });

    it('should strictly reject Student 2 accessing Student 1 invoice with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/finance/student/invoices/${student1InvoiceId}`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('financial records belonging to another student');
    });

    it('should never expose Student 1 invoice in Student 2 invoices list', async () => {
      const res = await request(app)
        .get('/api/finance/student/invoices')
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(200);
      const invoices = res.body.data;
      const found = invoices.find((inv: any) => inv.id === student1InvoiceId);
      expect(found).toBeUndefined();
    });
  });

  describe('5. Concession Adjustments and Cancellation Rules', () => {
    let testInvoiceId: string;

    beforeEach(async () => {
      // Create a fresh invoice for adjustment/cancellation tests
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Adjustment Test Term',
          category: 'Sports & Cultural Fee',
          dueDate: '2026-11-20',
          items: [{ description: 'Sports Complex Membership', amount: 20000 }],
          status: 'ISSUED',
        });
      expect(res.status).toBe(201);
      testInvoiceId = res.body.data.id;
    });

    it('should allow REGISTRAR_ADMIN to apply a concession and recalculate balance', async () => {
      const res = await request(app)
        .patch(`/api/finance/admin/invoices/${testInvoiceId}/adjust`)
        .set('Cookie', adminCookie)
        .send({
          concessionAmount: 5000,
          concessionReason: 'National Sports Player 25% Fee Waiver',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subtotalAmount).toBe(20000);
      expect(res.body.data.concessionAmount).toBe(5000);
      expect(res.body.data.totalAmount).toBe(15000);
      expect(res.body.data.outstandingBalance).toBe(15000);
    });

    it('should reject concession amount exceeding invoice subtotal with 400', async () => {
      const res = await request(app)
        .patch(`/api/finance/admin/invoices/${testInvoiceId}/adjust`)
        .set('Cookie', adminCookie)
        .send({
          concessionAmount: 25000,
          concessionReason: 'Excessive concession attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message.toLowerCase()).toContain('cannot exceed subtotal');
    });

    it('should allow cancelling an unpaid invoice', async () => {
      const res = await request(app)
        .post(`/api/finance/admin/invoices/${testInvoiceId}/cancel`)
        .set('Cookie', adminCookie)
        .send({
          cancellationReason: 'Student withdrew from optional sports activity',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.outstandingBalance).toBe(0);
    });

    it('should block cancelling an invoice that has confirmed payments', async () => {
      // First, reconcile a payment on testInvoiceId
      const pRes = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId: testInvoiceId,
          amount: 5000,
          paymentMode: 'CHALLAN',
          transactionRef: `CHALLAN-TEST-${Date.now()}`,
          notes: 'Test advance deposit',
        });
      expect(pRes.status).toBe(200);

      // Now attempt to cancel the invoice
      const cRes = await request(app)
        .post(`/api/finance/admin/invoices/${testInvoiceId}/cancel`)
        .set('Cookie', adminCookie)
        .send({
          cancellationReason: 'Illegal cancellation attempt after payment',
        });

      expect([400, 409]).toContain(cRes.status);
      expect(cRes.body.error.message).toContain('Cannot cancel an invoice with confirmed payments');
    });
  });

  describe('6. Offline Payment Reconciliation & Partial/Full Payments', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Reconciliation Term',
          category: 'Examination & Evaluation Fee',
          dueDate: '2026-10-31',
          items: [{ description: 'End-Sem Exam Fee', amount: 10000 }],
          status: 'ISSUED',
        });
      expect(res.status).toBe(201);
      invoiceId = res.body.data.id;
    });

    it('should transition invoice to PARTIALLY_PAID on partial reconciliation', async () => {
      const res = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 4000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: `UTR-PARTIAL-${Date.now()}`,
          notes: 'Installment 1 via NEFT',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.status).toBe('PARTIALLY_PAID');
      expect(res.body.data.invoice.paidAmount).toBe(4000);
      expect(res.body.data.invoice.outstandingBalance).toBe(6000);
      expect(res.body.data.transaction.status).toBe('SUCCESS');
      expect(res.body.data.transaction.receiptNumber).toMatch(/^REC-/);
    });

    it('should transition invoice to PAID when total payment reaches full balance', async () => {
      // Payment 1: 4000
      await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 4000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: `UTR-FULL-1-${Date.now()}`,
        });

      // Payment 2: 6000
      const res = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 6000,
          paymentMode: 'POS_COUNTER',
          transactionRef: `POS-FULL-2-${Date.now()}`,
          notes: 'Remaining balance at campus counter',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.status).toBe('PAID');
      expect(res.body.data.invoice.paidAmount).toBe(10000);
      expect(res.body.data.invoice.outstandingBalance).toBe(0);
    });

    it('should reject overpayment exceeding remaining invoice balance with 400', async () => {
      const res = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 15000, // exceeds 10000
          paymentMode: 'DEMAND_DRAFT',
          transactionRef: `DD-OVER-${Date.now()}`,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('exceeds outstanding balance');
    });

    it('should reject duplicate transaction reference with 409 (idempotency protection)', async () => {
      const ref = `UTR-IDEMPOTENT-${Date.now()}`;

      // First reconciliation
      const res1 = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 2000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: ref,
        });
      expect(res1.status).toBe(200);

      // Duplicate reconciliation with identical reference
      const res2 = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 2000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: ref,
        });
      expect([400, 409]).toContain(res2.status);
      expect(res2.body.error.message).toContain('already been processed');
    });
  });

  describe('7. Payment Processing Foundations (Gateway Unconfigured)', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Gateway Test Term',
          category: 'Online Payment Test',
          dueDate: '2026-11-30',
          items: [{ description: 'Test Line Item', amount: 15000 }],
          status: 'ISSUED',
        });
      invoiceId = res.body.data.id;
    });

    it('should record payment attempt with status PENDING and isConfigured=false', async () => {
      const res = await request(app)
        .post('/api/finance/student/pay')
        .set('Cookie', student1Cookie)
        .send({
          invoiceId,
          amount: 15000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isConfigured).toBe(false);
      expect(['PENDING', 'GATEWAY_UNCONFIGURED']).toContain(res.body.data.status);
      expect(res.body.data.gatewayProvider).toBe('UNCONFIGURED');
      expect(res.body.data.transactionRef).toMatch(/^INIT_/);
      expect(res.body.data.message).toContain('not configured in this environment');
      expect(res.body.data.reconciliationInstructions).toContain('Bank Transfer / NEFT / RTGS');

      // Crucial: invoice MUST NOT be marked paid
      const invCheck = await request(app)
        .get(`/api/finance/student/invoices/${invoiceId}`)
        .set('Cookie', student1Cookie);
      expect(invCheck.body.data.status).toBe('ISSUED');
      expect(invCheck.body.data.paidAmount).toBe(0);
    });

    it('should reject payment attempt on invoice belonging to another student with 403', async () => {
      const res = await request(app)
        .post('/api/finance/student/pay')
        .set('Cookie', student2Cookie) // Student 2 trying to pay Student 1's invoice
        .send({
          invoiceId,
          amount: 15000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('belonging to another student');
    });
  });

  describe('8. Digitally Signed Receipts & Receipt Isolation', () => {
    beforeAll(async () => {
      // Create invoice and fully reconcile for Student 1
      const invRes = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Receipt Term',
          category: 'Tuition Fee',
          dueDate: '2026-11-30',
          items: [{ description: 'Full Tuition', amount: 50000 }],
          status: 'ISSUED',
        });

      const recRes = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId: invRes.body.data.id,
          amount: 50000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: `UTR-RECEIPT-${Date.now()}`,
          notes: 'Full payment cleared',
        });

      student1TxId = recRes.body.data.transaction.id;
      student1ReceiptNumber = recRes.body.data.transaction.receiptNumber;
    });

    it('should allow Student 1 to retrieve verified digital receipt with cryptographic HMAC signature', async () => {
      const res = await request(app)
        .get(`/api/finance/student/receipts/${student1TxId}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      const receipt = res.body.data;
      expect(receipt.receiptNumber).toBe(student1ReceiptNumber);
      expect(receipt.amountPaid).toBe(50000);
      expect(receipt.remainingInvoiceBalance).toBe(0);
      expect(receipt.verificationHash).toBeDefined();
      expect(receipt.verificationHash).toMatch(/^v1:[A-F0-9]{64}$/); // Dedicated HMAC with v1 key version prefix
      expect(receipt.keyVersion).toBe('v1');
      expect(receipt.verificationSource).toBe('MANUAL_STAFF_ENTRY');
      expect(receipt.verificationClaim).toContain('Staff-Recorded Offline Reference');
      expect(receipt.issuedBy).toContain('DBS Global University');
    });

    it('should allow retrieval by receiptNumber as well', async () => {
      const res = await request(app)
        .get(`/api/finance/student/receipts/${student1ReceiptNumber}`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toBe(student1ReceiptNumber);
    });

    it('should strictly deny Student 2 access to Student 1 receipt with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/finance/student/receipts/${student1ReceiptNumber}`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('receipts belonging to another student');
    });

    it('should allow REGISTRAR_ADMIN to view any student receipt for institutional verification', async () => {
      const res = await request(app)
        .get(`/api/finance/student/receipts/${student1ReceiptNumber}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.receiptNumber).toBe(student1ReceiptNumber);
    });
  });

  describe('9. Complete Student Ledger & No-Dues Clearance Status', () => {
    it('should return complete ledger with accurate totals and noDuesStatus', async () => {
      const res = await request(app)
        .get('/api/finance/student/ledger')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      const ledger = res.body.data;
      expect(ledger.totalInvoiced).toBeGreaterThan(0);
      expect(ledger.totalPaid).toBeGreaterThan(0);
      expect(typeof ledger.totalOutstanding).toBe('number');
      expect(['CLEARED', 'PENDING_DUES']).toContain(ledger.noDuesStatus);
      expect(Array.isArray(ledger.invoices)).toBe(true);
      expect(Array.isArray(ledger.recentTransactions)).toBe(true);
    });
  });

  describe('10. Financial Audit Trail', () => {
    it('should record immutable audit logs for invoice creation, adjustments, and reconciliation', async () => {
      const res = await request(app)
        .get('/api/finance/admin/audit-logs?limit=50')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const logs = res.body.data;
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      // Verify log schema
      const first = logs[0];
      expect(first.id).toBeDefined();
      expect(first.action).toBeDefined();
      expect(first.performedBy).toBeDefined();
      expect(first.performedBy.id).toBe(adminId);
      expect(first.createdAt).toBeDefined();
    });
  });

  describe('11. Concurrency & Row-Locking Safety (PostgreSQL Integration)', () => {
    it('should prevent race condition overpayment when two concurrent reconciliations compete for same balance', async () => {
      // 1. Create invoice with total ₹10,000
      const invRes = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Concurrency Test Term',
          category: 'Concurrent Tuition Fee',
          dueDate: '2026-11-30',
          items: [{ description: 'Concurrency Test Component', amount: 10000 }],
          status: 'ISSUED',
        });
      expect(invRes.status).toBe(201);
      const invoiceId = invRes.body.data.id;

      // 2. Fire two concurrent reconciliation requests of ₹6,000 each (sum ₹12,000 > ₹10,000)
      const req1 = request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 6000,
          paymentMode: 'BANK_TRANSFER',
          transactionRef: `CONCUR-UTR-1-${Date.now()}`,
          notes: 'Concurrent payment attempt 1',
        });

      const req2 = request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 6000,
          paymentMode: 'CHALLAN',
          transactionRef: `CONCUR-UTR-2-${Date.now()}`,
          notes: 'Concurrent payment attempt 2',
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      // Exactly ONE request must succeed (200), and the second must be rejected (400) due to insufficient balance
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const failedRes = res1.status === 400 ? res1 : res2;
      expect(failedRes.body.error.message).toContain('exceeds outstanding balance');

      // Verify authoritative database state: paidAmount is exactly 6000, balance is 4000
      const dbInvoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId } });
      expect(Number(dbInvoice?.paidAmount)).toBe(6000);
      expect(Number(dbInvoice?.totalAmount)).toBe(10000);
      expect(dbInvoice?.status).toBe('PARTIALLY_PAID');
    });
  });

  describe('12. Production Database Failure Behavior (Fail Closed, No Fallback to Mock Data)', () => {
    it('should fail closed with 503 and never return mock data when database encounters an error', async () => {
      // Temporarily mock prisma.feeInvoice.findMany to simulate unexpected DB failure
      const findManySpy = vi.spyOn(prisma.feeInvoice, 'findMany').mockRejectedValueOnce(
        new Error('PostgreSQL connection dropped')
      );

      const res = await request(app)
        .get('/api/finance/student/invoices')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      // Ensure no mock invoices or sensitive credentials leaked
      expect(res.body.data).toBeUndefined();

      findManySpy.mockRestore();
    });
  });

  describe('13. Dedicated Receipt Signing Secret, Key Versioning & Historical Rotation', () => {
    it('should use dedicated RECEIPT_SIGNING_SECRET instead of reusing JWT_SECRET', () => {
      expect(config.RECEIPT_SIGNING_SECRET).toBeDefined();
      expect(config.RECEIPT_SIGNING_SECRET.length).toBeGreaterThanOrEqual(16);
      expect(config.RECEIPT_SIGNING_SECRET).not.toBe(config.JWT_SECRET);
      expect(config.RECEIPT_SIGNING_KEY_VERSION).toBe('v1');
    });

    it('should format receipt signature with key version prefix and verify correctly', () => {
      const receiptNo = 'REC-2026-TEST001';
      const invoiceNo = 'DBS/2026/FEE/TEST001';
      const amount = '15000.00';
      const paidAt = new Date().toISOString();
      const studentId = student1Id;

      const { signature, keyVersion } = financeService.generateReceiptSignature(
        receiptNo,
        invoiceNo,
        amount,
        paidAt,
        studentId
      );

      expect(keyVersion).toBe('v1');
      expect(signature).toMatch(/^v1:[A-F0-9]{64}$/);

      // Positive verification
      const verifyRes = financeService.verifyReceiptSignature(
        receiptNo,
        invoiceNo,
        amount,
        paidAt,
        studentId,
        signature
      );
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.keyVersion).toBe('v1');

      // Negative verification (tampered amount)
      const tamperedRes = financeService.verifyReceiptSignature(
        receiptNo,
        invoiceNo,
        '10000.00',
        paidAt,
        studentId,
        signature
      );
      expect(tamperedRes.valid).toBe(false);
    });

    it('should verify historical receipts signed with prior key version (key rotation)', () => {
      // Historical key v0 simulation
      const historicalSecret = 'legacy_historical_receipt_signing_key_v0_secret';
      const receiptNo = 'REC-2025-HIST001';
      const invoiceNo = 'DBS/2025/FEE/HIST001';
      const amount = '25000.00';
      const paidAt = '2025-08-15T10:00:00.000Z';
      const studentId = student1Id;

      // Generate signature as if generated during v0 era
      const payload = `${receiptNo}|${invoiceNo}|${amount}|${paidAt}|${studentId}`;
      const v0Digest = crypto.createHmac('sha256', historicalSecret).update(payload).digest('hex').toUpperCase();
      const v0Signature = `v0:${v0Digest}`;

      // Temporarily inject historical key into config
      const origHistorical = config.RECEIPT_HISTORICAL_SIGNING_KEYS;
      (config as any).RECEIPT_HISTORICAL_SIGNING_KEYS = JSON.stringify({
        v0: historicalSecret,
      });

      try {
        const verifyRes = financeService.verifyReceiptSignature(
          receiptNo,
          invoiceNo,
          amount,
          paidAt,
          studentId,
          v0Signature
        );
        expect(verifyRes.valid).toBe(true);
        expect(verifyRes.keyVersion).toBe('v0');
      } finally {
        (config as any).RECEIPT_HISTORICAL_SIGNING_KEYS = origHistorical;
      }
    });

    it('should reject verification if key version is missing from both active and historical configs', () => {
      const v99Signature = 'v99:0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
      const verifyRes = financeService.verifyReceiptSignature(
        'REC-1',
        'INV-1',
        '100.00',
        new Date().toISOString(),
        student1Id,
        v99Signature
      );
      expect(verifyRes.valid).toBe(false);
      expect(verifyRes.error).toContain('Key version "v99" not configured');
    });

    it('should expose verification endpoint and verify student receipt authenticity', async () => {
      const res = await request(app)
        .get(`/api/finance/receipts/${student1ReceiptNumber}/verify`)
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.authentic).toBe(true);
      expect(res.body.data.receiptNumber).toBe(student1ReceiptNumber);
      expect(res.body.data.keyVersion).toBe('v1');
      expect(res.body.data.verificationSource).toBe('MANUAL_STAFF_ENTRY');
      expect(res.body.data.verificationClaim).toContain('Staff-Recorded');
      // Ensure secret is never exposed in response
      expect(JSON.stringify(res.body)).not.toContain(config.RECEIPT_SIGNING_SECRET);
      expect(JSON.stringify(res.body)).not.toContain(config.JWT_SECRET);
    });

    it('should forbid Student 2 from verifying Student 1 receipt (cross-account isolation)', async () => {
      const res = await request(app)
        .get(`/api/finance/receipts/${student1ReceiptNumber}/verify`)
        .set('Cookie', student2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('not authorized to verify receipts belonging to another student');
    });
  });

  describe('14. Append-Only Audit Trail Hardening (PostgreSQL Trigger Immutability)', () => {
    it('should enforce append-only ledger on fee_audit_logs by rejecting UPDATE with PostgreSQL trigger exception', async () => {
      // Find an existing audit log
      const log = await prisma.feeAuditLog.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      expect(log).toBeDefined();

      // Attempt direct SQL update to simulate tampering
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE fee_audit_logs SET action = 'TAMPERED_ACTION' WHERE id = '${log!.id}'::uuid`
        )
      ).rejects.toThrow(/fee_audit_logs is an immutable append-only ledger/);
    });

    it('should enforce append-only ledger on fee_audit_logs by rejecting DELETE with PostgreSQL trigger exception', async () => {
      const log = await prisma.feeAuditLog.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      expect(log).toBeDefined();

      // Attempt direct SQL delete to simulate deletion of audit history
      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM fee_audit_logs WHERE id = '${log!.id}'::uuid`
        )
      ).rejects.toThrow(/fee_audit_logs is an immutable append-only ledger/);
    });
  });

  describe('15. Financial Invariants & Subtotal Reconciliation Trigger', () => {
    it('should reject invoice insertion where subtotal does not reconcile to sum of line items via deferred trigger', async () => {
      // In a raw SQL transaction, attempt to insert invoice with subtotal 50000 but items summing to 40000
      await expect(
        prisma.$transaction(async (tx) => {
          const invId = crypto.randomUUID();
          await tx.$executeRawUnsafe(`
            INSERT INTO fee_invoices (
              id, student_id, invoice_number, academic_term, academic_year, semester,
              category, subtotal_amount, concession_amount, total_amount, paid_amount,
              due_date, issue_date, status
            ) VALUES (
              '${invId}'::uuid, '${student1Id}'::uuid, 'TEST-INV-TRIGGER-${Date.now()}',
              'Odd Semester 2026-27', '2026-27', 1, 'Tuition Fee',
              50000.00, 0.00, 50000.00, 0.00,
              CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE, 'ISSUED'
            )
          `);
          // Insert line item with only 40000 (mismatch of 10000)
          await tx.$executeRawUnsafe(`
            INSERT INTO fee_invoice_items (
              id, invoice_id, description, amount
            ) VALUES (
              '${crypto.randomUUID()}'::uuid, '${invId}'::uuid, 'Tuition Base', 40000.00
            )
          `);
        })
      ).rejects.toThrow(/Financial Invariant Violation: Invoice subtotal.*does not match sum of line items/);
    });
  });

  describe('16. Manual Staff Entry Attribution & Reconciliation Invariants', () => {
    it('should accurately attribute staff offline reconciliation as MANUAL_STAFF_ENTRY and not bank-verified', async () => {
      // Create a test invoice
      const invRes = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Odd Semester 2026-27',
          category: 'Hostel Fee',
          dueDate: new Date(Date.now() + 864000000).toISOString().split('T')[0],
          items: [{ description: 'Hostel Rent', amount: 15000 }],
        });
      expect(invRes.status).toBe(201);
      const invoiceId = invRes.body.data.id;

      // Staff reconciles payment with UTR
      const utrRef = `STAFF-UTR-${Date.now()}`;
      const recRes = await request(app)
        .post('/api/finance/admin/reconcile')
        .set('Cookie', adminCookie)
        .send({
          invoiceId,
          amount: 15000,
          paymentMode: 'CHALLAN',
          transactionRef: utrRef,
          notes: 'Challan verified by Accounts counter staff',
        });

      expect(recRes.status).toBe(200);
      expect(recRes.body.data.transaction.verificationSource).toBe('MANUAL_STAFF_ENTRY');

      // Verify audit log has correct actor and attribution
      const auditRes = await request(app)
        .get(`/api/finance/admin/audit-logs?invoiceId=${invoiceId}`)
        .set('Cookie', adminCookie);

      expect(auditRes.status).toBe(200);
      const reconLog = auditRes.body.data.find((l: any) => l.action === 'PAYMENT_RECONCILED');
      expect(reconLog).toBeDefined();
      expect(reconLog.performedBy.id).toBe(adminId);
      expect(reconLog.details.verificationSource).toBe('MANUAL_STAFF_ENTRY');
      expect(reconLog.details.verificationClaim).toContain('pending independent bank statement audit');
      expect(reconLog.details.transactionRef).toBe(utrRef);
    });

    it('should reject unconfirmed transactions from receiving or verifying receipts', async () => {
      // Create a pending payment attempt
      const invRes = await request(app)
        .post('/api/finance/admin/invoices')
        .set('Cookie', adminCookie)
        .send({
          studentId: student1Id,
          academicTerm: 'Odd Semester 2026-27',
          category: 'Library Fee',
          dueDate: new Date(Date.now() + 864000000).toISOString().split('T')[0],
          items: [{ description: 'Library Fee', amount: 2000 }],
        });
      const invoiceId = invRes.body.data.id;

      const payAttempt = await request(app)
        .post('/api/finance/student/pay')
        .set('Cookie', student1Cookie)
        .send({
          invoiceId,
          amount: 2000,
        });
      expect(payAttempt.status).toBe(200);
      const pendingTxRef = payAttempt.body.data.transactionRef;

      // Find pending transaction ID
      const pendingTx = await prisma.feeTransaction.findUnique({
        where: { transactionRef: pendingTxRef },
      });
      expect(pendingTx).toBeDefined();
      expect(pendingTx?.status).toBe('PENDING');

      // Attempt to get receipt for pending transaction
      const receiptRes = await request(app)
        .get(`/api/finance/student/receipts/${pendingTx!.id}`)
        .set('Cookie', student1Cookie);
      expect(receiptRes.status).toBe(400);
      expect(receiptRes.body.error.message).toContain('Receipt cannot be generated for an unconfirmed or pending transaction');

      // Attempt to verify receipt for pending transaction
      const verifyRes = await request(app)
        .get(`/api/finance/receipts/${pendingTx!.id}/verify`)
        .set('Cookie', student1Cookie);
      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error.message).toContain('Receipt verification is only valid for confirmed transactions');
    });
  });
});

