import type { Request, Response, NextFunction } from 'express';
import { financeService } from '../services/finance.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

export class FinanceController {
  /**
   * GET /api/finance/student/ledger
   * Retrieve the student's own complete fee ledger
   */
  async getStudentLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ledger = await financeService.getStudentLedger(req.user.id);
      res.status(200).json({
        status: 'success',
        data: ledger,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/student/invoices
   * List the student's own invoices
   */
  async getStudentInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const filters = {
        status: req.query.status as any,
        academicYear: req.query.academicYear as string | undefined,
        semester: req.query.semester ? Number(req.query.semester) : undefined,
      };
      const invoices = await financeService.getStudentInvoices(req.user.id, filters);
      res.status(200).json({
        status: 'success',
        count: invoices.length,
        data: invoices,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/student/invoices/:id
   * View details of an invoice belonging to the student
   */
  async getStudentInvoiceDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const invoiceId = String(req.params.id);
      const invoice = await financeService.getStudentInvoiceDetails(invoiceId, req.user.id);
      res.status(200).json({
        status: 'success',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/student/transactions
   * View student's own payment transaction history
   */
  async getStudentTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const transactions = await financeService.getStudentTransactions(req.user.id);
      res.status(200).json({
        status: 'success',
        count: transactions.length,
        data: transactions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/student/receipts/:id
   * View / download verified digital receipt for a confirmed transaction
   */
  async getStudentReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const receiptIdOrTxId = String(req.params.id);
      const receipt = await financeService.getStudentReceipt(
        receiptIdOrTxId,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        data: receipt,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/receipts/:id/verify
   * Verify receipt authenticity, digital signature, and confirmation status
   */
  async verifyReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const receiptIdOrTxId = String(req.params.id);
      const result = await financeService.verifyReceiptAuthenticity(
        receiptIdOrTxId,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/finance/student/pay
   * Initiate online payment attempt (Strict: gateway unconfigured)
   */
  async initiateStudentPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { invoiceId, amount } = req.body;
      const result = await financeService.initiateStudentPayment(
        invoiceId,
        req.user.id,
        amount
      );
      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Finance Administration Endpoints
  // ==========================================

  /**
   * POST /api/finance/admin/invoices
   * Create and issue invoice for a student
   */
  async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const invoice = await financeService.createInvoice(
        req.body,
        req.user.id,
        req.ip
      );
      res.status(201).json({
        status: 'success',
        message: 'Fee invoice created and issued successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/finance/admin/invoices/:id/adjust
   * Apply concession or financial adjustment to an invoice
   */
  async adjustInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const invoiceId = String(req.params.id);
      const invoice = await financeService.adjustInvoice(
        invoiceId,
        req.body,
        req.user.id,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: 'Concession / adjustment applied successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/finance/admin/invoices/:id/cancel
   * Cancel an unpaid invoice
   */
  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const invoiceId = String(req.params.id);
      const invoice = await financeService.cancelInvoice(
        invoiceId,
        req.body,
        req.user.id,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: 'Invoice cancelled successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/finance/admin/reconcile
   * Reconcile an offline payment (Challan, Bank transfer, Cashier counter)
   */
  async reconcilePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await financeService.reconcilePayment(
        req.body,
        req.user.id,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: 'Payment reconciled and invoice balance updated successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/admin/invoices
   * List invoices across students with filters
   */
  async listAdminInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const filters = {
        studentId: req.query.studentId as string | undefined,
        status: req.query.status as any,
        academicTerm: req.query.academicTerm as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const result = await financeService.listAdminInvoices(filters);
      res.status(200).json({
        status: 'success',
        data: result.invoices,
        total: result.totalCount,
        page: result.page,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/admin/invoices/:id
   * Get single invoice details (Admin view)
   */
  async getAdminInvoiceDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const invoiceId = String(req.params.id);
      const invoice = await financeService.getAdminInvoiceDetails(invoiceId);
      res.status(200).json({
        status: 'success',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/admin/transactions
   * List transactions with filter options
   */
  async listAdminTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const filters = {
        invoiceId: req.query.invoiceId as string | undefined,
        studentId: req.query.studentId as string | undefined,
        status: req.query.status as any,
        paymentMode: req.query.paymentMode as any,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const result = await financeService.listAdminTransactions(filters);
      res.status(200).json({
        status: 'success',
        data: result.transactions,
        total: result.totalCount,
        page: result.page,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/finance/admin/audit-logs
   * View immutable audit trail of financial actions
   */
  async listAdminAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const params = {
        invoiceId: req.query.invoiceId as string | undefined,
        action: req.query.action as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const logs = await financeService.listAdminAuditLogs(params);
      res.status(200).json({
        status: 'success',
        count: logs.length,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const financeController = new FinanceController();
