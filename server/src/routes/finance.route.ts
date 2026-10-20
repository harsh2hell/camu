import { Router } from 'express';
import { financeController } from '../controllers/finance.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createInvoiceSchema,
  adjustInvoiceSchema,
  cancelInvoiceSchema,
  reconcilePaymentSchema,
  initiatePaymentSchema,
  invoiceIdParamSchema,
  receiptIdParamSchema,
  studentInvoicesQuerySchema,
  adminInvoicesQuerySchema,
  adminTransactionsQuerySchema,
} from '../types/finance.js';

export const financeRouter: Router = Router();

// ==========================================
// Student Finance Endpoints
// Strict session-derived identity (req.user.id)
// ==========================================

// Retrieve complete student fee ledger
financeRouter.get(
  '/student/ledger',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => financeController.getStudentLedger(req, res, next)
);

// List student invoices with query filters
financeRouter.get(
  '/student/invoices',
  requireAuth,
  requireRole('STUDENT'),
  validate({ query: studentInvoicesQuerySchema }),
  (req, res, next) => financeController.getStudentInvoices(req, res, next)
);

// Get single invoice details (with student ownership check)
financeRouter.get(
  '/student/invoices/:id',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: invoiceIdParamSchema }),
  (req, res, next) => financeController.getStudentInvoiceDetails(req, res, next)
);

// View student transaction history
financeRouter.get(
  '/student/transactions',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => financeController.getStudentTransactions(req, res, next)
);

// View / download digitally signed receipt
financeRouter.get(
  '/student/receipts/:id',
  requireAuth,
  requireRole('STUDENT', 'REGISTRAR_ADMIN'),
  validate({ params: receiptIdParamSchema }),
  (req, res, next) => financeController.getStudentReceipt(req, res, next)
);

// Cryptographically verify receipt authenticity and status
financeRouter.get(
  '/student/receipts/:id/verify',
  requireAuth,
  validate({ params: receiptIdParamSchema }),
  (req, res, next) => financeController.verifyReceipt(req, res, next)
);

financeRouter.get(
  '/receipts/:id/verify',
  requireAuth,
  validate({ params: receiptIdParamSchema }),
  (req, res, next) => financeController.verifyReceipt(req, res, next)
);

// Initiate payment attempt (Strict: records pending attempt, identifies unconfigured gateway)
financeRouter.post(
  '/student/pay',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: initiatePaymentSchema }),
  (req, res, next) => financeController.initiateStudentPayment(req, res, next)
);

// ==========================================
// Finance Administration Endpoints
// Restricted to REGISTRAR_ADMIN role only
// ==========================================

// Create and issue new fee invoice with line items
financeRouter.post(
  '/admin/invoices',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ body: createInvoiceSchema }),
  (req, res, next) => financeController.createInvoice(req, res, next)
);

// Apply concession or financial adjustment to an invoice
financeRouter.patch(
  '/admin/invoices/:id/adjust',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ params: invoiceIdParamSchema, body: adjustInvoiceSchema }),
  (req, res, next) => financeController.adjustInvoice(req, res, next)
);

// Cancel an unpaid invoice under strict business rules
financeRouter.post(
  '/admin/invoices/:id/cancel',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ params: invoiceIdParamSchema, body: cancelInvoiceSchema }),
  (req, res, next) => financeController.cancelInvoice(req, res, next)
);

// Reconcile payment (Challan, bank transfer, cashier counter)
financeRouter.post(
  '/admin/reconcile',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ body: reconcilePaymentSchema }),
  (req, res, next) => financeController.reconcilePayment(req, res, next)
);

// List invoices across the institution
financeRouter.get(
  '/admin/invoices',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ query: adminInvoicesQuerySchema }),
  (req, res, next) => financeController.listAdminInvoices(req, res, next)
);

// Get admin invoice details
financeRouter.get(
  '/admin/invoices/:id',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ params: invoiceIdParamSchema }),
  (req, res, next) => financeController.getAdminInvoiceDetails(req, res, next)
);

// List transactions
financeRouter.get(
  '/admin/transactions',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  validate({ query: adminTransactionsQuerySchema }),
  (req, res, next) => financeController.listAdminTransactions(req, res, next)
);

// View immutable audit logs
financeRouter.get(
  '/admin/audit-logs',
  requireAuth,
  requireRole('REGISTRAR_ADMIN'),
  (req, res, next) => financeController.listAdminAuditLogs(req, res, next)
);
