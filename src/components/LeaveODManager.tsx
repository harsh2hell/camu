import { useState } from 'react';
import { 
  ShieldCheck, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  FileUp, 
  Calendar,
  X
} from 'lucide-react';
import { MOCK_LEAVES, type LeaveRequest } from '../data/mockData';

export const LeaveODManager: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(MOCK_LEAVES);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [leaveType, setLeaveType] = useState<'OD_HACKATHON' | 'OD_SPORTS' | 'MEDICAL' | 'CASUAL'>('OD_HACKATHON');
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState('');
  const [reason, setReason] = useState('');
  const [proofFileName, setProofFileName] = useState('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dates || !reason) return;

    const newLeave: LeaveRequest = {
      id: `LV-${Math.floor(100 + Math.random() * 900)}`,
      type: leaveType,
      title,
      dates,
      reason,
      status: 'PENDING',
      appliedOn: 'Today',
    };

    setLeaves([newLeave, ...leaves]);
    setIsModalOpen(false);
    setTitle('');
    setDates('');
    setReason('');
    setProofFileName('');
    setToastMessage('On-Duty / Leave application successfully submitted to your Faculty Mentor!');

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="leave-manager-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle2 size={18} className="text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="leave-header glass-panel">
        <div>
          <h2 className="heading-display page-title">On-Duty (OD) & Leave Portal</h2>
          <p className="page-desc">
            Direct digital workflow for hackathons, paper presentations, university sports, and medical claims.
          </p>
        </div>

        <button 
          className="btn btn-accent"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircle size={16} /> New OD / Leave Request
        </button>
      </div>

      {/* OD Information Banner */}
      <div className="od-notice-card glass-panel">
        <ShieldCheck className="od-notice-icon" size={24} />
        <div className="od-notice-text">
          <strong>Official DBS University OD Policy:</strong> Approved On-Duty (OD) marks count as present in your official attendance ledger for exam eligibility. Approvals follow a transparent 2-step verification: Faculty Mentor &rarr; Department HOD.
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-list">
        {leaves.map((item) => {
          const isApproved = item.status === 'APPROVED';
          const isPending = item.status === 'PENDING';

          return (
            <div key={item.id} className="leave-card glass-panel">
              <div className="leave-top">
                <div className="leave-type-group">
                  <span className="leave-id">{item.id}</span>
                  <span className="badge badge-info">
                    {item.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="leave-status">
                  {isApproved && (
                    <span className="badge badge-success">
                      <CheckCircle2 size={13} /> Approved by HOD
                    </span>
                  )}
                  {isPending && (
                    <span className="badge badge-warning">
                      <Clock size={13} /> Pending Mentor Review
                    </span>
                  )}
                </div>
              </div>

              <h3 className="leave-title">{item.title}</h3>

              <div className="leave-dates">
                <Calendar size={14} className="text-secondary" />
                <span>Duration: <strong>{item.dates}</strong> &bull; Applied: {item.appliedOn}</span>
              </div>

              <p className="leave-reason">{item.reason}</p>

              {item.approverRemarks && (
                <div className="approver-box">
                  <strong>Remarks:</strong> {item.approverRemarks}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Apply Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3 className="heading-display modal-title">Submit On-Duty / Leave Request</h3>
              <button 
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApply} className="modal-form">
              <div className="form-group">
                <label>Category:</label>
                <select 
                  className="modal-input"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                >
                  <option value="OD_HACKATHON">On-Duty: Hackathon / Tech Competition</option>
                  <option value="OD_SPORTS">On-Duty: University Sports Tournament</option>
                  <option value="MEDICAL">Medical Leave (Doctor Certificate Attached)</option>
                  <option value="CASUAL">Personal / Casual Leave</option>
                </select>
              </div>

              <div className="form-group">
                <label>Event or Leave Title:</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. ACM ICPC Regional Round / AI Summit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date(s) & Duration:</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. 28 Oct 2026 - 30 Oct 2026 (3 Days)"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason / Details for HOD:</label>
                <textarea 
                  className="modal-input modal-textarea" 
                  placeholder="Describe your participation, venue, team name, and faculty coordinator..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>Supporting Document / Approval Proof:</label>
                <div className="file-drop-zone">
                  <FileUp size={24} className="drop-icon" />
                  <span>{proofFileName ? proofFileName : 'Click to attach Invitation Letter / Ticket / Medical Certificate (PDF)'}</span>
                  <input 
                    type="file" 
                    className="hidden-file-input" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setProofFileName(e.target.files[0].name);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .leave-manager-container {
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
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .leave-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .od-notice-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-left: 4px solid var(--blue-500);
          background: rgba(37, 99, 235, 0.08);
        }

        .od-notice-icon {
          color: var(--blue-400);
          flex-shrink: 0;
        }

        .od-notice-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .applications-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .leave-card {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leave-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .leave-type-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .leave-id {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--amber-400);
        }

        .leave-title {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .leave-dates {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .leave-reason {
          font-size: 0.88rem;
          color: var(--slate-300);
          margin-top: 4px;
        }

        .approver-box {
          margin-top: 8px;
          font-size: 0.8rem;
          background: rgba(16, 185, 129, 0.1);
          border-left: 3px solid var(--emerald-500);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          color: #a7f3d0;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 560px;
          padding: 28px;
          background: #0f1c3d;
          border: 1px solid var(--border-subtle);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 1.25rem;
        }

        .close-btn {
          color: var(--text-secondary);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .modal-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .modal-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .file-drop-zone {
          position: relative;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-md);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .drop-icon {
          color: var(--amber-400);
        }

        .hidden-file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
