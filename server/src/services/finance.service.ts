import crypto from 'node:crypto';
import { financeRepository } from '../repositories/finance.repository.js';
import { config, getHistoricalReceiptKeys } from '../config/env.js';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../errors/AppError.js';
import { toMinorUnits, fromMinorUnits } from '../utils/financialMath.js';
import type {
  FeeInvoiceDTO,
  StudentFeeLedgerDTO,
  FeeTransactionDTO,
  PaymentReceiptDTO,
  ReceiptVerificationResultDTO,
  createInvoiceSchema,
  adjustInvoiceSchema,
  cancelInvoiceSchema,
  reconcilePaymentSchema,
} from '../types/finance.js';
import type { FeePaymentStatus, UserRole } from '@prisma/client';
import { z } from 'zod';

export class FinanceService {
  /**
   * Helper: Resolves signing secret for the given key version
   * Never logs signing keys or sensitive payload
   */
  private getSigningSecretForVersion(keyVersion: string): string | null {
    if (keyVersion === config.RECEIPT_SIGNING_KEY_VERSION) {
      return config.RECEIPT_SIGNING_SECRET;
    }
    const historicalKeys = getHistoricalReceiptKeys();
    if (historicalKeys[keyVersion]) {
      return historicalKeys[keyVersion];
    }
    return null;
  }

  /**
   * Generates cryptographic verification hash for university digital receipts
   * Uses dedicated RECEIPT_SIGNING_SECRET and embeds key version prefix (e.g. v1:<HMAC>)
   * Never logs signing secret or sensitive receipt content
   */
  generateReceiptSignature(
    receiptNumber: string,
    invoiceNumber: string,
    amountStr: string,
    paidAtStr: string,
    studentId: string,
    keyVersionHint?: string
  ): { signature: string; keyVersion: string } {
    const keyVersion = keyVersionHint || config.RECEIPT_SIGNING_KEY_VERSION || 'v1';
    const secret = this.getSigningSecretForVersion(keyVersion);
    if (!secret) {
      throw new Error(`Signing key unavailable for key version "${keyVersion}"`);
    }

    const payload = `${receiptNumber}|${invoiceNumber}|${amountStr}|${paidAtStr}|${studentId}`;
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex').toUpperCase();
    const signature = `${keyVersion}:${digest}`;
    return { signature, keyVersion };
  }

  /**
   * Verifies receipt signature using constant-time comparison against current or historical keys
   * Supports key version prefix (e.g. v1:<HEX>) or fallback to keyVersionHint
   */
  verifyReceiptSignature(
    receiptNumber: string,
    invoiceNumber: string,
    amountStr: string,
    paidAtStr: string,
    studentId: string,
    providedSignature: string,
    keyVersionHint: string = 'v1'
  ): { valid: boolean; keyVersion: string; error?: string } {
    let keyVersion = keyVersionHint;
    let digestToCompare = providedSignature;

    if (providedSignature.includes(':')) {
      const parts = providedSignature.split(':', 2);
      keyVersion = parts[0];
      digestToCompare = parts[1];
    }

    const secret = this.getSigningSecretForVersion(keyVersion);
    if (!secret) {
      return { valid: false, keyVersion, error: `Key version "${keyVersion}" not configured in active or historical keys.` };
    }

    const payload = `${receiptNumber}|${invoiceNumber}|${amountStr}|${paidAtStr}|${studentId}`;
    const expectedDigest = crypto.createHmac('sha256', secret).update(payload).digest('hex').toUpperCase();

    if (Buffer.byteLength(digestToCompare) !== Buffer.byteLength(expectedDigest)) {
      return { valid: false, keyVersion, error: 'Signature length mismatch.' };
    }

    const valid = crypto.timingSafeEqual(Buffer.from(digestToCompare), Buffer.from(expectedDigest));
    return { valid, keyVersion };
  }

  /**
   * Student: Get own fee ledger
   */
  async getStudentLedger(studentId: string): Promise<StudentFeeLedgerDTO> {
    return financeRepository.getStudentLedger(studentId);
  }

  /**
   * Student: List own invoices
   */
  async getStudentInvoices(
    studentId: string,
    filters?: { status?: FeePaymentStatus; academicYear?: string; semester?: number }
  ): Promise<FeeInvoiceDTO[]> {
    return financeRepository.getStudentInvoices(studentId, filters);
  }

  /**
   * Student: Get single invoice with strict resource-level authorization
   */
  async getStudentInvoiceDetails(invoiceId: string, studentId: string): Promise<FeeInvoiceDTO> {
    const invoice = await financeRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundError('Invoice not found.');
    }

    // Resource-level authorization: ensure invoice belongs to requesting student
    if (invoice.studentId !== studentId) {
      throw new ForbiddenError('You are not authorized to view financial records belonging to another student.');
    }

    const totalPaise = toMinorUnits(invoice.totalAmount);
    const paidPaise = toMinorUnits(invoice.paidAmount);
    const balancePaise = totalPaise > paidPaise ? totalPaise - paidPaise : 0n;

    return {
      id: invoice.id,
      studentId: invoice.studentId,
      studentName: invoice.student?.fullName,
      studentRollNumber: invoice.student?.studentProfile?.rollNumber,
      invoiceNumber: invoice.invoiceNumber,
      academicTerm: invoice.academicTerm,
      academicYear: invoice.academicYear,
      semester: invoice.semester,
      category: invoice.category,
      description: invoice.description,
      subtotalAmount: Number(fromMinorUnits(toMinorUnits(invoice.subtotalAmount))),
      concessionAmount: Number(fromMinorUnits(toMinorUnits(invoice.concessionAmount))),
      concessionReason: invoice.concessionReason,
      totalAmount: Number(fromMinorUnits(totalPaise)),
      paidAmount: Number(fromMinorUnits(paidPaise)),
      outstandingBalance: invoice.status === 'CANCELLED' ? 0 : Number(fromMinorUnits(balancePaise)),
      dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().split('T')[0] : String(invoice.dueDate),
      issueDate: invoice.issueDate instanceof Date ? invoice.issueDate.toISOString().split('T')[0] : String(invoice.issueDate),
      status: invoice.status as FeePaymentStatus,
      receiptUrl: invoice.receiptUrl,
      items: invoice.items.map((itm) => ({
        id: itm.id,
        description: itm.description,
        amount: Number(fromMinorUnits(toMinorUnits(itm.amount))),
      })),
      transactions: invoice.transactions.map((tx) => ({
        id: tx.id,
        invoiceId: tx.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        studentId: tx.studentId,
        transactionRef: tx.transactionRef,
        paymentMode: tx.paymentMode,
        amount: Number(fromMinorUnits(toMinorUnits(tx.amount))),
        status: tx.status,
        receiptNumber: tx.receiptNumber,
        notes: tx.notes,
        paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
        createdAt: tx.createdAt.toISOString(),
      })),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  /**
   * Student: List own payment transactions
   */
  async getStudentTransactions(studentId: string): Promise<FeeTransactionDTO[]> {
    return financeRepository.getStudentTransactions(studentId);
  }

  /**
   * Student: Download / View digital receipt for a confirmed transaction
   */
  async getStudentReceipt(
    receiptIdOrTransactionId: string,
    studentId: string,
    role: UserRole
  ): Promise<PaymentReceiptDTO> {
    const tx = await financeRepository.findTransactionByIdOrReceipt(receiptIdOrTransactionId);
    if (!tx) {
      throw new NotFoundError('Receipt or transaction record not found.');
    }

    // Resource-level authorization: ensure student owns this transaction or role is REGISTRAR_ADMIN
    if (role !== 'REGISTRAR_ADMIN' && tx.invoice.studentId !== studentId) {
      throw new ForbiddenError('You are not authorized to access receipts belonging to another student.');
    }

    if (tx.status !== 'SUCCESS') {
      throw new BadRequestError('Receipt cannot be generated for an unconfirmed or pending transaction.');
    }

    const receiptNumber = tx.receiptNumber || `REC-${tx.id.slice(0, 8).toUpperCase()}`;
    const amountStr = fromMinorUnits(toMinorUnits(tx.amount));
    const paidAtStr = (tx.paidAt || tx.createdAt).toISOString();
    const invoiceTotalPaise = toMinorUnits(tx.invoice.totalAmount);
    const invoicePaidPaise = toMinorUnits(tx.invoice.paidAmount);
    const remainingBalance =
      invoiceTotalPaise > invoicePaidPaise ? Number(fromMinorUnits(invoiceTotalPaise - invoicePaidPaise)) : 0;

    const keyVersion = tx.receiptKeyVersion || config.RECEIPT_SIGNING_KEY_VERSION || 'v1';
    const { signature } = this.generateReceiptSignature(
      receiptNumber,
      tx.invoice.invoiceNumber,
      amountStr,
      paidAtStr,
      tx.invoice.studentId,
      keyVersion
    );

    const verificationSource = tx.verificationSource || 'MANUAL_STAFF_ENTRY';
    const verificationClaim =
      verificationSource === 'GATEWAY_VERIFIED'
        ? 'Independently verified against payment gateway provider'
        : verificationSource === 'BANK_STATEMENT_AUDITED'
        ? 'Independently reconciled and verified against bank statement audit'
        : 'Staff-Recorded Offline Reference (Pending Bank Statement Audit)';

    return {
      receiptNumber,
      transactionRef: tx.transactionRef,
      invoiceNumber: tx.invoice.invoiceNumber,
      studentName: tx.invoice.student.fullName,
      studentRollNumber: tx.invoice.student.studentProfile?.rollNumber || 'N/A',
      studentRegistrationNo: tx.invoice.student.studentProfile?.registrationNo,
      programName: tx.invoice.student.studentProfile?.batch?.program?.name || 'Undergraduate Degree',
      academicTerm: tx.invoice.academicTerm,
      category: tx.invoice.category,
      paymentMode: tx.paymentMode,
      amountPaid: Number(amountStr),
      paidAt: paidAtStr,
      invoiceTotalAmount: Number(fromMinorUnits(invoiceTotalPaise)),
      remainingInvoiceBalance: remainingBalance,
      verificationHash: signature,
      keyVersion,
      verificationSource,
      verificationClaim,
      issuedBy: 'Accounts & Fee Office, DBS Global University',
    };
  }

  /**
   * Verify receipt authenticity and cryptographic signature
   * Ensures receipt corresponds only to a confirmed transaction
   * Cross-account isolation: Students cannot verify other students' receipts
   */
  async verifyReceiptAuthenticity(
    receiptIdOrTransactionId: string,
    studentId: string,
    role: UserRole
  ): Promise<ReceiptVerificationResultDTO> {
    const tx = await financeRepository.findTransactionByIdOrReceipt(receiptIdOrTransactionId);
    if (!tx) {
      throw new NotFoundError('Receipt or transaction record not found.');
    }

    // Strict cross-account authorization check
    if (role !== 'REGISTRAR_ADMIN' && tx.invoice.studentId !== studentId) {
      throw new ForbiddenError('You are not authorized to verify receipts belonging to another student.');
    }

    // Ensure receipts correspond only to confirmed transactions
    if (tx.status !== 'SUCCESS') {
      throw new BadRequestError('Receipt verification is only valid for confirmed transactions.');
    }

    const receiptNumber = tx.receiptNumber || `REC-${tx.id.slice(0, 8).toUpperCase()}`;
    const amountStr = fromMinorUnits(toMinorUnits(tx.amount));
    const paidAtStr = (tx.paidAt || tx.createdAt).toISOString();
    const keyVersion = tx.receiptKeyVersion || config.RECEIPT_SIGNING_KEY_VERSION || 'v1';

    const { signature } = this.generateReceiptSignature(
      receiptNumber,
      tx.invoice.invoiceNumber,
      amountStr,
      paidAtStr,
      tx.invoice.studentId,
      keyVersion
    );

    const verificationResult = this.verifyReceiptSignature(
      receiptNumber,
      tx.invoice.invoiceNumber,
      amountStr,
      paidAtStr,
      tx.invoice.studentId,
      signature,
      keyVersion
    );

    const verificationSource = tx.verificationSource || 'MANUAL_STAFF_ENTRY';
    const verificationClaim =
      verificationSource === 'GATEWAY_VERIFIED'
        ? 'Independently verified against payment gateway provider'
        : verificationSource === 'BANK_STATEMENT_AUDITED'
        ? 'Independently reconciled and verified against bank statement audit'
        : 'Staff-Recorded Offline Reference (Pending Bank Statement Audit)';

    return {
      receiptNumber,
      transactionRef: tx.transactionRef,
      invoiceNumber: tx.invoice.invoiceNumber,
      status: 'CONFIRMED',
      authentic: verificationResult.valid,
      keyVersion: verificationResult.keyVersion,
      verificationSource,
      verificationClaim,
      amountPaid: Number(amountStr),
      paidAt: paidAtStr,
      studentName: tx.invoice.student?.fullName,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Student: Initiate payment attempt (strict: gateway unconfigured)
   */
  async initiateStudentPayment(
    invoiceId: string,
    studentId: string,
    amount: number
  ) {
    return financeRepository.initiatePaymentAttempt(invoiceId, studentId, amount);
  }

  /**
   * Admin: Create and issue invoice
   */
  async createInvoice(
    payload: z.infer<typeof createInvoiceSchema>,
    adminUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    return financeRepository.createInvoice(
      {
        studentId: payload.studentId,
        academicTerm: payload.academicTerm,
        academicYear: payload.academicYear,
        semester: payload.semester,
        category: payload.category,
        description: payload.description,
        dueDate: new Date(payload.dueDate),
        issueDate: payload.issueDate ? new Date(payload.issueDate) : undefined,
        items: payload.items,
        concessionAmount: payload.concessionAmount,
        concessionReason: payload.concessionReason,
        status: payload.status,
      },
      adminUserId,
      ipAddress
    );
  }

  /**
   * Admin: Concession / financial adjustment
   */
  async adjustInvoice(
    invoiceId: string,
    payload: z.infer<typeof adjustInvoiceSchema>,
    adminUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    return financeRepository.adjustInvoice(
      invoiceId,
      payload.concessionAmount,
      payload.concessionReason,
      adminUserId,
      ipAddress
    );
  }

  /**
   * Admin: Cancel invoice
   */
  async cancelInvoice(
    invoiceId: string,
    payload: z.infer<typeof cancelInvoiceSchema>,
    adminUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    return financeRepository.cancelInvoice(
      invoiceId,
      payload.cancellationReason,
      adminUserId,
      ipAddress
    );
  }

  /**
   * Admin: Reconcile offline/bank transfer payment
   */
  async reconcilePayment(
    payload: z.infer<typeof reconcilePaymentSchema>,
    adminUserId: string,
    ipAddress?: string
  ) {
    return financeRepository.reconcilePayment(
      {
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        transactionRef: payload.transactionRef,
        paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
        notes: payload.notes,
      },
      adminUserId,
      ipAddress
    );
  }

  /**
   * Admin: List invoices
   */
  async listAdminInvoices(filters: any) {
    return financeRepository.listAdminInvoices(filters);
  }

  /**
   * Admin: Get invoice details
   */
  async getAdminInvoiceDetails(invoiceId: string) {
    const invoice = await financeRepository.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found.');
    return invoice;
  }

  /**
   * Admin: List transactions
   */
  async listAdminTransactions(filters: any) {
    return financeRepository.listAdminTransactions(filters);
  }

  /**
   * Admin: List audit logs
   */
  async listAdminAuditLogs(params: { invoiceId?: string; action?: string; limit?: number }) {
    return financeRepository.listAdminAuditLogs(params);
  }
}

export const financeService = new FinanceService();
