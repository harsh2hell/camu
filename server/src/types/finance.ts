import { z } from 'zod';
import type { FeePaymentStatus } from '@prisma/client';

export const feeInvoiceStatusEnum = z.enum([
  'DRAFT',
  'ISSUED',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const paymentModeEnum = z.enum([
  'BANK_TRANSFER',
  'CHALLAN',
  'DEMAND_DRAFT',
  'POS_COUNTER',
  'UPI',
  'ONLINE_GATEWAY',
]);

export const feeTransactionStatusEnum = z.enum([
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REVERSED',
]);

// Line Item Schema
export const createInvoiceItemSchema = z.object({
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(255),
  amount: z.number().nonnegative('Line item amount must be zero or positive'),
});

// Create Invoice Schema (Finance Administration)
export const createInvoiceSchema = z
  .object({
    studentId: z.string().uuid('Valid student user UUID is required'),
    academicTerm: z.string().trim().min(2, 'Academic term is required (e.g. Odd Semester 2026-27)').max(64),
    academicYear: z.string().trim().min(4).max(32).default('2026-27'),
    semester: z.number().int().min(1).max(12).default(1),
    category: z.string().trim().min(2, 'Category is required (e.g. Tuition & Lab Fee)').max(64),
    description: z.string().trim().max(500).optional(),
    dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid due date is required'),
    issueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid issue date is required').optional(),
    items: z.array(createInvoiceItemSchema).min(1, 'At least one line item is required'),
    concessionAmount: z.number().nonnegative('Concession amount cannot be negative').default(0),
    concessionReason: z.string().trim().max(500).optional(),
    status: z.enum(['DRAFT', 'ISSUED']).default('ISSUED'),
  })
  .refine(
    (data) => {
      if (data.concessionAmount > 0 && (!data.concessionReason || data.concessionReason.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Concession reason is required when a concession amount is applied',
      path: ['concessionReason'],
    }
  );

// Apply Concession / Adjustment Schema
export const adjustInvoiceSchema = z.object({
  concessionAmount: z.number().nonnegative('Concession amount must be zero or positive'),
  concessionReason: z.string().trim().min(3, 'Concession reason is required').max(500),
});

// Cancel Invoice Schema
export const cancelInvoiceSchema = z.object({
  cancellationReason: z.string().trim().min(3, 'Cancellation reason is required').max(500),
});

// Reconcile Payment Schema (Offline / Bank Transfer / Cashier)
export const reconcilePaymentSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice UUID is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMode: paymentModeEnum,
  transactionRef: z.string().trim().min(3, 'Transaction reference/UTR/Challan is required').max(128),
  paidAt: z.string().refine((d) => !isNaN(Date.parse(d)), 'Valid payment timestamp is required').optional(),
  notes: z.string().trim().max(500).optional(),
});

// Student Payment Initiation Schema
export const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice UUID is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
});

// URL Param Schemas
export const invoiceIdParamSchema = z.object({
  id: z.string().uuid('Valid invoice UUID is required'),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('Valid transaction UUID is required'),
});

export const receiptIdParamSchema = z.object({
  id: z.string().min(1, 'Receipt identifier is required'),
});

// Query Parameter Schemas
export const studentInvoicesQuerySchema = z.object({
  status: feeInvoiceStatusEnum.optional(),
  academicYear: z.string().optional(),
  semester: z.coerce.number().int().optional(),
});

export const adminInvoicesQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  status: feeInvoiceStatusEnum.optional(),
  academicTerm: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const adminTransactionsQuerySchema = z.object({
  invoiceId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: feeTransactionStatusEnum.optional(),
  paymentMode: paymentModeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// TypeScript DTOs
export interface FeeInvoiceItemDTO {
  id: string;
  description: string;
  amount: number;
}

export interface FeeTransactionDTO {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  studentId?: string | null;
  transactionRef: string;
  paymentMode: string;
  amount: number;
  status: string;
  receiptNumber?: string | null;
  notes?: string | null;
  paidAt: string | null;
  verificationSource?: string | null;
  receiptKeyVersion?: string | null;
  createdAt: string;
}

export interface FeeInvoiceDTO {
  id: string;
  studentId: string;
  studentName?: string;
  studentRollNumber?: string;
  invoiceNumber: string;
  academicTerm: string;
  academicYear: string;
  semester: number;
  category: string;
  description?: string | null;
  subtotalAmount: number;
  concessionAmount: number;
  concessionReason?: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  dueDate: string;
  issueDate: string;
  status: FeePaymentStatus;
  receiptUrl?: string | null;
  items: FeeInvoiceItemDTO[];
  transactions: FeeTransactionDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeLedgerDTO {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalConcessions: number;
  noDuesStatus: 'CLEARED' | 'PENDING_DUES';
  activeInvoicesCount: number;
  invoices: FeeInvoiceDTO[];
  recentTransactions: FeeTransactionDTO[];
}

export interface PaymentReceiptDTO {
  receiptNumber: string;
  transactionRef: string;
  invoiceNumber: string;
  studentName: string;
  studentRollNumber: string;
  studentRegistrationNo?: string;
  programName?: string;
  academicTerm: string;
  category: string;
  paymentMode: string;
  amountPaid: number;
  paidAt: string;
  invoiceTotalAmount: number;
  remainingInvoiceBalance: number;
  verificationHash: string;
  keyVersion: string;
  verificationSource: string;
  verificationClaim: string;
  issuedBy: string;
}

export interface ReceiptVerificationResultDTO {
  receiptNumber: string;
  transactionRef: string;
  invoiceNumber: string;
  status: string;
  authentic: boolean;
  keyVersion: string;
  verificationSource: string;
  verificationClaim: string;
  amountPaid: number;
  paidAt: string;
  studentName?: string;
  verifiedAt: string;
}

