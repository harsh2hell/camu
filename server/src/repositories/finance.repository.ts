import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ServiceUnavailableError,
} from '../errors/AppError.js';
import {
  toMinorUnits,
  fromMinorUnits,
  addPaise,
  subtractPaise,
} from '../utils/financialMath.js';
import type {
  FeeInvoiceDTO,
  StudentFeeLedgerDTO,
  FeeTransactionDTO,
  PaymentReceiptDTO,
} from '../types/finance.js';
import type { FeePaymentStatus, Prisma } from '@prisma/client';

export class FinanceRepository {
  /**
   * Helper: Generates unique university invoice number
   * Format: DBS/{Year}/FEE/{random 6-digit}
   */
  private generateInvoiceNumber(year: string): string {
    const cleanYear = year.split('-')[0] || new Date().getFullYear().toString();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `DBS/${cleanYear}/FEE/${randomHex}`;
  }

  /**
   * Helper: Generates unique university receipt number
   * Format: REC-{Year}-{random 7-digit}
   */
  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return `REC-${year}-${randomNum}`;
  }

  /**
   * Helper: Maps Prisma Invoice model to FeeInvoiceDTO with exact BigInt balance
   */
  private mapInvoiceToDTO(inv: any): FeeInvoiceDTO {
    const totalPaise = toMinorUnits(inv.totalAmount);
    const paidPaise = toMinorUnits(inv.paidAmount);
    const balancePaise = totalPaise > paidPaise ? totalPaise - paidPaise : 0n;

    return {
      id: inv.id,
      studentId: inv.studentId,
      studentName: inv.student?.fullName,
      studentRollNumber: inv.student?.studentProfile?.rollNumber,
      invoiceNumber: inv.invoiceNumber,
      academicTerm: inv.academicTerm,
      academicYear: inv.academicYear,
      semester: inv.semester,
      category: inv.category,
      description: inv.description,
      subtotalAmount: Number(fromMinorUnits(toMinorUnits(inv.subtotalAmount))),
      concessionAmount: Number(fromMinorUnits(toMinorUnits(inv.concessionAmount))),
      concessionReason: inv.concessionReason,
      totalAmount: Number(fromMinorUnits(totalPaise)),
      paidAmount: Number(fromMinorUnits(paidPaise)),
      outstandingBalance: inv.status === 'CANCELLED' ? 0 : Number(fromMinorUnits(balancePaise)),
      dueDate: inv.dueDate instanceof Date ? inv.dueDate.toISOString().split('T')[0] : String(inv.dueDate),
      issueDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString().split('T')[0] : String(inv.issueDate),
      status: inv.status as FeePaymentStatus,
      receiptUrl: inv.receiptUrl,
      items: (inv.items || []).map((itm: any) => ({
        id: itm.id,
        description: itm.description,
        amount: Number(fromMinorUnits(toMinorUnits(itm.amount))),
      })),
      transactions: (inv.transactions || []).map((tx: any) => this.mapTransactionToDTO(tx, inv.invoiceNumber)),
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt ? inv.updatedAt.toISOString() : inv.createdAt.toISOString(),
    };
  }

  /**
   * Helper: Maps Prisma Transaction model to FeeTransactionDTO
   */
  private mapTransactionToDTO(tx: any, fallbackInvoiceNo?: string): FeeTransactionDTO {
    return {
      id: tx.id,
      invoiceId: tx.invoiceId,
      invoiceNumber: tx.invoice?.invoiceNumber || fallbackInvoiceNo || '',
      studentId: tx.studentId,
      transactionRef: tx.transactionRef,
      paymentMode: tx.paymentMode,
      amount: Number(fromMinorUnits(toMinorUnits(tx.amount))),
      status: tx.status,
      receiptNumber: tx.receiptNumber,
      notes: tx.notes,
      paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
      verificationSource: tx.verificationSource ?? null,
      receiptKeyVersion: tx.receiptKeyVersion ?? null,
      createdAt: tx.createdAt ? tx.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Student: Retrieve complete fee ledger with authoritative balances
   */
  async getStudentLedger(studentId: string): Promise<StudentFeeLedgerDTO> {
    try {
      const invoices = await prisma.feeInvoice.findMany({
        where: { studentId },
        include: {
          items: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
          student: {
            include: { studentProfile: true },
          },
        },
        orderBy: { dueDate: 'desc' },
      });

      let totalInvoicedPaise = 0n;
      let totalPaidPaise = 0n;
      let totalConcessionsPaise = 0n;
      let activeCount = 0;

      for (const inv of invoices) {
        if (inv.status !== 'CANCELLED') {
          totalInvoicedPaise += toMinorUnits(inv.totalAmount);
          totalPaidPaise += toMinorUnits(inv.paidAmount);
          totalConcessionsPaise += toMinorUnits(inv.concessionAmount);
          if (inv.status !== 'PAID') {
            activeCount++;
          }
        }
      }

      const totalOutstandingPaise =
        totalInvoicedPaise > totalPaidPaise ? totalInvoicedPaise - totalPaidPaise : 0n;

      // Recent confirmed transactions across all student invoices
      const transactions = await prisma.feeTransaction.findMany({
        where: {
          invoice: { studentId },
          status: 'SUCCESS',
        },
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 10,
      });

      return {
        totalInvoiced: Number(fromMinorUnits(totalInvoicedPaise)),
        totalPaid: Number(fromMinorUnits(totalPaidPaise)),
        totalOutstanding: Number(fromMinorUnits(totalOutstandingPaise)),
        totalConcessions: Number(fromMinorUnits(totalConcessionsPaise)),
        noDuesStatus: totalOutstandingPaise === 0n ? 'CLEARED' : 'PENDING_DUES',
        activeInvoicesCount: activeCount,
        invoices: invoices.map((inv) => this.mapInvoiceToDTO(inv)),
        recentTransactions: transactions.map((tx) => this.mapTransactionToDTO(tx)),
      };
    } catch (err) {
      logger.error('Failed to query student fee ledger:', { studentId, error: err });
      throw new ServiceUnavailableError('Database service unavailable to retrieve fee ledger.');
    }
  }

  /**
   * Student: List own invoices with optional status/term filters
   */
  async getStudentInvoices(
    studentId: string,
    filters?: { status?: FeePaymentStatus; academicYear?: string; semester?: number }
  ): Promise<FeeInvoiceDTO[]> {
    try {
      const where: Prisma.FeeInvoiceWhereInput = { studentId };
      if (filters?.status) where.status = filters.status;
      if (filters?.academicYear) where.academicYear = filters.academicYear;
      if (filters?.semester) where.semester = filters.semester;

      const invoices = await prisma.feeInvoice.findMany({
        where,
        include: {
          items: true,
          transactions: { orderBy: { createdAt: 'desc' } },
          student: { include: { studentProfile: true } },
        },
        orderBy: { dueDate: 'desc' },
      });

      return invoices.map((inv) => this.mapInvoiceToDTO(inv));
    } catch (err) {
      logger.error('Failed to query student invoices:', { studentId, error: err });
      throw new ServiceUnavailableError('Database service unavailable to list invoices.');
    }
  }

  /**
   * Authoritative lookup: Single invoice with full details and audit logs
   */
  async findInvoiceById(invoiceId: string) {
    try {
      return await prisma.feeInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: true,
          transactions: { orderBy: { createdAt: 'desc' } },
          student: { include: { studentProfile: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          cancelledBy: { select: { id: true, fullName: true, email: true } },
          auditLogs: {
            include: { performedBy: { select: { id: true, fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (err) {
      logger.error('Failed to lookup invoice by id:', { invoiceId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Student: List own payment transactions
   */
  async getStudentTransactions(studentId: string): Promise<FeeTransactionDTO[]> {
    try {
      const transactions = await prisma.feeTransaction.findMany({
        where: {
          invoice: { studentId },
        },
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return transactions.map((tx) => this.mapTransactionToDTO(tx));
    } catch (err) {
      logger.error('Failed to retrieve student transactions:', { studentId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Authoritative lookup: Transaction by receipt number or ID
   */
  async findTransactionByIdOrReceipt(idOrReceipt: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReceipt);
    try {
      return await prisma.feeTransaction.findFirst({
        where: isUuid
          ? {
              OR: [{ id: idOrReceipt }, { receiptNumber: idOrReceipt }],
            }
          : {
              receiptNumber: idOrReceipt,
            },
        include: {
          invoice: {
            include: {
              student: {
                include: {
                  studentProfile: {
                    include: { batch: { include: { program: true } } },
                  },
                },
              },
            },
          },
        },
      });
    } catch (err) {
      logger.error('Failed to lookup transaction:', { idOrReceipt, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Admin: Create and issue a new fee invoice transactionally
   */
  async createInvoice(
    data: {
      studentId: string;
      academicTerm: string;
      academicYear: string;
      semester: number;
      category: string;
      description?: string;
      dueDate: Date;
      issueDate?: Date;
      items: Array<{ description: string; amount: number }>;
      concessionAmount?: number;
      concessionReason?: string;
      status?: 'DRAFT' | 'ISSUED';
    },
    auditUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    // 1. Calculate subtotal from items using exact BigInt minor units
    let subtotalPaise = 0n;
    for (const itm of data.items) {
      if (itm.amount < 0) {
        throw new BadRequestError(`Line item amount cannot be negative: ${itm.description}`);
      }
      subtotalPaise += toMinorUnits(itm.amount);
    }

    const concessionPaise = toMinorUnits(data.concessionAmount || 0);
    if (concessionPaise < 0n) {
      throw new BadRequestError('Concession amount cannot be negative.');
    }
    if (concessionPaise > subtotalPaise) {
      throw new BadRequestError('Concession amount cannot exceed subtotal amount.');
    }

    const totalPaise = subtotalPaise - concessionPaise;
    const invoiceNumber = this.generateInvoiceNumber(data.academicYear);

    try {
      return await prisma.$transaction(async (tx) => {
        // Verify student user exists
        const student = await tx.user.findUnique({
          where: { id: data.studentId },
          include: { studentProfile: true },
        });
        if (!student) {
          throw new NotFoundError(`Student with ID ${data.studentId} does not exist.`);
        }

        const invoice = await tx.feeInvoice.create({
          data: {
            studentId: data.studentId,
            invoiceNumber,
            academicTerm: data.academicTerm,
            academicYear: data.academicYear,
            semester: data.semester,
            category: data.category,
            description: data.description || null,
            subtotalAmount: fromMinorUnits(subtotalPaise),
            concessionAmount: fromMinorUnits(concessionPaise),
            concessionReason: data.concessionReason || null,
            totalAmount: fromMinorUnits(totalPaise),
            paidAmount: '0.00',
            dueDate: data.dueDate,
            issueDate: data.issueDate || new Date(),
            status: data.status || 'ISSUED',
            createdById: auditUserId,
            items: {
              create: data.items.map((itm) => ({
                description: itm.description,
                amount: fromMinorUnits(toMinorUnits(itm.amount)),
              })),
            },
          },
          include: {
            items: true,
            transactions: true,
            student: { include: { studentProfile: true } },
          },
        });

        // Record immutable financial audit log
        await tx.feeAuditLog.create({
          data: {
            invoiceId: invoice.id,
            action: 'INVOICE_CREATED',
            performedById: auditUserId,
            details: {
              invoiceNumber,
              subtotal: fromMinorUnits(subtotalPaise),
              concession: fromMinorUnits(concessionPaise),
              total: fromMinorUnits(totalPaise),
              status: invoice.status,
            },
            ipAddress: ipAddress || null,
          },
        });

        logger.info('New fee invoice successfully created:', {
          invoiceId: invoice.id,
          invoiceNumber,
          studentId: data.studentId,
          totalAmount: fromMinorUnits(totalPaise),
        });

        return this.mapInvoiceToDTO(invoice);
      });
    } catch (err: any) {
      if (err instanceof BadRequestError || err instanceof NotFoundError) throw err;
      logger.error('Failed to create fee invoice transactionally:', { data, error: err });
      throw new ServiceUnavailableError(`Database failure creating invoice: ${err?.message || err}`);
    }
  }

  /**
   * Admin: Concurrency-safe concession or financial adjustment on an invoice
   */
  async adjustInvoice(
    invoiceId: string,
    concessionAmount: number,
    concessionReason: string,
    auditUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    const newConcessionPaise = toMinorUnits(concessionAmount);
    if (newConcessionPaise < 0n) {
      throw new BadRequestError('Concession amount cannot be negative.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Lock row with FOR UPDATE
        const rawInvoices = await tx.$queryRaw<any[]>`
          SELECT * FROM fee_invoices WHERE id = ${invoiceId}::uuid FOR UPDATE
        `;
        if (!rawInvoices || rawInvoices.length === 0) {
          throw new NotFoundError('Invoice not found.');
        }
        const inv = rawInvoices[0];

        if (inv.status === 'CANCELLED') {
          throw new BadRequestError('Cannot apply concessions to a cancelled invoice.');
        }

        const subtotalPaise = toMinorUnits(inv.subtotal_amount);
        const paidPaise = toMinorUnits(inv.paid_amount);

        if (newConcessionPaise > subtotalPaise) {
          throw new BadRequestError('Concession amount cannot exceed subtotal amount.');
        }

        const newTotalPaise = subtotalPaise - newConcessionPaise;
        if (newTotalPaise < paidPaise) {
          throw new BadRequestError(
            `Concession would reduce total invoice amount below already paid amount (Paid: ${fromMinorUnits(
              paidPaise
            )}, New Total: ${fromMinorUnits(newTotalPaise)}).`
          );
        }

        let newStatus: FeePaymentStatus = inv.status;
        if (newTotalPaise === paidPaise) {
          newStatus = 'PAID';
        } else if (paidPaise > 0n) {
          newStatus = 'PARTIALLY_PAID';
        } else if (inv.status === 'DRAFT') {
          newStatus = 'DRAFT';
        } else {
          newStatus = 'ISSUED';
        }

        const updated = await tx.feeInvoice.update({
          where: { id: invoiceId },
          data: {
            concessionAmount: fromMinorUnits(newConcessionPaise),
            concessionReason,
            totalAmount: fromMinorUnits(newTotalPaise),
            status: newStatus,
          },
          include: {
            items: true,
            transactions: true,
            student: { include: { studentProfile: true } },
          },
        });

        // Audit Log
        await tx.feeAuditLog.create({
          data: {
            invoiceId,
            action: 'CONCESSION_APPLIED',
            performedById: auditUserId,
            details: {
              previousConcession: fromMinorUnits(toMinorUnits(inv.concession_amount)),
              newConcession: fromMinorUnits(newConcessionPaise),
              concessionReason,
              previousTotal: fromMinorUnits(toMinorUnits(inv.total_amount)),
              newTotal: fromMinorUnits(newTotalPaise),
              newStatus,
            },
            ipAddress: ipAddress || null,
          },
        });

        return this.mapInvoiceToDTO(updated);
      });
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof NotFoundError) throw err;
      logger.error('Failed to adjust invoice:', { invoiceId, error: err });
      throw new ServiceUnavailableError('Database failure adjusting invoice.');
    }
  }

  /**
   * Admin: Cancel an invoice under strict business rules (no confirmed payments allowed)
   */
  async cancelInvoice(
    invoiceId: string,
    cancellationReason: string,
    auditUserId: string,
    ipAddress?: string
  ): Promise<FeeInvoiceDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawInvoices = await tx.$queryRaw<any[]>`
          SELECT * FROM fee_invoices WHERE id = ${invoiceId}::uuid FOR UPDATE
        `;
        if (!rawInvoices || rawInvoices.length === 0) {
          throw new NotFoundError('Invoice not found.');
        }
        const inv = rawInvoices[0];

        if (inv.status === 'CANCELLED') {
          throw new BadRequestError('Invoice is already cancelled.');
        }

        // Verify no confirmed payments exist
        const confirmedCount = await tx.feeTransaction.count({
          where: { invoiceId, status: 'SUCCESS' },
        });
        if (confirmedCount > 0 || toMinorUnits(inv.paid_amount) > 0n) {
          throw new ConflictError(
            'Cannot cancel an invoice with confirmed payments. Reverse or adjust payments first.'
          );
        }

        const updated = await tx.feeInvoice.update({
          where: { id: invoiceId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledById: auditUserId,
            cancellationReason,
          },
          include: {
            items: true,
            transactions: true,
            student: { include: { studentProfile: true } },
          },
        });

        await tx.feeAuditLog.create({
          data: {
            invoiceId,
            action: 'INVOICE_CANCELLED',
            performedById: auditUserId,
            details: {
              cancellationReason,
              previousStatus: inv.status,
            },
            ipAddress: ipAddress || null,
          },
        });

        return this.mapInvoiceToDTO(updated);
      });
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof ConflictError)
        throw err;
      logger.error('Failed to cancel invoice:', { invoiceId, error: err });
      throw new ServiceUnavailableError('Database failure cancelling invoice.');
    }
  }

  /**
   * Admin: Concurrency-safe payment reconciliation (Bank Transfer / Cashier / Challan)
   */
  async reconcilePayment(
    data: {
      invoiceId: string;
      amount: number;
      paymentMode: string;
      transactionRef: string;
      paidAt?: Date;
      notes?: string;
    },
    auditUserId: string,
    ipAddress?: string
  ): Promise<{ transaction: FeeTransactionDTO; invoice: FeeInvoiceDTO; receiptNumber: string }> {
    const paymentPaise = toMinorUnits(data.amount);
    if (paymentPaise <= 0n) {
      throw new BadRequestError('Payment amount must be greater than zero.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Idempotency check on transaction reference
        const existingTx = await tx.feeTransaction.findUnique({
          where: { transactionRef: data.transactionRef },
        });
        if (existingTx) {
          throw new ConflictError(
            `Transaction reference "${data.transactionRef}" has already been processed.`
          );
        }

        // 2. Lock invoice row FOR UPDATE
        const rawInvoices = await tx.$queryRaw<any[]>`
          SELECT * FROM fee_invoices WHERE id = ${data.invoiceId}::uuid FOR UPDATE
        `;
        if (!rawInvoices || rawInvoices.length === 0) {
          throw new NotFoundError('Invoice not found.');
        }
        const inv = rawInvoices[0];

        if (inv.status === 'CANCELLED') {
          throw new BadRequestError('Cannot reconcile payment for a cancelled invoice.');
        }

        const totalPaise = toMinorUnits(inv.total_amount);
        const currentPaidPaise = toMinorUnits(inv.paid_amount);
        const outstandingPaise = totalPaise > currentPaidPaise ? totalPaise - currentPaidPaise : 0n;

        if (paymentPaise > outstandingPaise) {
          throw new BadRequestError(
            `Payment amount (₹${fromMinorUnits(paymentPaise)}) exceeds outstanding balance (₹${fromMinorUnits(
              outstandingPaise
            )}).`
          );
        }

        const newPaidPaise = currentPaidPaise + paymentPaise;
        const newStatus: FeePaymentStatus = newPaidPaise >= totalPaise ? 'PAID' : 'PARTIALLY_PAID';
        const receiptNumber = this.generateReceiptNumber();
        const paidAtDate = data.paidAt || new Date();

        const keyVersion = config.RECEIPT_SIGNING_KEY_VERSION || 'v1';

        // 3. Create confirmed transaction record
        const transaction = await tx.feeTransaction.create({
          data: {
            invoiceId: data.invoiceId,
            studentId: inv.student_id,
            transactionRef: data.transactionRef,
            paymentMode: data.paymentMode,
            amount: fromMinorUnits(paymentPaise),
            status: 'SUCCESS',
            gatewayProvider: 'OFFLINE_RECONCILIATION',
            verificationSource: 'MANUAL_STAFF_ENTRY',
            receiptKeyVersion: keyVersion,
            receiptNumber,
            reconciledById: auditUserId,
            reconciledAt: new Date(),
            notes: data.notes || null,
            paidAt: paidAtDate,
          },
        });

        // 4. Update invoice paid amount and status
        const updatedInvoice = await tx.feeInvoice.update({
          where: { id: data.invoiceId },
          data: {
            paidAmount: fromMinorUnits(newPaidPaise),
            status: newStatus,
          },
          include: {
            items: true,
            transactions: true,
            student: { include: { studentProfile: true } },
          },
        });

        // 5. Audit log
        await tx.feeAuditLog.create({
          data: {
            invoiceId: data.invoiceId,
            transactionId: transaction.id,
            action: 'PAYMENT_RECONCILED',
            performedById: auditUserId,
            details: {
              transactionRef: data.transactionRef,
              paymentMode: data.paymentMode,
              amount: fromMinorUnits(paymentPaise),
              verificationSource: 'MANUAL_STAFF_ENTRY',
              verificationClaim: 'Staff entry of offline reference / challan - pending independent bank statement audit',
              previousPaid: fromMinorUnits(currentPaidPaise),
              newPaid: fromMinorUnits(newPaidPaise),
              newStatus,
              receiptNumber,
              receiptKeyVersion: keyVersion,
            },
            ipAddress: ipAddress || null,
          },
        });

        logger.info('Payment successfully reconciled:', {
          invoiceId: data.invoiceId,
          transactionRef: data.transactionRef,
          receiptNumber,
          amount: fromMinorUnits(paymentPaise),
          verificationSource: 'MANUAL_STAFF_ENTRY',
        });

        return {
          transaction: this.mapTransactionToDTO(transaction, updatedInvoice.invoiceNumber),
          invoice: this.mapInvoiceToDTO(updatedInvoice),
          receiptNumber,
        };
      });
    } catch (err: any) {
      if (
        err instanceof BadRequestError ||
        err instanceof NotFoundError ||
        err instanceof ConflictError
      )
        throw err;
      if (err?.code === 'P2002' || err?.message?.includes('transaction_ref')) {
        throw new ConflictError(`Transaction reference "${data.transactionRef}" has already been processed.`);
      }
      logger.error('Failed to reconcile payment:', { data, error: err });
      throw new ServiceUnavailableError('Database failure reconciling payment.');
    }
  }

  /**
   * Student: Initiate payment attempt foundation (Strict: gateway unconfigured)
   */
  async initiatePaymentAttempt(
    invoiceId: string,
    studentId: string,
    amount: number
  ): Promise<{
    status: string;
    isConfigured: boolean;
    gatewayProvider: string;
    message: string;
    transactionRef: string;
    amount: number;
    invoiceNumber: string;
    reconciliationInstructions: string;
  }> {
    const paymentPaise = toMinorUnits(amount);
    if (paymentPaise <= 0n) {
      throw new BadRequestError('Payment amount must be greater than zero.');
    }

    try {
      const invoice = await prisma.feeInvoice.findUnique({
        where: { id: invoiceId },
      });
      if (!invoice) throw new NotFoundError('Invoice not found.');
      if (invoice.studentId !== studentId) {
        throw new ForbiddenError('You are not authorized to initiate payment on an invoice belonging to another student.');
      }
      if (invoice.status === 'CANCELLED') {
        throw new BadRequestError('Cannot make payment on a cancelled invoice.');
      }
      if (invoice.status === 'PAID') {
        throw new BadRequestError('Invoice has already been settled in full.');
      }

      const totalPaise = toMinorUnits(invoice.totalAmount);
      const paidPaise = toMinorUnits(invoice.paidAmount);
      const outstandingPaise = totalPaise > paidPaise ? totalPaise - paidPaise : 0n;

      if (paymentPaise > outstandingPaise) {
        throw new BadRequestError(
          `Payment amount exceeds outstanding balance of ₹${fromMinorUnits(outstandingPaise)}.`
        );
      }

      const transactionRef = `INIT_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Persist unconfigured pending transaction record foundation
      await prisma.feeTransaction.create({
        data: {
          invoiceId,
          studentId,
          transactionRef,
          paymentMode: 'ONLINE_GATEWAY',
          amount: fromMinorUnits(paymentPaise),
          status: 'PENDING',
          gatewayProvider: 'UNCONFIGURED',
          notes: 'Online payment attempt created while gateway integration is unconfigured.',
        },
      });

      return {
        status: 'GATEWAY_UNCONFIGURED',
        isConfigured: false,
        gatewayProvider: 'UNCONFIGURED',
        message:
          'Online payment gateway (Razorpay/Stripe) is not configured in this environment. Please settle dues via bank transfer or at the Accounts & Fee Office.',
        transactionRef,
        amount: Number(fromMinorUnits(paymentPaise)),
        invoiceNumber: invoice.invoiceNumber,
        reconciliationInstructions:
          '1. Transfer funds via Bank Transfer / NEFT / RTGS to DBS Global University Fee Account (HDFC Bank, IFSC: HDFC0001234, A/C: 50200012345678).\n2. Specify this Transaction Reference as the remark / narration.\n3. Present the bank UTR or receipt to the Accounts & Fee Office for ledger reconciliation.',
      };
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof ForbiddenError) throw err;
      logger.error('Failed to initiate payment attempt:', { invoiceId, studentId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Admin: List invoices with filters and pagination
   */
  async listAdminInvoices(
    filters: {
      studentId?: string;
      status?: FeePaymentStatus;
      academicTerm?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.FeeInvoiceWhereInput = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.academicTerm) where.academicTerm = filters.academicTerm;
    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { student: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    try {
      const [totalCount, invoices] = await Promise.all([
        prisma.feeInvoice.count({ where }),
        prisma.feeInvoice.findMany({
          where,
          include: {
            items: true,
            transactions: { orderBy: { createdAt: 'desc' } },
            student: { include: { studentProfile: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        invoices: invoices.map((inv) => this.mapInvoiceToDTO(inv)),
      };
    } catch (err) {
      logger.error('Failed to list admin invoices:', { filters, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Admin: List transactions with filtering
   */
  async listAdminTransactions(filters: {
    invoiceId?: string;
    studentId?: string;
    status?: string;
    paymentMode?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.FeeTransactionWhereInput = {};
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.paymentMode) where.paymentMode = filters.paymentMode;

    try {
      const [totalCount, transactions] = await Promise.all([
        prisma.feeTransaction.count({ where }),
        prisma.feeTransaction.findMany({
          where,
          include: {
            invoice: {
              include: { student: { include: { studentProfile: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        transactions: transactions.map((tx) => this.mapTransactionToDTO(tx)),
      };
    } catch (err) {
      logger.error('Failed to list admin transactions:', { filters, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Admin: Audit logs query
   */
  async listAdminAuditLogs(params: { invoiceId?: string; action?: string; limit?: number }) {
    try {
      const where: Prisma.FeeAuditLogWhereInput = {};
      if (params.invoiceId) where.invoiceId = params.invoiceId;
      if (params.action) where.action = params.action;

      return await prisma.feeAuditLog.findMany({
        where,
        include: {
          performedBy: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 100,
      });
    } catch (err) {
      logger.error('Failed to list audit logs:', { params, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }
}

export const financeRepository = new FinanceRepository();
