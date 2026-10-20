import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  FileSpreadsheet,
  PlusCircle,
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  History,
  ShieldAlert,
  Percent,
  XCircle,
  X,
  CreditCard,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  financeApi, 
  type AuditLogItem 
} from '../api/finance';
import type { 
  FeeInvoiceDTO, 
  FeeTransactionDTO 
} from '../../server/src/types/finance';

export const FinanceAdminView: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'reconciliation' | 'transactions' | 'audit'>('invoices');

  // Invoices state
  const [invoices, setInvoices] = useState<FeeInvoiceDTO[]>([]);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Transactions state
  const [transactions, setTransactions] = useState<FeeTransactionDTO[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAdjustModal, setShowAdjustModal] = useState<FeeInvoiceDTO | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<FeeInvoiceDTO | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState<FeeInvoiceDTO | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Invoice Form State
  const [createForm, setCreateForm] = useState(() => ({
    studentId: '',
    academicTerm: 'Odd Semester 2026-27',
    academicYear: '2026-27',
    semester: 1,
    category: 'Tuition & Academic Fee',
    description: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: 'Tuition Fee Component', amount: 50000 }],
    concessionAmount: 0,
    concessionReason: '',
    status: 'ISSUED' as 'DRAFT' | 'ISSUED',
  }));
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Adjust Form State
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Reconcile Form State
  const [reconcileAmount, setReconcileAmount] = useState<number>(0);
  const [reconcileMode, setReconcileMode] = useState<any>('BANK_TRANSFER');
  const [reconcileRef, setReconcileRef] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [isSubmittingReconcile, setIsSubmittingReconcile] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);
    setInvoiceError(null);
    try {
      const res = await financeApi.listAdminInvoices({
        search: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setInvoices(res.data || []);
      setTotalInvoices(res.total || 0);
    } catch (err: any) {
      console.error('Error fetching admin invoices:', err);
      setInvoiceError(err?.message || 'Failed to fetch invoices');
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [searchQuery, statusFilter]);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setIsLoadingTxs(true);
    try {
      const res = await financeApi.listAdminTransactions({ limit: 100 });
      setTransactions(res.data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoadingTxs(false);
    }
  }, []);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await financeApi.listAdminAuditLogs({ limit: 100 });
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'invoices') {
      loadInvoices();
    } else if (activeTab === 'transactions' || activeTab === 'reconciliation') {
      loadTransactions();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadInvoices, loadTransactions, loadAuditLogs]);

  // Handle Create Invoice Submission
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.studentId.trim()) {
      showToast('error', 'Student User UUID is required.');
      return;
    }
    if (createForm.items.length === 0) {
      showToast('error', 'At least one line item is required.');
      return;
    }
    if (createForm.concessionAmount > 0 && !createForm.concessionReason.trim()) {
      showToast('error', 'Concession reason is required when a concession is applied.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      await financeApi.createInvoice(createForm);
      showToast('success', 'Fee invoice generated and issued successfully.');
      setShowCreateModal(false);
      // Reset form
      setCreateForm({
        studentId: '',
        academicTerm: 'Odd Semester 2026-27',
        academicYear: '2026-27',
        semester: 1,
        category: 'Tuition & Academic Fee',
        description: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: 'Tuition Fee Component', amount: 50000 }],
        concessionAmount: 0,
        concessionReason: '',
        status: 'ISSUED',
      });
      loadInvoices();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Adjust Submission
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    if (!adjustReason.trim()) {
      showToast('error', 'Concession adjustment reason is required.');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await financeApi.adjustInvoice(showAdjustModal.id, {
        concessionAmount: Number(adjustAmount),
        concessionReason: adjustReason.trim(),
      });
      showToast('success', 'Fee concession/adjustment applied successfully.');
      setShowAdjustModal(null);
      loadInvoices();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to apply adjustment.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Handle Cancel Submission
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancelModal) return;
    if (!cancelReason.trim()) {
      showToast('error', 'Cancellation reason is required.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await financeApi.cancelInvoice(showCancelModal.id, {
        cancellationReason: cancelReason.trim(),
      });
      showToast('success', 'Fee invoice cancelled successfully.');
      setShowCancelModal(null);
      loadInvoices();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to cancel invoice.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle Reconcile Submission
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReconcileModal) return;
    if (reconcileAmount <= 0) {
      showToast('error', 'Reconciled amount must be greater than zero.');
      return;
    }
    if (!reconcileRef.trim()) {
      showToast('error', 'Bank UTR or Challan reference is required.');
      return;
    }

    setIsSubmittingReconcile(true);
    try {
      await financeApi.reconcilePayment({
        invoiceId: showReconcileModal.id,
        amount: Number(reconcileAmount),
        paymentMode: reconcileMode,
        transactionRef: reconcileRef.trim(),
        notes: reconcileNotes.trim() || undefined,
      });
      showToast('success', 'Payment reconciled and invoice balance updated.');
      setShowReconcileModal(null);
      loadInvoices();
      loadTransactions();
    } catch (err: any) {
      showToast('error', err?.message || 'Payment reconciliation failed.');
    } finally {
      setIsSubmittingReconcile(false);
    }
  };

  return (
    <div className="finance-admin-container animate-fade-in">
      {toastMsg && (
        <div className={`admin-toast ${toastMsg.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="admin-header glass-panel">
        <div>
          <div className="badge-admin">
            <Building2 size={14} />
            <span>OFFICE OF THE REGISTRAR &bull; ACCOUNTS &amp; FEE OFFICE</span>
          </div>
          <h2 className="heading-display admin-title">Institutional Finance &amp; Fee Administration</h2>
          <p className="admin-desc">
            Authorized management of student fee invoices, scholarship concessions, offline payment reconciliation, and immutable audit logs.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <PlusCircle size={16} /> Create &amp; Issue Invoice
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-subnav glass-panel">
        <div className="admin-tab-group">
          <button
            className={`admin-nav-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <Receipt size={16} /> Invoices Ledger ({totalInvoices})
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('reconciliation');
              loadInvoices();
            }}
          >
            <CreditCard size={16} /> Offline Reconciliation
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <History size={16} /> Transactions ({transactions.length})
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldAlert size={16} /> Audit Trail ({auditLogs.length})
          </button>
        </div>

        {activeTab === 'invoices' && (
          <div className="admin-filter-bar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search invoice no, term, roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
              />
            </div>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={loadInvoices}>
              <RefreshCw size={14} className={isLoadingInvoices ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: INVOICES LEDGER */}
      {activeTab === 'invoices' && (
        <div className="admin-table-container glass-panel">
          {isLoadingInvoices ? (
            <div className="admin-loading">
              <RefreshCw className="animate-spin text-accent" size={30} />
              <p>Loading invoice ledger...</p>
            </div>
          ) : invoiceError ? (
            <div className="admin-error">
              <AlertCircle size={28} className="text-danger" />
              <p>{invoiceError}</p>
              <button className="btn btn-ghost btn-sm" onClick={loadInvoices}>Retry</button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="admin-empty">
              <FileSpreadsheet size={40} className="text-muted" />
              <h4>No Invoices Found</h4>
              <p>No fee invoices match the active filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Student Details</th>
                    <th>Term &amp; Sem</th>
                    <th>Category</th>
                    <th>Subtotal</th>
                    <th>Concession</th>
                    <th>Net Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isPaid = inv.status === 'PAID';
                    const isCancelled = inv.status === 'CANCELLED';

                    return (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.invoiceNumber}</strong>
                          <div className="sub-text">Due: {inv.dueDate}</div>
                        </td>
                        <td>
                          <div className="student-name">{inv.studentName || 'Student User'}</div>
                          <code className="student-uuid">{inv.studentRollNumber || inv.studentId.slice(0, 8)}</code>
                        </td>
                        <td>{inv.academicTerm}</td>
                        <td>{inv.category}</td>
                        <td>₹{inv.subtotalAmount.toLocaleString('en-IN')}</td>
                        <td className={inv.concessionAmount > 0 ? 'text-success' : ''}>
                          {inv.concessionAmount > 0 ? `-₹${inv.concessionAmount.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td><strong>₹{inv.totalAmount.toLocaleString('en-IN')}</strong></td>
                        <td className="text-success">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                        <td style={{ color: inv.outstandingBalance > 0 ? 'var(--amber-400)' : 'var(--emerald-400)' }}>
                          <strong>₹{inv.outstandingBalance.toLocaleString('en-IN')}</strong>
                        </td>
                        <td>
                          <span className={`badge ${
                            isPaid ? 'badge-success' : isCancelled ? 'badge-secondary' : 'badge-warning'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-button-group">
                            {!isPaid && !isCancelled && (
                              <>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  title="Reconcile Payment"
                                  onClick={() => {
                                    setShowReconcileModal(inv);
                                    setReconcileAmount(inv.outstandingBalance);
                                  }}
                                >
                                  <CreditCard size={12} /> Pay
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  title="Apply Concession"
                                  onClick={() => {
                                    setShowAdjustModal(inv);
                                    setAdjustAmount(inv.concessionAmount || 0);
                                    setAdjustReason(inv.concessionReason || '');
                                  }}
                                >
                                  <Percent size={12} /> Concession
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs text-danger"
                                  title="Cancel Invoice"
                                  onClick={() => {
                                    setShowCancelModal(inv);
                                    setCancelReason('');
                                  }}
                                >
                                  <XCircle size={12} /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFLINE RECONCILIATION SHORTCUT */}
      {activeTab === 'reconciliation' && (
        <div className="reconciliation-panel glass-panel">
          <div className="section-head">
            <h3 className="heading-display">Quick Offline Payment Reconciliation</h3>
            <p>Select an outstanding invoice below to record bank transfers (NEFT/RTGS), Challans, or Cashier Counter collections.</p>
          </div>

          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Balance Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.outstandingBalance > 0 && i.status !== 'CANCELLED').map(inv => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.studentName || inv.studentRollNumber || inv.studentId.slice(0, 8)}</td>
                    <td>{inv.category}</td>
                    <td>₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="text-warning"><strong>₹{inv.outstandingBalance.toLocaleString('en-IN')}</strong></td>
                    <td>
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          setShowReconcileModal(inv);
                          setReconcileAmount(inv.outstandingBalance);
                        }}
                      >
                        <CreditCard size={12} /> Reconcile Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="admin-table-container glass-panel">
          {isLoadingTxs ? (
            <div className="admin-loading">
              <RefreshCw className="animate-spin text-accent" size={30} />
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="admin-empty">
              <History size={40} className="text-muted" />
              <h4>No Transactions</h4>
              <p>No financial transactions recorded.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction Ref / UTR</th>
                    <th>Invoice No</th>
                    <th>Payment Mode</th>
                    <th>Amount</th>
                    <th>Receipt No</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                      <td><code>{tx.transactionRef}</code></td>
                      <td>{tx.invoiceNumber}</td>
                      <td>{tx.paymentMode}</td>
                      <td><strong>₹{tx.amount.toLocaleString('en-IN')}</strong></td>
                      <td>{tx.receiptNumber || '—'}</td>
                      <td>
                        <span className={`badge ${
                          tx.status === 'SUCCESS' ? 'badge-success' : tx.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>{tx.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="admin-table-container glass-panel">
          {isLoadingAudit ? (
            <div className="admin-loading">
              <RefreshCw className="animate-spin text-accent" size={30} />
              <p>Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="admin-empty">
              <ShieldAlert size={40} className="text-muted" />
              <h4>No Audit Logs</h4>
              <p>No administrative financial actions recorded yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Administrator</th>
                    <th>Invoice / Target</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td>
                        <span className="audit-action-pill">{log.action}</span>
                      </td>
                      <td>
                        <div><strong>{log.performedBy.fullName}</strong></div>
                        <div className="sub-text">{log.performedBy.email} ({log.performedBy.role})</div>
                      </td>
                      <td>{log.invoiceId ? <code className="student-uuid">{log.invoiceId.slice(0, 8)}</code> : '—'}</td>
                      <td>{log.ipAddress || 'Internal'}</td>
                      <td>
                        <pre className="audit-details-json">
                          {log.details ? JSON.stringify(log.details, null, 1) : '—'}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE & ISSUE INVOICE */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <PlusCircle size={22} className="text-accent" />
                <h3>Create &amp; Issue Student Fee Invoice</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Student User UUID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. a0000000-0000-4000-8000-000000000001"
                    value={createForm.studentId}
                    onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Academic Term *</label>
                    <input
                      type="text"
                      required
                      value={createForm.academicTerm}
                      onChange={(e) => setCreateForm({ ...createForm, academicTerm: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Academic Year</label>
                    <input
                      type="text"
                      value={createForm.academicYear}
                      onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={createForm.semester}
                      onChange={(e) => setCreateForm({ ...createForm, semester: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fee Category *</label>
                    <input
                      type="text"
                      required
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      required
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items Dynamic Builder */}
                <div className="line-items-section">
                  <div className="line-items-head">
                    <label>Line Items (Breakdown) *</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setCreateForm({
                        ...createForm,
                        items: [...createForm.items, { description: 'Fee Component', amount: 10000 }]
                      })}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  {createForm.items.map((item, index) => (
                    <div key={index} className="line-item-row">
                      <input
                        type="text"
                        placeholder="Description (e.g. Tuition Fee)"
                        required
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...createForm.items];
                          newItems[index].description = e.target.value;
                          setCreateForm({ ...createForm, items: newItems });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        min={0}
                        required
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...createForm.items];
                          newItems[index].amount = Number(e.target.value);
                          setCreateForm({ ...createForm, items: newItems });
                        }}
                      />
                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => {
                            const newItems = createForm.items.filter((_, i) => i !== index);
                            setCreateForm({ ...createForm, items: newItems });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Concession / Adjustment */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Scholarship / Concession (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.concessionAmount}
                      onChange={(e) => setCreateForm({ ...createForm, concessionAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Concession Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Merit Scholarship"
                      value={createForm.concessionReason}
                      onChange={(e) => setCreateForm({ ...createForm, concessionReason: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCreate}>
                  {isSubmittingCreate ? 'Issuing...' : 'Create & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST CONCESSION */}
      {showAdjustModal && (
        <div className="modal-backdrop" onClick={() => setShowAdjustModal(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Percent size={20} className="text-accent" />
                <h3>Apply Fee Concession / Adjustment</h3>
              </div>
              <button className="close-btn" onClick={() => setShowAdjustModal(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <p className="modal-sub">
                  Invoice: <strong>{showAdjustModal.invoiceNumber}</strong> (Subtotal: ₹{showAdjustModal.subtotalAmount.toLocaleString('en-IN')})
                </p>

                <div className="form-group">
                  <label>Concession Amount (INR) *</label>
                  <input
                    type="number"
                    min={0}
                    max={showAdjustModal.subtotalAmount}
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Official Reason / Approval Memo *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Dean Merit Scholarship approval memo #DBS/MS/2026/04"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdjustModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingAdjust}>
                  {isSubmittingAdjust ? 'Applying...' : 'Apply Concession'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL INVOICE */}
      {showCancelModal && (
        <div className="modal-backdrop" onClick={() => setShowCancelModal(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <XCircle size={20} className="text-danger" />
                <h3>Cancel Invoice: {showCancelModal.invoiceNumber}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCancelModal(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCancelSubmit}>
              <div className="modal-body">
                <div className="cancel-warning-box">
                  <AlertCircle size={20} className="text-warning" />
                  <div>
                    <strong>Irreversible Financial Action:</strong>
                    <p>Invoices with confirmed payments cannot be cancelled. Cancelling will close this invoice with zero balance due.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cancellation Reason *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Duplicate invoice issued in error / Student course withdrawal"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCancelModal(null)}>
                  Keep Invoice
                </button>
                <button type="submit" className="btn btn-primary btn-danger-solid" disabled={isSubmittingCancel}>
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Invoice Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: OFFLINE PAYMENT RECONCILIATION */}
      {showReconcileModal && (
        <div className="modal-backdrop" onClick={() => setShowReconcileModal(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <CreditCard size={20} className="text-accent" />
                <h3>Reconcile Payment for {showReconcileModal.invoiceNumber}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowReconcileModal(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReconcileSubmit}>
              <div className="modal-body">
                <div className="reconcile-info-grid">
                  <div>
                    <span className="grid-label">Total Invoice:</span>
                    <strong>₹{showReconcileModal.totalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="grid-label">Outstanding Balance:</span>
                    <strong className="text-warning">₹{showReconcileModal.outstandingBalance.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount Received (INR) *</label>
                    <input
                      type="number"
                      min={1}
                      max={showReconcileModal.outstandingBalance}
                      required
                      value={reconcileAmount}
                      onChange={(e) => setReconcileAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Mode *</label>
                    <select
                      className="admin-select"
                      style={{ width: '100%', height: '42px' }}
                      value={reconcileMode}
                      onChange={(e) => setReconcileMode(e.target.value)}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                      <option value="CHALLAN">Bank Challan</option>
                      <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
                      <option value="POS_COUNTER">Campus Cashier POS / Cash</option>
                      <option value="UPI">Direct UPI / QR</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Transaction Reference / Bank UTR / Challan No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTR-HDFC9842710492"
                    value={reconcileRef}
                    onChange={(e) => setReconcileRef(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Auditing Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Student presented challan copy; UTR to be audited against monthly bank statement"
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                  />
                  <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    Note: Manual offline entries are marked as <code>MANUAL_STAFF_ENTRY</code> and logged in the append-only audit trail pending bank statement audit.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReconcileModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingReconcile}>
                  {isSubmittingReconcile ? 'Recording...' : 'Reconcile & Update Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scoped CSS Styles for Finance Admin */}
      <style>{`
        .finance-admin-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1100;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          font-size: 0.88rem;
        }

        .toast-success {
          background: #064e3b;
          border: 1px solid #10b981;
          color: white;
        }

        .toast-error {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-radius: var(--radius-lg);
          gap: 16px;
          flex-wrap: wrap;
        }

        .badge-admin {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: #d8b4fe;
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 8px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .admin-title {
          font-size: 1.5rem;
          margin-bottom: 6px;
          color: white;
        }

        .admin-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          max-width: 800px;
        }

        .admin-subnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          gap: 16px;
          flex-wrap: wrap;
        }

        .admin-tab-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-nav-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .admin-nav-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .admin-nav-btn.active {
          background: var(--purple-primary);
          color: white;
          border-color: var(--purple-light);
        }

        .admin-filter-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-secondary);
        }

        .search-box input {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          padding: 6px 12px 6px 32px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          width: 220px;
        }

        .admin-select {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .admin-table-container {
          padding: 20px;
          border-radius: var(--radius-lg);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .admin-table th {
          text-align: left;
          padding: 10px 12px;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
        }

        .admin-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #e2e8f0;
          vertical-align: middle;
        }

        .sub-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .student-name {
          font-weight: 600;
          color: white;
        }

        .student-uuid {
          background: rgba(0, 0, 0, 0.3);
          padding: 1px 4px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .action-button-group {
          display: flex;
          gap: 4px;
        }

        .btn-xs {
          padding: 3px 8px;
          font-size: 0.75rem;
          border-radius: 4px;
        }

        .audit-action-pill {
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #d8b4fe;
          font-weight: 600;
        }

        .audit-details-json {
          background: rgba(0, 0, 0, 0.4);
          padding: 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.72rem;
          color: #94a3b8;
          max-width: 300px;
          overflow-x: auto;
          white-space: pre-wrap;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .form-group label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .line-items-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 14px;
        }

        .line-items-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .line-item-row {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }

        .line-item-row input:first-child {
          flex: 2;
        }

        .line-item-row input:nth-child(2) {
          flex: 1;
        }

        .btn-remove-item {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 6px;
        }

        .btn-danger-solid {
          background: #ef4444;
          border-color: #ef4444;
        }

        .btn-danger-solid:hover {
          background: #dc2626;
        }

        .cancel-warning-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 12px;
          border-radius: var(--radius-md);
          display: flex;
          gap: 10px;
          color: #fca5a5;
          font-size: 0.85rem;
          margin-bottom: 14px;
        }

        .reconcile-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 14px;
          font-size: 0.88rem;
        }

        .admin-loading, .admin-error, .admin-empty {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
