import { useState } from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  FileCheck2, 
  Building2,
  ShieldCheck
} from 'lucide-react';
import { MOCK_FEE_INVOICES, type FeeInvoice } from '../data/mockData';

export const FeeReceiptsView: React.FC = () => {
  const [invoices, setInvoices] = useState<FeeInvoice[]>(MOCK_FEE_INVOICES);
  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const totalPaid = invoices.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const totalDue = invoices.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);

  const handlePayNow = (id: string, amount: number) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      return {
        ...inv,
        paidAmount: inv.totalAmount,
        status: 'PAID',
        receiptDate: 'Today',
        transactionRef: `UPI_PAY_${Math.floor(10000000 + Math.random() * 90000000)}`
      };
    }));

    setToastMsg(`₹${amount.toLocaleString('en-IN')} paid successfully! Fee receipt generated.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="fees-container animate-fade-in">
      {toastMsg && (
        <div className="toast-notification">
          <CheckCircle2 size={18} className="text-success" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="fees-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Fee Ledger & No-Dues Clearance</h2>
          <p className="page-desc">
            Direct fee payment receipts, installment schedules, and automated examination clearance certificates.
          </p>
        </div>

        <button 
          className="btn btn-ghost"
          onClick={() => {
            alert('Official "No Dues Certificate" generated. Your account is cleared for Exam Hall Ticket issuance!');
          }}
        >
          <FileCheck2 size={16} className="text-accent" /> Generate No-Dues Certificate
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="fee-kpis">
        <div className="glass-panel fee-kpi-card">
          <span className="fee-kpi-label">Total Fees Cleared (2026-27)</span>
          <div className="fee-kpi-val heading-display text-success">
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <span className="fee-kpi-sub"><CheckCircle2 size={13} /> Tuition & Hostel Verified</span>
        </div>

        <div className="glass-panel fee-kpi-card">
          <span className="fee-kpi-label">Outstanding Balance</span>
          <div className={`fee-kpi-val heading-display ${totalDue > 0 ? 'text-accent' : 'text-success'}`}>
            ₹{totalDue.toLocaleString('en-IN')}
          </div>
          <span className="fee-kpi-sub">
            {totalDue > 0 ? 'Due by 25 Oct 2026' : 'All accounts settled'}
          </span>
        </div>

        <div className="glass-panel fee-kpi-card">
          <span className="fee-kpi-label">Exam Clearance Status</span>
          <div className="fee-kpi-val heading-display" style={{ fontSize: '1.4rem', color: totalDue === 0 ? 'var(--emerald-400)' : 'var(--amber-400)' }}>
            {totalDue === 0 ? 'PROVISIONALLY CLEARED' : 'PENDING EXAM FEE'}
          </div>
          <span className="fee-kpi-sub">Controller of Examinations DBS</span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="section-title-wrap">
        <h3 className="heading-display section-subheading">Active Academic Invoices & Receipts</h3>
      </div>

      <div className="invoices-list">
        {invoices.map((inv) => {
          const isPaid = inv.status === 'PAID';

          return (
            <div key={inv.id} className="invoice-card glass-panel">
              <div className="inv-left">
                <div className="inv-icon-wrap">
                  <Receipt size={22} className="text-accent" />
                </div>
                <div>
                  <div className="inv-number-row">
                    <span className="inv-no">{inv.invoiceNo}</span>
                    <span className="inv-term">{inv.term}</span>
                  </div>
                  <h4 className="inv-category">{inv.category}</h4>
                  <div className="inv-meta">
                    {isPaid ? (
                      <span className="text-success">
                        <CheckCircle2 size={13} /> Paid on {inv.receiptDate} &bull; Ref: {inv.transactionRef}
                      </span>
                    ) : (
                      <span className="text-accent">
                        <Clock size={13} /> Payment Due Date: <strong>{inv.dueDate}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="inv-right">
                <div className="inv-amount-block">
                  <div className="inv-amount heading-display">
                    ₹{inv.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                    {isPaid ? 'PAID & VERIFIED' : 'PENDING'}
                  </span>
                </div>

                <div className="inv-actions">
                  {isPaid ? (
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Download size={14} /> Download Receipt (PDF)
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePayNow(inv.id, inv.totalAmount)}
                    >
                      <CreditCard size={14} /> Pay ₹{inv.totalAmount.toLocaleString('en-IN')} Online
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receipt Modal Preview */}
      {selectedInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content receipt-modal glass-panel">
            <div className="receipt-header">
              <div className="receipt-brand">
                <Building2 size={28} className="text-accent" />
                <div>
                  <h3 className="heading-display">DBS GLOBAL UNIVERSITY</h3>
                  <div className="receipt-sub">Dehradun, Uttarakhand &bull; Accounts & Fee Office</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>

            <div className="receipt-stamp-box">
              <ShieldCheck size={20} className="text-success" />
              <span>OFFICIAL DIGITAL UNIVERSITY PAYMENT RECEIPT</span>
            </div>

            <div className="receipt-details-grid">
              <div className="receipt-line">
                <span className="line-label">Receipt Number:</span>
                <strong>REC-{selectedInvoice.invoiceNo.replace(/\//g, '-')}</strong>
              </div>
              <div className="receipt-line">
                <span className="line-label">Student Name:</span>
                <strong>Harsh Vardhan (DBS/23/CSE/042)</strong>
              </div>
              <div className="receipt-line">
                <span className="line-label">Academic Term:</span>
                <span>{selectedInvoice.term}</span>
              </div>
              <div className="receipt-line">
                <span className="line-label">Description:</span>
                <span>{selectedInvoice.category}</span>
              </div>
              <div className="receipt-line">
                <span className="line-label">Payment Mode & Ref:</span>
                <span>{selectedInvoice.transactionRef}</span>
              </div>
              <div className="receipt-line total-line">
                <span className="line-label">Total Amount Cleared:</span>
                <strong className="text-success">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}.00</strong>
              </div>
            </div>

            <div className="receipt-footer-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  alert('Receipt downloaded as PDF with university digital cryptographic seal.');
                  setSelectedInvoice(null);
                }}
              >
                <Download size={16} /> Save / Print PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fees-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          background: #0f1c3d;
          border: 1px solid var(--emerald-500);
          color: white;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .fees-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .fee-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .fee-kpi-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fee-kpi-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
        }

        .fee-kpi-val {
          font-size: 2rem;
          font-weight: 800;
        }

        .fee-kpi-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .invoices-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .invoice-card {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .inv-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .inv-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(245, 158, 11, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .inv-number-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .inv-no {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--amber-400);
        }

        .inv-term {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .inv-category {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .inv-meta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .inv-right {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .inv-amount-block {
          text-align: right;
        }

        .inv-amount {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .btn-sm {
          font-size: 0.825rem;
          padding: 8px 14px;
        }

        /* Receipt Modal */
        .receipt-modal {
          max-width: 540px;
          padding: 28px;
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .receipt-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .receipt-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .receipt-stamp-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #a7f3d0;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .receipt-details-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0, 0, 0, 0.25);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .receipt-line {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .total-line {
          border-bottom: none;
          font-size: 1.1rem;
          padding-top: 8px;
        }

        .line-label {
          color: var(--text-secondary);
        }

        .receipt-footer-actions {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};
