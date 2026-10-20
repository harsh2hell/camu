import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MinusCircle,
  FileUp, 
  Calendar,
  X,
  FileText,
  History,
  RotateCcw,
  Ban,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  getStudentApplications,
  createLeaveApplication,
  withdrawApplication,
  resubmitApplication,
  getApplicationAuditTrail,
  getDocumentDownloadUrl,
  type LeaveApplicationDTO,
  type LeaveAuditLogDTO,
  type LeaveCategory,
  type LeaveStatus,
} from '../api/leave';

export const LeaveODManager: React.FC = () => {
  const [applications, setApplications] = useState<LeaveApplicationDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | LeaveCategory>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // New Application Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [category, setCategory] = useState<LeaveCategory>('LEAVE');
  const [leaveType, setLeaveType] = useState<string>('CASUAL');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  // Withdraw Modal State
  const [withdrawAppId, setWithdrawAppId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  // Resubmit Modal State
  const [resubmitApp, setResubmitApp] = useState<LeaveApplicationDTO | null>(null);
  const [resubmitTitle, setResubmitTitle] = useState<string>('');
  const [resubmitStartDate, setResubmitStartDate] = useState<string>('');
  const [resubmitEndDate, setResubmitEndDate] = useState<string>('');
  const [resubmitReason, setResubmitReason] = useState<string>('');
  const [resubmitFileData, setResubmitFileData] = useState<string | undefined>(undefined);
  const [resubmitFileName, setResubmitFileName] = useState<string | undefined>(undefined);
  const [isResubmitting, setIsResubmitting] = useState<boolean>(false);

  // Audit History Modal State
  const [auditAppId, setAuditAppId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<LeaveAuditLogDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getStudentApplications({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        status: selectedStatus === 'ALL' ? undefined : (selectedStatus as LeaveStatus),
      });
      setApplications(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load leave applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedCategory, selectedStatus]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isResubmit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum 10MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (isResubmit) {
        setResubmitFileData(base64);
        setResubmitFileName(file.name);
      } else {
        setFileData(base64);
        setFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Application
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate || !reason) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      showToast('End date cannot be earlier than start date.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await createLeaveApplication({
        category,
        leaveType,
        title,
        startDate,
        endDate,
        reason,
        fileData,
        fileName,
      });

      setIsApplyModalOpen(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setFileData(undefined);
      setFileName(undefined);
      showToast(`${category === 'ON_DUTY' ? 'On-Duty' : 'Leave'} application successfully submitted!`);
      await fetchApplications();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit application.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAppId) return;
    try {
      setIsWithdrawing(true);
      await withdrawApplication(withdrawAppId, withdrawReason);
      setWithdrawAppId(null);
      setWithdrawReason('');
      showToast('Application successfully withdrawn.');
      await fetchApplications();
    } catch (err: any) {
      showToast(err?.message || 'Failed to withdraw application.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Open Resubmit Modal
  const openResubmitModal = (app: LeaveApplicationDTO) => {
    setResubmitApp(app);
    setResubmitTitle(app.title);
    setResubmitStartDate(app.startDate);
    setResubmitEndDate(app.endDate);
    setResubmitReason(app.reason);
    setResubmitFileData(undefined);
    setResubmitFileName(undefined);
  };

  // Submit Resubmission
  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitApp) return;

    try {
      setIsResubmitting(true);
      await resubmitApplication(resubmitApp.id, {
        title: resubmitTitle,
        startDate: resubmitStartDate,
        endDate: resubmitEndDate,
        reason: resubmitReason,
        fileData: resubmitFileData,
        fileName: resubmitFileName,
      });

      setResubmitApp(null);
      showToast('Application resubmitted successfully for approver review.');
      await fetchApplications();
    } catch (err: any) {
      showToast(err?.message || 'Failed to resubmit application.', 'error');
    } finally {
      setIsResubmitting(false);
    }
  };

  // Open Audit Trail Modal
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
            <MinusCircle size={13} /> Withdrawn
          </span>
        );
      case 'RECOMMENDED_BY_MENTOR':
        return (
          <span className="badge badge-info flex items-center gap-1">
            <Clock size={13} /> Recommended by Mentor
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock size={13} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="leave-manager-container animate-fade-in">
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
      <div className="leave-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Leave & On-Duty (OD) Portal</h2>
          <p className="page-desc">
            Submit, track, and manage leave and on-duty passes with transparent mentor and departmental approvals.
          </p>
        </div>

        <button 
          className="btn btn-accent"
          onClick={() => {
            setCategory('LEAVE');
            setLeaveType('CASUAL');
            setIsApplyModalOpen(true);
          }}
        >
          <PlusCircle size={16} /> New Request
        </button>
      </div>

      {/* Institutional Policy Notice */}
      <div className="od-notice-card glass-panel">
        <ShieldCheck className="od-notice-icon" size={24} />
        <div className="od-notice-text">
          <strong>Official DBS University Policy:</strong> On-Duty passes for hackathons, paper presentations, placement drives, and sports require prior mentor endorsement. Submitted requests are protected by immutable audit trails and strict concurrency verification.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="leave-filter-bar glass-panel">
        <div className="filter-group">
          <label className="filter-label"><Filter size={14} /> Category:</label>
          <div className="tab-pill-group">
            <button 
              className={`pill-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All Requests
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
              On-Duty Passes
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <select 
            className="select-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="NEEDS_CORRECTION">Needs Correction</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          <button 
            className="btn btn-secondary btn-icon"
            onClick={fetchApplications}
            title="Refresh applications"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="loading-state glass-panel">
          <RefreshCw size={24} className="animate-spin text-accent" />
          <p>Loading your leave & OD applications...</p>
        </div>
      ) : error ? (
        <div className="error-state glass-panel">
          <AlertCircle size={28} className="text-danger" />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm mt-3" onClick={fetchApplications}>
            Try Again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state glass-panel">
          <FileText size={36} className="text-muted" />
          <h3 className="empty-title">No Applications Found</h3>
          <p className="empty-desc">
            You have not submitted any {selectedCategory !== 'ALL' ? selectedCategory.toLowerCase() : ''} requests matching the selected filter.
          </p>
          <button 
            className="btn btn-accent btn-sm mt-3"
            onClick={() => setIsApplyModalOpen(true)}
          >
            <PlusCircle size={14} /> Submit Application
          </button>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((item) => {
            const canWithdraw = item.status === 'PENDING' || item.status === 'NEEDS_CORRECTION';
            const canResubmit = item.status === 'NEEDS_CORRECTION';

            return (
              <div key={item.id} className="leave-card glass-panel">
                <div className="leave-top">
                  <div className="leave-type-group">
                    <span className="leave-id">{item.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`badge ${item.category === 'ON_DUTY' ? 'badge-primary' : 'badge-info'}`}>
                      {item.category === 'ON_DUTY' ? 'ON-DUTY' : 'LEAVE'}
                    </span>
                    <span className="badge badge-secondary">
                      {item.leaveType.replace('_', ' ')}
                    </span>
                  </div>

                  {getStatusBadge(item.status)}
                </div>

                <div className="leave-body">
                  <h3 className="leave-title">{item.title}</h3>
                  <p className="leave-reason">{item.reason}</p>

                  <div className="leave-meta-grid">
                    <div className="meta-item">
                      <Calendar size={14} className="meta-icon" />
                      <span>
                        <strong>Dates:</strong> {item.startDate} &rarr; {item.endDate} ({item.totalDays} {item.totalDays === 1 ? 'day' : 'days'})
                      </span>
                    </div>

                    {item.assignedApproverName && (
                      <div className="meta-item">
                        <Clock size={14} className="meta-icon" />
                        <span>
                          <strong>Approver:</strong> {item.assignedApproverName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Remarks / Feedback banner */}
                  {item.decisionReason && (
                    <div className={`remarks-banner ${item.status === 'REJECTED' ? 'remarks-danger' : item.status === 'NEEDS_CORRECTION' ? 'remarks-warning' : 'remarks-info'}`}>
                      <strong>Approver Feedback:</strong> {item.decisionReason}
                    </div>
                  )}

                  {/* Supporting Document */}
                  {item.hasSupportingDocument && (
                    <div className="document-chip">
                      <FileUp size={14} className="text-accent" />
                      <span className="doc-name">Supporting Document Attached</span>
                      <a 
                        href={getDocumentDownloadUrl(item.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-download"
                        title="Download supporting document"
                      >
                        <Download size={13} /> View File
                      </a>
                    </div>
                  )}
                </div>

                <div className="leave-footer">
                  <span className="applied-time">Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>

                  <div className="action-buttons">
                    <button 
                      className="btn btn-secondary btn-xs"
                      onClick={() => openAuditModal(item.id)}
                      title="View audit trail"
                    >
                      <History size={13} /> History
                    </button>

                    {canResubmit && (
                      <button 
                        className="btn btn-warning btn-xs"
                        onClick={() => openResubmitModal(item)}
                      >
                        <RotateCcw size={13} /> Resubmit
                      </button>
                    )}

                    {canWithdraw && (
                      <button 
                        className="btn btn-danger btn-xs"
                        onClick={() => {
                          setWithdrawAppId(item.id);
                          setWithdrawReason('');
                        }}
                      >
                        <Ban size={13} /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Application Modal */}
      {isApplyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">Apply for Leave / On-Duty (OD)</h3>
              <button 
                className="close-btn" 
                onClick={() => setIsApplyModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply} className="modal-form">
              <div className="form-group">
                <label>Application Category *</label>
                <div className="tab-pill-group w-full">
                  <button 
                    type="button"
                    className={`pill-btn flex-1 ${category === 'LEAVE' ? 'active' : ''}`}
                    onClick={() => {
                      setCategory('LEAVE');
                      setLeaveType('CASUAL');
                    }}
                  >
                    Leave
                  </button>
                  <button 
                    type="button"
                    className={`pill-btn flex-1 ${category === 'ON_DUTY' ? 'active' : ''}`}
                    onClick={() => {
                      setCategory('ON_DUTY');
                      setLeaveType('OD_HACKATHON');
                    }}
                  >
                    On-Duty (OD)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>{category === 'ON_DUTY' ? 'OD Purpose *' : 'Leave Type *'}</label>
                <select 
                  className="modal-input"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  {category === 'ON_DUTY' ? (
                    <>
                      <option value="OD_HACKATHON">Hackathon / Coding Contest</option>
                      <option value="OD_SPORTS">Inter-University Sports</option>
                      <option value="OD_CONFERENCE">Paper Presentation / Conference</option>
                      <option value="OD_CULTURAL">Cultural Event / Fest</option>
                      <option value="OD_PLACEMENT">Placement / Interview Drive</option>
                      <option value="OD_OTHER">Other Academic On-Duty</option>
                    </>
                  ) : (
                    <>
                      <option value="CASUAL">Casual Leave</option>
                      <option value="MEDICAL">Medical Leave</option>
                      <option value="ACADEMIC">Academic Leave</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>{category === 'ON_DUTY' ? 'Event / Activity Name *' : 'Subject / Title *'}</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder={category === 'ON_DUTY' ? 'e.g., Smart India Hackathon 2026 Grand Finale' : 'e.g., Severe Viral Fever'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    className="modal-input" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    className="modal-input" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Detailed Reason & Justification *</label>
                <textarea 
                  className="modal-input modal-textarea" 
                  placeholder="Provide justification for absence and outline commitments."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Supporting Document (Medical certificate, invitation letter, event pass)</label>
                <div className="file-drop-zone">
                  <FileUp size={24} className="drop-icon" />
                  <span>{fileName ? fileName : 'Click or drag file to attach (PDF, PNG, JPG, DOCX - max 10MB)'}</span>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,.txt" 
                    className="hidden-file-input"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                </div>
                {fileName && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-xs mt-2"
                    onClick={() => {
                      setFileData(undefined);
                      setFileName(undefined);
                    }}
                  >
                    Remove File
                  </button>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsApplyModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-accent"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawAppId && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">Withdraw Application</h3>
              <button 
                className="close-btn" 
                onClick={() => setWithdrawAppId(null)}
                disabled={isWithdrawing}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-secondary text-sm mb-4">
              Are you sure you want to withdraw this application? Once withdrawn, this request cannot be reopened.
            </p>

            <div className="form-group mb-4">
              <label>Withdrawal Reason (Optional)</label>
              <textarea 
                className="modal-input modal-textarea"
                placeholder="e.g., Event cancelled / recovered sooner than expected"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setWithdrawAppId(null)}
                disabled={isWithdrawing}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {resubmitApp && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">Address Feedback & Resubmit</h3>
              <button 
                className="close-btn" 
                onClick={() => setResubmitApp(null)}
                disabled={isResubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {resubmitApp.decisionReason && (
              <div className="remarks-banner remarks-warning mb-4">
                <strong>Approver Instructions:</strong> {resubmitApp.decisionReason}
              </div>
            )}

            <form onSubmit={handleResubmit} className="modal-form">
              <div className="form-group">
                <label>Title / Event Name</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  value={resubmitTitle}
                  onChange={(e) => setResubmitTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    className="modal-input" 
                    value={resubmitStartDate}
                    onChange={(e) => setResubmitStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    className="modal-input" 
                    value={resubmitEndDate}
                    onChange={(e) => setResubmitEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Updated Reason & Clarification</label>
                <textarea 
                  className="modal-input modal-textarea" 
                  value={resubmitReason}
                  onChange={(e) => setResubmitReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Replace Supporting Document (Optional)</label>
                <div className="file-drop-zone">
                  <FileUp size={24} className="drop-icon" />
                  <span>{resubmitFileName ? resubmitFileName : 'Click to upload replacement document'}</span>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,.txt" 
                    className="hidden-file-input"
                    onChange={(e) => handleFileChange(e, true)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setResubmitApp(null)}
                  disabled={isResubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-warning"
                  disabled={isResubmitting}
                >
                  {isResubmitting ? 'Resubmitting...' : 'Resubmit for Review'}
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
                <History size={18} className="text-accent" /> Application Audit Trail
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
              <p className="text-secondary text-sm py-4">No audit history records found.</p>
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
        .leave-manager-container {
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

        .leave-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-radius: var(--radius-lg);
        }

        .page-title {
          font-size: 1.5rem;
          margin-bottom: 6px;
        }

        .page-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .od-notice-card {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px 20px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: var(--radius-md);
        }

        .od-notice-icon {
          color: var(--amber-400);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .od-notice-text {
          font-size: 0.85rem;
          line-height: 1.45;
          color: var(--text-secondary);
        }

        .od-notice-text strong {
          color: var(--text-primary);
        }

        .leave-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          gap: 16px;
          flex-wrap: wrap;
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
          padding: 6px 14px;
          font-size: 0.8rem;
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

        .select-input {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          padding: 6px 12px;
          font-size: 0.82rem;
        }

        .applications-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .leave-card {
          padding: 20px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .leave-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
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
          font-family: monospace;
          font-size: 0.78rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .leave-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .leave-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .leave-reason {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .leave-meta-grid {
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

        .meta-icon {
          color: var(--accent);
        }

        .remarks-banner {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          line-height: 1.4;
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

        .document-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          width: fit-content;
        }

        .doc-name {
          color: var(--text-secondary);
        }

        .btn-download {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.1);
        }

        .btn-download:hover {
          background: rgba(245, 158, 11, 0.2);
        }

        .leave-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
          margin-top: 4px;
        }

        .applied-time {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-xs {
          padding: 4px 10px;
          font-size: 0.76rem;
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          gap: 4px;
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

        .form-row {
          display: flex;
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
          color: var(--accent);
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
