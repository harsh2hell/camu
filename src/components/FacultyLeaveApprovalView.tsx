import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Search,
  User,
  Calendar,
  Download,
  FileUp,
  History,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import {
  getPendingApprovals,
  getApproverHistory,
  decideApplication,
  getApplicationAuditTrail,
  getDocumentDownloadUrl,
  type LeaveApplicationDTO,
  type LeaveAuditLogDTO,
  type LeaveCategory,
  type LeaveStatus,
} from '../api/leave';

export const FacultyLeaveApprovalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [applications, setApplications] = useState<LeaveApplicationDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | LeaveCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Decision Modal State
  const [decisionApp, setDecisionApp] = useState<LeaveApplicationDTO | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION'>('APPROVE');
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [isDeciding, setIsDeciding] = useState<boolean>(false);

  // Audit History Modal State
  const [auditAppId, setAuditAppId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<LeaveAuditLogDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (activeTab === 'PENDING') {
        const res = await getPendingApprovals({
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        });
        setApplications(res.data);
      } else {
        const res = await getApproverHistory({
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        });
        setApplications(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [activeTab, selectedCategory]);

  // Open Decision Modal
  const openDecisionModal = (app: LeaveApplicationDTO, action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION') => {
    setDecisionApp(app);
    setDecisionAction(action);
    setDecisionReason('');
  };

  // Submit Decision
  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionApp) return;

    if (
      (decisionAction === 'REJECT' || decisionAction === 'REQUEST_CORRECTION') &&
      decisionReason.trim().length < 3
    ) {
      showToast('A detailed reason (min 3 characters) is required.', 'error');
      return;
    }

    try {
      setIsDeciding(true);
      await decideApplication(decisionApp.id, {
        action: decisionAction,
        reason: decisionReason.trim() || undefined,
      });

      const actionText =
        decisionAction === 'APPROVE'
          ? 'approved'
          : decisionAction === 'REJECT'
          ? 'rejected'
          : 'returned for correction';

      showToast(`Application successfully ${actionText}!`);
      setDecisionApp(null);
      await fetchApplications();
    } catch (err: any) {
      showToast(err?.message || 'Failed to finalize decision.', 'error');
    } finally {
      setIsDeciding(false);
    }
  };

  // Open Audit Modal
  const openAuditModal = async (appId: string) => {
    setAuditAppId(appId);
    setIsLoadingAudit(true);
    try {
      const res = await getApplicationAuditTrail(appId);
      setAuditLogs(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load audit history.', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Filtered by Search Query
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.studentName.toLowerCase().includes(q) ||
      app.studentRollNumber.toLowerCase().includes(q) ||
      app.title.toLowerCase().includes(q) ||
      app.leaveType.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <XCircle size={13} /> Rejected
          </span>
        );
      case 'NEEDS_CORRECTION':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <AlertCircle size={13} /> Needs Correction
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="badge badge-secondary flex items-center gap-1">
            <XCircle size={13} /> Withdrawn
          </span>
        );
      case 'RECOMMENDED_BY_MENTOR':
        return (
          <span className="badge badge-info flex items-center gap-1">
            <Clock size={13} /> Mentor Endorsed
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock size={13} /> Awaiting Decision
          </span>
        );
    }
  };

  return (
    <div className="faculty-leave-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type === 'error' ? 'toast-error' : ''}`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} className="text-danger" />
          ) : (
            <CheckCircle2 size={18} className="text-success" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="faculty-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Leave & On-Duty Approval Queue</h2>
          <p className="page-desc">
            Review and adjudicate academic leaves and on-duty participation passes for your assigned students.
          </p>
        </div>

        <div className="tab-pill-group">
          <button 
            className={`pill-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            Pending Review ({activeTab === 'PENDING' ? filteredApplications.length : '...'})
          </button>
          <button 
            className={`pill-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            Decision History
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="faculty-filter-bar glass-panel">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search by student name, roll number, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label"><Filter size={14} /> Category:</label>
          <div className="tab-pill-group">
            <button 
              className={`pill-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All
            </button>
            <button 
              className={`pill-btn ${selectedCategory === 'LEAVE' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('LEAVE')}
            >
              Leaves
            </button>
            <button 
              className={`pill-btn ${selectedCategory === 'ON_DUTY' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ON_DUTY')}
            >
              On-Duty
            </button>
          </div>

          <button 
            className="btn btn-secondary btn-icon"
            onClick={fetchApplications}
            title="Refresh queue"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Applications Queue */}
      {isLoading ? (
        <div className="loading-state glass-panel">
          <RefreshCw size={24} className="animate-spin text-accent" />
          <p>Loading application queue...</p>
        </div>
      ) : error ? (
        <div className="error-state glass-panel">
          <AlertCircle size={28} className="text-danger" />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm mt-3" onClick={fetchApplications}>
            Try Again
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="empty-state glass-panel">
          <FileText size={36} className="text-muted" />
          <h3 className="empty-title">
            {activeTab === 'PENDING' ? 'No Pending Approvals' : 'No Decision History'}
          </h3>
          <p className="empty-desc">
            {activeTab === 'PENDING'
              ? 'All assigned student leave and OD requests have been decided.'
              : 'No past applications found matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="applications-list">
          {filteredApplications.map((app) => {
            const isPending = app.status === 'PENDING' || app.status === 'RECOMMENDED_BY_MENTOR';

            return (
              <div key={app.id} className="approval-card glass-panel">
                <div className="card-top">
                  <div className="student-profile-badge">
                    <div className="avatar-circle">
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="student-name">{app.studentName}</h4>
                      <p className="student-roll">{app.studentRollNumber} &bull; {app.departmentName}</p>
                    </div>
                  </div>

                  <div className="status-badges">
                    <span className={`badge ${app.category === 'ON_DUTY' ? 'badge-primary' : 'badge-info'}`}>
                      {app.category === 'ON_DUTY' ? 'ON-DUTY' : 'LEAVE'}
                    </span>
                    <span className="badge badge-secondary">
                      {app.leaveType.replace(/_/g, ' ')}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                <div className="card-body">
                  <div className="application-details">
                    <h3 className="app-title">{app.title}</h3>
                    <p className="app-reason">{app.reason}</p>

                    <div className="meta-grid">
                      <div className="meta-item">
                        <Calendar size={14} className="text-accent" />
                        <span>
                          <strong>Duration:</strong> {app.startDate} &rarr; {app.endDate} ({app.totalDays} {app.totalDays === 1 ? 'day' : 'days'})
                        </span>
                      </div>

                      <div className="meta-item">
                        <Clock size={14} className="text-accent" />
                        <span><strong>Submitted:</strong> {new Date(app.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {app.decisionReason && (
                      <div className={`remarks-banner ${app.status === 'REJECTED' ? 'remarks-danger' : app.status === 'NEEDS_CORRECTION' ? 'remarks-warning' : 'remarks-info'}`}>
                        <strong>Recorded Decision Reason:</strong> {app.decisionReason}
                      </div>
                    )}
                  </div>

                  {app.hasSupportingDocument && (
                    <div className="supporting-doc-box">
                      <div className="doc-icon-wrap">
                        <FileUp size={18} className="text-accent" />
                      </div>
                      <div className="doc-info">
                        <span className="doc-label">Supporting Verification Document</span>
                        <a 
                          href={getDocumentDownloadUrl(app.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-download-doc"
                        >
                          <Download size={13} /> Secure Download & Verify
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <button 
                    className="btn btn-secondary btn-xs"
                    onClick={() => openAuditModal(app.id)}
                  >
                    <History size={13} /> View Audit History
                  </button>

                  {isPending && (
                    <div className="decision-actions">
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => openDecisionModal(app, 'REQUEST_CORRECTION')}
                      >
                        <MessageSquare size={14} /> Request Correction
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => openDecisionModal(app, 'REJECT')}
                      >
                        <X size={14} /> Reject
                      </button>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => openDecisionModal(app, 'APPROVE')}
                      >
                        <Check size={14} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {decisionApp && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">
                {decisionAction === 'APPROVE' && 'Approve Application'}
                {decisionAction === 'REJECT' && 'Reject Application'}
                {decisionAction === 'REQUEST_CORRECTION' && 'Return for Correction'}
              </h3>
              <button 
                className="close-btn" 
                onClick={() => setDecisionApp(null)}
                disabled={isDeciding}
              >
                <X size={18} />
              </button>
            </div>

            <div className="decision-summary mb-4">
              <p><strong>Student:</strong> {decisionApp.studentName} ({decisionApp.studentRollNumber})</p>
              <p><strong>Type:</strong> {decisionApp.category} - {decisionApp.leaveType}</p>
              <p><strong>Dates:</strong> {decisionApp.startDate} to {decisionApp.endDate} ({decisionApp.totalDays} days)</p>
            </div>

            <form onSubmit={handleDecide} className="modal-form">
              <div className="form-group">
                <label>
                  {decisionAction === 'APPROVE'
                    ? 'Approval Remarks (Optional)'
                    : 'Decision Justification / Reason (Required min 3 chars) *'}
                </label>
                <textarea 
                  className="modal-input modal-textarea"
                  placeholder={
                    decisionAction === 'APPROVE'
                      ? 'e.g., Recommended. Maintain lab diary notes.'
                      : decisionAction === 'REJECT'
                      ? 'e.g., Prior attendance below university minimum; mid-term exams scheduled.'
                      : 'e.g., Please attach the official registration confirmation letter from the organizer.'
                  }
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  required={decisionAction !== 'APPROVE'}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setDecisionApp(null)}
                  disabled={isDeciding}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${decisionAction === 'APPROVE' ? 'btn-success' : decisionAction === 'REJECT' ? 'btn-danger' : 'btn-warning'}`}
                  disabled={isDeciding}
                >
                  {isDeciding ? 'Saving Decision...' : `Confirm ${decisionAction.replace('_', ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {auditAppId && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display flex items-center gap-2">
                <History size={18} className="text-accent" /> Application Audit History
              </h3>
              <button 
                className="close-btn" 
                onClick={() => setAuditAppId(null)}
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingAudit ? (
              <div className="loading-state py-6">
                <RefreshCw size={20} className="animate-spin text-accent" />
                <p>Retrieving immutable audit records...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-secondary text-sm py-4">No audit records found.</p>
            ) : (
              <div className="audit-timeline">
                {auditLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-action">{log.action.replace(/_/g, ' ')}</span>
                        <span className="timeline-time">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="timeline-meta">
                        <span>Actor: <strong>{log.performedBy.fullName}</strong> ({log.performedBy.role})</span>
                        {log.previousStatus && (
                          <span> &bull; {log.previousStatus} &rarr; <strong>{log.newStatus}</strong></span>
                        )}
                      </div>
                      {log.reason && (
                        <p className="timeline-reason">&ldquo;{log.reason}&rdquo;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions mt-4">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setAuditAppId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-leave-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 1000;
          backdrop-filter: blur(10px);
          font-weight: 500;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .toast-error {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }

        .faculty-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-radius: var(--radius-lg);
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-title {
          font-size: 1.5rem;
          margin-bottom: 6px;
        }

        .page-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .tab-pill-group {
          display: flex;
          background: rgba(0, 0, 0, 0.35);
          padding: 3px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          gap: 3px;
        }

        .pill-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 16px;
          font-size: 0.84rem;
          border-radius: calc(var(--radius-md) - 2px);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .pill-btn.active {
          background: var(--accent);
          color: #0b0f19;
          font-weight: 600;
        }

        .faculty-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 8px 14px;
          flex: 1;
          min-width: 260px;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 0.88rem;
          width: 100%;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .applications-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .approval-card {
          padding: 22px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: border-color 0.2s ease;
        }

        .approval-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .student-profile-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .student-name {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .student-roll {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .status-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-body {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .application-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 280px;
        }

        .app-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .app-reason {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .meta-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 4px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .remarks-banner {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          line-height: 1.4;
          margin-top: 6px;
        }

        .remarks-warning {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .remarks-danger {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .remarks-info {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }

        .supporting-doc-box {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          padding: 14px 18px;
          border-radius: var(--radius-md);
          align-self: flex-start;
        }

        .doc-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .doc-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .doc-label {
          font-size: 0.76rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-download-doc {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .btn-download-doc:hover {
          text-decoration: underline;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .decision-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-success {
          background: #10b981;
          color: #0b0f19;
          font-weight: 600;
        }

        .btn-success:hover {
          background: #059669;
        }

        .btn-warning {
          background: #f59e0b;
          color: #0b0f19;
          font-weight: 600;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          font-weight: 600;
        }

        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .decision-summary {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-subtle);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.86rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .loading-state, .empty-state, .error-state {
          padding: 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-radius: var(--radius-lg);
        }

        .empty-title {
          font-size: 1.15rem;
          color: var(--text-primary);
        }

        .empty-desc {
          color: var(--text-secondary);
          font-size: 0.88rem;
          max-width: 400px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 580px;
          padding: 24px;
          border-radius: var(--radius-lg);
          max-height: 90vh;
          overflow-y: auto;
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
          background: transparent;
          border: none;
          cursor: pointer;
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
          min-height: 90px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .audit-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
        }

        .timeline-item {
          display: flex;
          gap: 16px;
          position: relative;
        }

        .timeline-marker {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent);
          margin-top: 4px;
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        .timeline-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timeline-action {
          font-weight: 600;
          font-size: 0.86rem;
          color: var(--text-primary);
        }

        .timeline-time {
          font-size: 0.74rem;
          color: var(--text-muted);
        }

        .timeline-meta {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .timeline-reason {
          font-size: 0.82rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 4px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
