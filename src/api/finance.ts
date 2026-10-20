import { apiClient, type ApiResponse } from './client';
import type {
  FeeInvoiceDTO,
  FeeTransactionDTO,
  StudentFeeLedgerDTO,
  PaymentReceiptDTO,
  ReceiptVerificationResultDTO,
} from '../../server/src/types/finance';

export interface CreateInvoicePayload {
  studentId: string;
  academicTerm: string;
  academicYear?: string;
  semester?: number;
  category: string;
  description?: string;
  dueDate: string;
  issueDate?: string;
  items: Array<{ description: string; amount: number }>;
  concessionAmount?: number;
  concessionReason?: string;
  status?: 'DRAFT' | 'ISSUED';
}

export interface AdjustInvoicePayload {
  concessionAmount: number;
  concessionReason: string;
}

export interface CancelInvoicePayload {
  cancellationReason: string;
}

export interface ReconcilePaymentPayload {
  invoiceId: string;
  amount: number;
  paymentMode: 'BANK_TRANSFER' | 'CHALLAN' | 'DEMAND_DRAFT' | 'POS_COUNTER' | 'UPI' | 'ONLINE_GATEWAY';
  transactionRef: string;
  paidAt?: string;
  notes?: string;
}

export interface InitiatePaymentPayload {
  invoiceId: string;
  amount: number;
}

export interface InitiatePaymentResponse {
  isConfigured: boolean;
  gatewayProvider: string;
  transactionRef: string;
  status: string;
  amount: number;
  invoiceId: string;
  message: string;
  reconciliationInstructions: string;
}

export interface AuditLogItem {
  id: string;
  invoiceId?: string | null;
  transactionId?: string | null;
  action: string;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export const financeApi = {
  // ==========================================
  // Student Finance Methods
  // ==========================================

  /**
   * Retrieves complete student fee ledger (invoiced, paid, balance, concessions)
   */
  async getStudentLedger(): Promise<StudentFeeLedgerDTO> {
    const res = await apiClient.get<ApiResponse<StudentFeeLedgerDTO>>('/finance/student/ledger');
    return res.data;
  },

  /**
   * Lists student invoices with optional filtering
   */
  async getStudentInvoices(filters?: {
    status?: string;
    academicYear?: string;
    semester?: number;
  }): Promise<FeeInvoiceDTO[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.academicYear) params.append('academicYear', filters.academicYear);
    if (filters?.semester) params.append('semester', String(filters.semester));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<FeeInvoiceDTO[]>>(`/finance/student/invoices${qs}`);
    return res.data || [];
  },

  /**
   * Retrieves details of a specific invoice owned by the student
   */
  async getStudentInvoiceDetails(invoiceId: string): Promise<FeeInvoiceDTO> {
    const res = await apiClient.get<ApiResponse<FeeInvoiceDTO>>(`/finance/student/invoices/${invoiceId}`);
    return res.data;
  },

  /**
   * Retrieves student's payment transaction history
   */
  async getStudentTransactions(): Promise<FeeTransactionDTO[]> {
    const res = await apiClient.get<ApiResponse<FeeTransactionDTO[]>>('/finance/student/transactions');
    return res.data || [];
  },

  /**
   * Retrieves verified digital receipt for a confirmed payment
   */
  async getStudentReceipt(receiptIdOrTxId: string): Promise<PaymentReceiptDTO> {
    const res = await apiClient.get<ApiResponse<PaymentReceiptDTO>>(`/finance/student/receipts/${receiptIdOrTxId}`);
    return res.data;
  },

  /**
   * Cryptographically verifies receipt authenticity and confirmation status
   */
  async verifyReceipt(receiptIdOrTxId: string): Promise<ReceiptVerificationResultDTO> {
    const res = await apiClient.get<ApiResponse<ReceiptVerificationResultDTO>>(`/finance/receipts/${receiptIdOrTxId}/verify`);
    return res.data;
  },

  /**
   * Initiates payment attempt (records transaction, returns provider status)
   */
  async initiatePayment(payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> {
    const res = await apiClient.post<ApiResponse<InitiatePaymentResponse>>('/finance/student/pay', payload);
    return res.data;
  },

  // ==========================================
  // Finance Administration Methods
  // ==========================================

  /**
   * Creates and issues a new student invoice
   */
  async createInvoice(payload: CreateInvoicePayload): Promise<FeeInvoiceDTO> {
    const res = await apiClient.post<ApiResponse<FeeInvoiceDTO>>('/finance/admin/invoices', payload);
    return res.data;
  },

  /**
   * Applies concession or adjustment to an invoice
   */
  async adjustInvoice(invoiceId: string, payload: AdjustInvoicePayload): Promise<FeeInvoiceDTO> {
    const res = await apiClient.patch<ApiResponse<FeeInvoiceDTO>>(`/finance/admin/invoices/${invoiceId}/adjust`, payload);
    return res.data;
  },

  /**
   * Cancels an unpaid invoice
   */
  async cancelInvoice(invoiceId: string, payload: CancelInvoicePayload): Promise<FeeInvoiceDTO> {
    const res = await apiClient.post<ApiResponse<FeeInvoiceDTO>>(`/finance/admin/invoices/${invoiceId}/cancel`, payload);
    return res.data;
  },

  /**
   * Reconciles an offline payment (Challan, bank transfer, counter)
   */
  async reconcilePayment(payload: ReconcilePaymentPayload): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/finance/admin/reconcile', payload);
    return res.data;
  },

  /**
   * Lists institutional invoices for administration
   */
  async listAdminInvoices(filters?: {
    studentId?: string;
    status?: string;
    academicTerm?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: FeeInvoiceDTO[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.academicTerm) params.append('academicTerm', filters.academicTerm);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/finance/admin/invoices${qs}`);
    return res;
  },

  /**
   * Lists all transactions for administration
   */
  async listAdminTransactions(filters?: {
    invoiceId?: string;
    studentId?: string;
    status?: string;
    paymentMode?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: FeeTransactionDTO[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentMode) params.append('paymentMode', filters.paymentMode);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/finance/admin/transactions${qs}`);
    return res;
  },

  /**
   * Retrieves financial audit logs
   */
  async listAdminAuditLogs(params?: {
    invoiceId?: string;
    action?: string;
    limit?: number;
  }): Promise<AuditLogItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.invoiceId) searchParams.append('invoiceId', params.invoiceId);
    if (params?.action) searchParams.append('action', params.action);
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<ApiResponse<AuditLogItem[]>>(`/finance/admin/audit-logs${qs}`);
    return res.data || [];
  },
};
