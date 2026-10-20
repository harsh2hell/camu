import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Receipt, 
  FileCheck2, 
  Building2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Printer,
  History,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { 
  financeApi, 
  type InitiatePaymentResponse 
} from '../api/finance';
import type { 
  FeeInvoiceDTO, 
  FeeTransactionDTO, 
  StudentFeeLedgerDTO, 
  PaymentReceiptDTO 
} from '../../server/src/types/finance';

export const FeeReceiptsView: React.FC = () => {
  // Ledger and invoice state
  const [ledger, setLedger] = useState<StudentFeeLedgerDTO | null>(null);
  const [invoices, setInvoices] = useState<FeeInvoiceDTO[]>([]);
  const [transactions, setTransactions] = useState<FeeTransactionDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'transactions'>('invoices');
  
  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoiceDTO | null>(null);
  const [receiptData, setReceiptData] = useState<PaymentReceiptDTO | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<boolean>(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<InitiatePaymentResponse | null>(null);
  const [isAttemptingPay, setIsAttemptingPay] = useState<boolean>(false);
  const [noDuesModal, setNoDuesModal] = useState<boolean>(false);

  const loadFeeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgerData, txData] = await Promise.all([
        financeApi.getStudentLedger(),
        financeApi.getStudentTransactions(),
      ]);
      setLedger(ledgerData);
      setInvoices(ledgerData.invoices || []);
      setTransactions(txData || []);
    } catch (err: any) {
      console.error('Failed to load fee ledger:', err);
      setError(err?.message || 'Unable to connect to the University Finance Service. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeeData();
  }, [loadFeeData]);

  // Handle viewing confirmed receipt
  const handleOpenReceipt = async (receiptIdOrTxId: string) => {
    setReceiptLoading(true);
    setReceiptError(null);
    setReceiptData(null);
    try {
      const receipt = await financeApi.getStudentReceipt(receiptIdOrTxId);
      setReceiptData(receipt);
    } catch (err: any) {
      console.error('Receipt download error:', err);
      setReceiptError(err?.message || 'Failed to generate digital receipt.');
    } finally {
      setReceiptLoading(false);
    }
  };

  // Handle payment attempt - strictly does NOT simulate payment
  const handleInitiatePayment = async (invoice: FeeInvoiceDTO) => {
    setIsAttemptingPay(true);
    try {
      const response = await financeApi.initiatePayment({
        invoiceId: invoice.id,
        amount: invoice.outstandingBalance,
      });
      setPaymentAttempt(response);
      // Refresh transactions to show recorded pending attempt
      const updatedTxs = await financeApi.getStudentTransactions();
      setTransactions(updatedTxs);
    } catch (err: any) {
      alert(`Payment initiation failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsAttemptingPay(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'ALL') return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="fees-container animate-fade-in">
      {/* Top Banner */}
      <div className="fees-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Fee Ledger &amp; Financial Clearance</h2>
          <p className="page-desc">
            Official DBS Global University student fee ledger, itemized invoices, payment transactions, and cryptographically verified digital receipts.
          </p>
        </div>

        <button 
          className="btn btn-ghost"
          disabled={isLoading || !ledger}
          onClick={() => setNoDuesModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <FileCheck2 size={16} className="text-accent" /> No-Dues Clearance Status
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fee-loading-state glass-panel">
          <RefreshCw className="animate-spin text-accent" size={32} />
          <p>Loading authenticated fee ledger from DBS Finance Office...</p>
        </div>
      )}

      {/* Error State with Retry */}
      {error && !isLoading && (
        <div className="fee-error-state glass-panel">
          <AlertCircle size={36} className="text-danger" />
          <div className="fee-error-content">
            <h4>Failed to Load Financial Records</h4>
            <p>{error}</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadFeeData}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Financial KPI Cards */}
      {!isLoading && !error && ledger && (
        <div className="fee-kpis">
          <div className="glass-panel fee-kpi-card">
            <span className="fee-kpi-label">Total Invoiced (Academic)</span>
            <div className="fee-kpi-val heading-display text-white">
              ₹{ledger.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="fee-kpi-sub">
              {ledger.totalConcessions > 0 
                ? `Includes ₹${ledger.totalConcessions.toLocaleString('en-IN')} scholarship/concession`
                : 'All billed terms & courses'}
            </span>
          </div>

          <div className="glass-panel fee-kpi-card">
            <span className="fee-kpi-label">Total Confirmed Payments</span>
            <div className="fee-kpi-val heading-display text-success">
              ₹{ledger.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="fee-kpi-sub">
              <CheckCircle2 size={13} /> Recorded &amp; Cleared by Accounts
            </span>
          </div>

          <div className="glass-panel fee-kpi-card">
            <span className="fee-kpi-label">Outstanding Balance Due</span>
            <div className={`fee-kpi-val heading-display ${ledger.totalOutstanding > 0 ? 'text-accent' : 'text-success'}`}>
              ₹{ledger.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="fee-kpi-sub">
              {ledger.totalOutstanding > 0 
                ? 'Payment required for exam hall ticket clearance' 
                : 'All dues cleared'}
            </span>
          </div>

          <div className="glass-panel fee-kpi-card">
            <span className="fee-kpi-label">Exam Clearance Status</span>
            <div 
              className="fee-kpi-val heading-display" 
              style={{ 
                fontSize: '1.25rem', 
                color: ledger.noDuesStatus === 'CLEARED' ? 'var(--emerald-400)' : 'var(--amber-400)' 
              }}
            >
              {ledger.noDuesStatus === 'CLEARED' ? 'PROVISIONALLY CLEARED' : 'PENDING DUES'}
            </div>
            <span className="fee-kpi-sub">Office of the Registrar &bull; DBS</span>
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      {!isLoading && !error && (
        <div className="fees-subnav glass-panel">
          <div className="subnav-buttons">
            <button
              className={`subnav-btn ${activeSubTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('invoices')}
            >
              <Receipt size={16} /> Academic Invoices ({invoices.length})
            </button>
            <button
              className={`subnav-btn ${activeSubTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('transactions')}
            >
              <History size={16} /> Payment Transactions ({transactions.length})
            </button>
          </div>

          {activeSubTab === 'invoices' && (
            <div className="filter-group">
              <span className="filter-label">Status:</span>
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Invoices</option>
                <option value="ISSUED">Issued</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 1: INVOICES LIST */}
      {!isLoading && !error && activeSubTab === 'invoices' && (
        <div className="invoices-list">
          {filteredInvoices.length === 0 ? (
            <div className="empty-state glass-panel">
              <FileSpreadsheet size={48} className="text-muted" />
              <h4>No Invoices Found</h4>
              <p>There are no fee invoices matching the selected filter criteria.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isPaid = inv.status === 'PAID';
              const isCancelled = inv.status === 'CANCELLED';
              const isPartial = inv.status === 'PARTIALLY_PAID';

              let badgeClass = 'badge-warning';
              let badgeText: string = inv.status;
              if (isPaid) {
                badgeClass = 'badge-success';
                badgeText = 'PAID & CLEARED';
              } else if (isCancelled) {
                badgeClass = 'badge-secondary';
                badgeText = 'CANCELLED';
              } else if (isPartial) {
                badgeClass = 'badge-info';
                badgeText = 'PARTIALLY PAID';
              } else if (inv.status === 'OVERDUE') {
                badgeClass = 'badge-danger';
                badgeText = 'OVERDUE';
              }

              return (
                <div key={inv.id} className="invoice-card glass-panel">
                  <div className="inv-left">
                    <div className="inv-icon-wrap">
                      <Receipt size={22} className="text-accent" />
                    </div>
                    <div>
                      <div className="inv-number-row">
                        <span className="inv-no">{inv.invoiceNumber}</span>
                        <span className="inv-term">{inv.academicTerm}</span>
                        <span className="inv-term">Sem {inv.semester} ({inv.academicYear})</span>
                      </div>
                      <h4 className="inv-category">{inv.category}</h4>
                      {inv.description && <p className="inv-desc">{inv.description}</p>}
                      <div className="inv-meta">
                        <span>Issued: {inv.issueDate}</span>
                        <span className="meta-sep">&bull;</span>
                        <span className={inv.outstandingBalance > 0 ? 'text-accent' : ''}>
                          Due Date: <strong>{inv.dueDate}</strong>
                        </span>
                        {inv.concessionAmount > 0 && (
                          <>
                            <span className="meta-sep">&bull;</span>
                            <span className="text-success">
                              Concession: ₹{inv.concessionAmount.toLocaleString('en-IN')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="inv-right">
                    <div className="inv-amount-block">
                      <div className="inv-amount heading-display">
                        ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="inv-balance-info">
                        {inv.outstandingBalance > 0 ? (
                          <span className="text-warning">
                            Balance Due: ₹{inv.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-success">
                            Paid in Full (₹{inv.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                          </span>
                        )}
                      </div>
                      <span className={`badge ${badgeClass}`}>{badgeText}</span>
                    </div>

                    <div className="inv-actions">
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedInvoice(inv)}
                        title="View Line Items and Details"
                      >
                        <Eye size={14} /> View Details ({inv.items.length} items)
                      </button>

                      {isPaid && inv.transactions.find((t) => t.status === 'SUCCESS') && (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            const successfulTx = inv.transactions.find((t) => t.status === 'SUCCESS');
                            if (successfulTx) handleOpenReceipt(successfulTx.id);
                          }}
                        >
                          <Download size={14} /> Receipt
                        </button>
                      )}

                      {!isPaid && !isCancelled && inv.outstandingBalance > 0 && (
                        <button 
                          className="btn btn-primary btn-sm"
                          disabled={isAttemptingPay}
                          onClick={() => handleInitiatePayment(inv)}
                        >
                          <CreditCard size={14} /> Pay ₹{inv.outstandingBalance.toLocaleString('en-IN')} Online
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-VIEW 2: PAYMENT TRANSACTIONS HISTORY */}
      {!isLoading && !error && activeSubTab === 'transactions' && (
        <div className="transactions-list glass-panel">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <History size={48} className="text-muted" />
              <h4>No Transactions Recorded</h4>
              <p>You have not made any fee payments or reconciliation records yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction Ref / UTR</th>
                    <th>Invoice No</th>
                    <th>Payment Mode</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isSuccess = tx.status === 'SUCCESS';
                    const isPending = tx.status === 'PENDING';

                    return (
                      <tr key={tx.id}>
                        <td>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <code className="tx-ref-code">{tx.transactionRef}</code>
                        </td>
                        <td>{tx.invoiceNumber}</td>
                        <td>
                          <span className="mode-pill">{tx.paymentMode.replace(/_/g, ' ')}</span>
                        </td>
                        <td>
                          <strong>₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </td>
                        <td>
                          <span 
                            className={`badge ${
                              isSuccess ? 'badge-success' : isPending ? 'badge-warning' : 'badge-danger'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          {isSuccess ? (
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleOpenReceipt(tx.id)}
                            >
                              <Download size={13} /> {tx.receiptNumber || 'Receipt'}
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {isPending ? 'Pending Verification' : 'N/A'}
                            </span>
                          )}
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

      {/* MODAL 1: INVOICE DETAILS & LINE ITEMS */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Receipt size={24} className="text-accent" />
                <div>
                  <h3 className="heading-display">Invoice Details: {selectedInvoice.invoiceNumber}</h3>
                  <p className="modal-sub">
                    {selectedInvoice.category} &bull; {selectedInvoice.academicTerm} &bull; Sem {selectedInvoice.semester} ({selectedInvoice.academicYear})
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Itemized Line Items Table */}
              <h4 className="breakdown-title">Itemized Fee Breakdown</h4>
              <div className="table-responsive">
                <table className="fee-table line-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fee Component Description</th>
                      <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td>{item.description}</td>
                        <td style={{ textAlign: 'right' }}>
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{selectedInvoice.subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {selectedInvoice.concessionAmount > 0 && (
                      <tr className="concession-row">
                        <td colSpan={2} style={{ textAlign: 'right', color: 'var(--emerald-400)' }}>
                          Fee Concession / Scholarship ({selectedInvoice.concessionReason || 'Approved'}):
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--emerald-400)' }}>
                          - ₹{selectedInvoice.concessionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                    <tr className="total-highlight-row">
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>
                        Net Payable Amount:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>
                        ₹{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'right', color: 'var(--emerald-400)' }}>
                        Amount Confirmed Paid:
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--emerald-400)' }}>
                        ₹{selectedInvoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="balance-highlight-row">
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>
                        Outstanding Balance:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: selectedInvoice.outstandingBalance > 0 ? 'var(--amber-400)' : 'var(--emerald-400)' }}>
                        ₹{selectedInvoice.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Transactions attached to this invoice */}
              {selectedInvoice.transactions.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 className="breakdown-title">Associated Transactions</h4>
                  <div className="table-responsive">
                    <table className="fee-table">
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Mode</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.transactions.map((t) => (
                          <tr key={t.id}>
                            <td><code>{t.transactionRef}</code></td>
                            <td>{t.paymentMode}</td>
                            <td>₹{t.amount.toLocaleString('en-IN')}</td>
                            <td><span className={`badge ${t.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span></td>
                            <td>{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
              {selectedInvoice.outstandingBalance > 0 && selectedInvoice.status !== 'CANCELLED' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    handleInitiatePayment(inv);
                  }}
                >
                  <CreditCard size={15} /> Proceed to Pay ₹{selectedInvoice.outstandingBalance.toLocaleString('en-IN')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STRICT UNCONFIGURED PAYMENT GATEWAY NOTICE */}
      {paymentAttempt && (
        <div className="modal-backdrop" onClick={() => setPaymentAttempt(null)}>
          <div className="modal-content payment-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Info size={24} className="text-accent" />
                <div>
                  <h3 className="heading-display">Payment Attempt Recorded</h3>
                  <p className="modal-sub">Transaction Reference: <code>{paymentAttempt.transactionRef}</code></p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setPaymentAttempt(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="unconfigured-warning-box">
                <AlertCircle size={22} className="text-warning" />
                <div>
                  <strong>Online Payment Processing Not Configured</strong>
                  <p>
                    {paymentAttempt.message}
                  </p>
                </div>
              </div>

              <div className="payment-instructions-box">
                <h4 className="box-title">Offline &amp; Bank Transfer Reconciliation Instructions:</h4>
                <div className="instructions-content">
                  <pre>{paymentAttempt.reconciliationInstructions}</pre>
                </div>
              </div>

              <div className="attempt-summary-grid">
                <div className="grid-item">
                  <span className="grid-label">Amount:</span>
                  <strong>₹{paymentAttempt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Status:</span>
                  <span className="badge badge-warning">{paymentAttempt.status}</span>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Gateway Provider:</span>
                  <span>{paymentAttempt.gatewayProvider}</span>
                </div>
                <div className="grid-item">
                  <span className="grid-label">Recorded In:</span>
                  <span>Student Fee Transaction Ledger</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setPaymentAttempt(null)}>
                Acknowledge &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DIGITALLY SIGNED OFFICIAL RECEIPT */}
      {(receiptData || receiptLoading || receiptError) && (
        <div 
          className="modal-backdrop" 
          onClick={() => {
            setReceiptData(null);
            setReceiptLoading(false);
            setReceiptError(null);
          }}
        >
          <div className="modal-content receipt-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            {receiptLoading && (
              <div className="receipt-loading">
                <RefreshCw className="animate-spin text-accent" size={32} />
                <p>Generating cryptographically signed university receipt...</p>
              </div>
            )}

            {receiptError && (
              <div className="receipt-error">
                <AlertCircle size={32} className="text-danger" />
                <h4>Receipt Unavailable</h4>
                <p>{receiptError}</p>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => {
                    setReceiptData(null);
                    setReceiptError(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {receiptData && (
              <>
                <div className="receipt-header">
                  <div className="receipt-brand">
                    <Building2 size={32} className="text-accent" />
                    <div>
                      <h3 className="heading-display">DBS GLOBAL UNIVERSITY</h3>
                      <div className="receipt-sub">Dehradun, Uttarakhand &bull; Office of the Registrar / Accounts Office</div>
                    </div>
                  </div>
                  <button 
                    className="close-btn no-print" 
                    onClick={() => setReceiptData(null)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="receipt-stamp-box">
                  <ShieldCheck size={20} className="text-success" />
                  <span>OFFICIAL DIGITAL UNIVERSITY PAYMENT RECEIPT</span>
                </div>

                <div className="receipt-details-grid">
                  <div className="receipt-line">
                    <span className="line-label">Receipt Number:</span>
                    <strong className="receipt-val">{receiptData.receiptNumber}</strong>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Student Name:</span>
                    <strong className="receipt-val">{receiptData.studentName}</strong>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Roll Number:</span>
                    <span>{receiptData.studentRollNumber}</span>
                  </div>
                  {receiptData.studentRegistrationNo && (
                    <div className="receipt-line">
                      <span className="line-label">Registration No:</span>
                      <span>{receiptData.studentRegistrationNo}</span>
                    </div>
                  )}
                  <div className="receipt-line">
                    <span className="line-label">Program:</span>
                    <span>{receiptData.programName || 'Undergraduate Degree'}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Academic Term:</span>
                    <span>{receiptData.academicTerm}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Invoice Number:</span>
                    <span>{receiptData.invoiceNumber}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Fee Category:</span>
                    <span>{receiptData.category}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Payment Mode:</span>
                    <span>{receiptData.paymentMode.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Transaction Reference:</span>
                    <code>{receiptData.transactionRef}</code>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Payment Timestamp:</span>
                    <span>{new Date(receiptData.paidAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="receipt-line total-line">
                    <span className="line-label">Amount Cleared:</span>
                    <strong className="text-success" style={{ fontSize: '1.2rem' }}>
                      ₹{receiptData.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="receipt-line">
                    <span className="line-label">Remaining Invoice Balance:</span>
                    <span>₹{receiptData.remainingInvoiceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Digital Verification Seal */}
                <div className="receipt-verification-seal">
                  <div className="seal-info">
                    <span className="seal-title">HMAC Cryptographic Verification Hash (Key: {receiptData.keyVersion || 'v1'}):</span>
                    <code className="seal-hash">{receiptData.verificationHash}</code>
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Audit Status:</strong> {receiptData.verificationClaim || 'Staff-Recorded Offline Reference (Pending Bank Statement Audit)'}
                    </div>
                    <span className="seal-issuer">{receiptData.issuedBy}</span>
                  </div>
                </div>

                <div className="receipt-footer-actions no-print">
                  <button 
                    className="btn btn-ghost"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> Print Receipt
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      window.print();
                    }}
                  >
                    <Download size={16} /> Save Official PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: NO DUES CLEARANCE CERTIFICATE */}
      {noDuesModal && ledger && (
        <div className="modal-backdrop" onClick={() => setNoDuesModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <FileCheck2 size={24} className="text-accent" />
                <div>
                  <h3 className="heading-display">No-Dues Clearance Status</h3>
                  <p className="modal-sub">DBS Global University &bull; Controller of Examinations</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setNoDuesModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {ledger.noDuesStatus === 'CLEARED' ? (
                <div className="no-dues-status-cleared">
                  <ShieldCheck size={48} className="text-success" />
                  <h4>NO DUES CERTIFICATE ISSUED</h4>
                  <p>
                    All academic, tuition, and university fees for the current academic session have been fully verified and cleared.
                  </p>
                  <div className="no-dues-details-box">
                    <div><strong>Clearance Date:</strong> {new Date(ledger.invoices[0]?.updatedAt || '2026-10-20').toLocaleDateString('en-IN')}</div>
                    <div><strong>Outstanding Dues:</strong> ₹0.00</div>
                    <div><strong>Eligibility:</strong> Cleared for End-Semester Examination Hall Ticket</div>
                  </div>
                </div>
              ) : (
                <div className="no-dues-status-pending">
                  <AlertCircle size={48} className="text-warning" />
                  <h4>CLEARANCE PENDING: OUTSTANDING DUES REMAIN</h4>
                  <p>
                    Your student fee ledger reflects an outstanding balance of{' '}
                    <strong>₹{ledger.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.
                  </p>
                  <div className="no-dues-details-box">
                    <div><strong>Active Invoices with Dues:</strong> {ledger.activeInvoicesCount}</div>
                    <div><strong>Required Action:</strong> Clear outstanding invoices before the examination deadline to enable hall ticket generation.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setNoDuesModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS Styles for Fees & Finance */}
      <style>{`
        .fees-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .fees-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-radius: var(--radius-lg);
          gap: 16px;
          flex-wrap: wrap;
        }

        .page-title {
          font-size: 1.5rem;
          margin-bottom: 6px;
          color: white;
        }

        .page-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          max-width: 800px;
        }

        .fee-loading-state,
        .fee-error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px;
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .fee-error-state {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .fee-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .fee-kpi-card {
          padding: 20px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fee-kpi-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .fee-kpi-val {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .fee-kpi-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fees-subnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          gap: 16px;
          flex-wrap: wrap;
        }

        .subnav-buttons {
          display: flex;
          gap: 10px;
        }

        .subnav-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .subnav-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .subnav-btn.active {
          background: var(--purple-primary);
          color: white;
          border-color: var(--purple-light);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .filter-select {
          background: #0f172a;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .invoices-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .invoice-card {
          padding: 22px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .inv-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
          min-width: 300px;
        }

        .inv-icon-wrap {
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 12px;
          border-radius: var(--radius-md);
        }

        .inv-number-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .inv-no {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          font-family: monospace;
        }

        .inv-term {
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 8px;
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .inv-category {
          font-size: 1.15rem;
          font-weight: 600;
          color: white;
          margin: 2px 0 6px;
        }

        .inv-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .inv-meta {
          font-size: 0.82rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-sep {
          color: rgba(255, 255, 255, 0.2);
        }

        .inv-right {
          display: flex;
          align-items: flex-end;
          flex-direction: column;
          gap: 12px;
        }

        .inv-amount-block {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .inv-amount {
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
        }

        .inv-balance-info {
          font-size: 0.85rem;
        }

        .inv-actions {
          display: flex;
          gap: 8px;
        }

        .fee-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }

        .fee-table th {
          text-align: left;
          padding: 10px 12px;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 600;
        }

        .fee-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #e2e8f0;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .tx-ref-code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.82rem;
          color: #38bdf8;
        }

        .mode-pill {
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: #0b132b;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-lg);
          max-width: 680px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .close-btn:hover {
          color: white;
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .breakdown-title {
          font-size: 0.95rem;
          color: white;
          margin-bottom: 8px;
        }

        .line-items-table tfoot td {
          border-bottom: none;
          padding: 6px 12px;
        }

        .total-highlight-row td {
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }

        .unconfigured-warning-box {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          gap: 12px;
          align-items: flex-start;
          color: #fef3c7;
          font-size: 0.88rem;
        }

        .payment-instructions-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .box-title {
          font-size: 0.9rem;
          margin-bottom: 10px;
          color: white;
        }

        .instructions-content pre {
          font-family: inherit;
          font-size: 0.82rem;
          color: #cbd5e1;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .attempt-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .grid-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .grid-label {
          color: var(--text-secondary);
          font-size: 0.78rem;
        }

        /* Official Receipt Modal Styles */
        .receipt-modal {
          max-width: 620px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .receipt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .receipt-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .receipt-brand h3 {
          font-size: 1.15rem;
          letter-spacing: 0.04em;
          color: white;
        }

        .receipt-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .receipt-stamp-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border-top: 1px solid rgba(16, 185, 129, 0.2);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          padding: 8px 16px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--emerald-400);
        }

        .receipt-details-grid {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.88rem;
        }

        .receipt-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        }

        .line-label {
          color: var(--text-secondary);
        }

        .receipt-val {
          color: white;
        }

        .receipt-verification-seal {
          margin: 0 24px 20px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
        }

        .seal-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
        }

        .seal-title {
          color: var(--text-secondary);
          font-weight: 600;
        }

        .seal-hash {
          font-family: monospace;
          color: #a855f7;
          word-break: break-all;
        }

        .seal-issuer {
          color: #94a3b8;
          font-style: italic;
        }

        .receipt-footer-actions {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .no-dues-status-cleared,
        .no-dues-status-pending {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 20px;
        }

        .no-dues-details-box {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: var(--radius-md);
          width: 100%;
          text-align: left;
          font-size: 0.88rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-modal, .receipt-modal * {
            visibility: visible;
          }
          .receipt-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
