import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Lock,
  Send,
  User,
  ChevronRight,
  X,
  History,
  RefreshCw,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  getStaffQueue,
  getQueueSummary,
  getTicketDetail,
  addTicketMessage,
  updateTicketStatus,
  assignTicket,
  type SupportTicketDTO,
  type TicketDetailDTO,
  type TicketQueueSummaryDTO,
  type TicketCategory,
  type TicketStatus,
  type TicketPriority,
} from '../api/support';

export const StaffHelpdeskView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [summary, setSummary] = useState<TicketQueueSummaryDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [assignedToMeFilter, setAssignedToMeFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket Detail
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversation' | 'history'>('conversation');

  // Staff Reply Form
  const [replyText, setReplyText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // Status Update & Resolution Modal
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('IN_PROGRESS');
  const [statusReason, setStatusReason] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchQueueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter as TicketStatus;
      if (categoryFilter !== 'ALL') params.category = categoryFilter as TicketCategory;
      if (assignedToMeFilter) params.assignedToMe = true;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [queueRes, summaryRes] = await Promise.all([
        getStaffQueue(params),
        getQueueSummary(),
      ]);

      setTickets(queueRes.tickets);
      setTotalCount(queueRes.total);
      setSummary(summaryRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff helpdesk queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, assignedToMeFilter, searchQuery]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  const loadTicketDetail = async (ticketId: string) => {
    try {
      setSelectedTicketId(ticketId);
      setLoadingDetail(true);
      setDetailError(null);
      const detail = await getTicketDetail(ticketId);
      setSelectedTicket(detail);
      setActiveTab('conversation');
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load ticket details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || submittingReply) return;

    try {
      setSubmittingReply(true);
      const newMsg = await addTicketMessage(selectedTicket.id, {
        message: replyText.trim(),
        isInternal: isInternalNote,
      });

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, newMsg],
              messageCount: prev.messageCount + 1,
            }
          : null
      );
      setReplyText('');
      setToastMessage(
        isInternalNote ? 'Internal staff note added successfully' : 'Public reply sent to student'
      );
      setTimeout(() => setToastMessage(null), 3000);
      fetchQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || submittingStatus) return;

    try {
      setSubmittingStatus(true);
      const updated = await updateTicketStatus(selectedTicket.id, {
        status: targetStatus,
        reason: statusReason.trim() || undefined,
        resolutionNotes:
          targetStatus === 'RESOLVED' ? resolutionNotes.trim() || undefined : undefined,
      });

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              resolutionNotes: updated.resolutionNotes,
              resolvedAt: updated.resolvedAt,
            }
          : null
      );
      setShowStatusModal(false);
      setStatusReason('');
      setResolutionNotes('');
      setToastMessage(`Ticket status transitioned to ${targetStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchQueueData();
      if (selectedTicketId) loadTicketDetail(selectedTicketId);
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleSelfAssign = async () => {
    if (!selectedTicket) return;
    try {
      // Current staff ID
      const updated = await assignTicket(selectedTicket.id, {
        assignedStaffId: null, // Endpoint will handle assignment
        reason: 'Assigned via helpdesk console',
      });
      setSelectedTicket((prev) => (prev ? { ...prev, assignedStaff: updated.assignedStaff } : null));
      setToastMessage('Assignment updated');
      setTimeout(() => setToastMessage(null), 3000);
      fetchQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment');
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="oak-badge badge-blue">Open</span>;
      case 'IN_PROGRESS':
        return <span className="oak-badge badge-amber">In Progress</span>;
      case 'WAITING_FOR_STUDENT':
        return <span className="oak-badge badge-purple">Waiting for Student</span>;
      case 'RESOLVED':
        return <span className="oak-badge badge-emerald">Resolved</span>;
      case 'CLOSED':
        return <span className="oak-badge badge-slate">Closed</span>;
      default:
        return <span className="oak-badge">{status}</span>;
    }
  };

  const getCategoryLabel = (category: TicketCategory) => {
    switch (category) {
      case 'ACADEMIC':
        return 'Academic & Coursework';
      case 'EXAMINATION':
        return 'Exam & Grading';
      case 'FINANCE':
        return 'Fees & Billing';
      case 'HOSTEL':
        return 'Hostel & Housing';
      case 'FACILITY':
        return 'Campus & Wi-Fi';
      case 'GENERAL':
        return 'General Query';
      default:
        return category;
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="oak-badge badge-rose">Urgent</span>;
      case 'HIGH':
        return <span className="oak-badge badge-amber">High</span>;
      case 'MEDIUM':
        return <span className="oak-badge badge-blue">Medium</span>;
      case 'LOW':
        return <span className="oak-badge badge-slate">Low</span>;
    }
  };

  return (
    <div className="oak-leave-container animate-fade-in">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="oak-toast-banner animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="oak-leave-header">
        <div className="oak-leave-header-info">
          <div className="oak-leave-badge-row">
            <span className="oak-category-tag">Staff Helpdesk Console</span>
            <span className="oak-sep">&bull;</span>
            <span className="oak-system-tag">Grievance &amp; Service Resolution</span>
            <span className="oak-sep">&bull;</span>
            <span className="oak-system-tag">{totalCount} Tickets in Active Queue</span>
          </div>
          <h1 className="oak-leave-title">Support Ticket Queues</h1>
          <p className="oak-leave-sub">
            Review assigned student inquiries, coordinate departmental replies, maintain private staff notes, and record official resolutions.
          </p>
        </div>

        <button
          type="button"
          className="oak-refresh-btn"
          onClick={fetchQueueData}
          title="Refresh queue"
          style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Sync Queue</span>
        </button>
      </div>

      {/* Queue Stats Bar */}
      {summary && (
        <div className="oak-leave-stats-grid">
          <div className="oak-stat-card">
            <div className="oak-stat-icon-wrap icon-blue">
              <LifeBuoy size={20} />
            </div>
            <div className="oak-stat-content">
              <span className="oak-stat-num">{summary.totalOpen}</span>
              <span className="oak-stat-label">Open / Unassigned</span>
            </div>
          </div>

          <div className="oak-stat-card">
            <div className="oak-stat-icon-wrap icon-amber">
              <Clock size={20} />
            </div>
            <div className="oak-stat-content">
              <span className="oak-stat-num">{summary.totalInProgress}</span>
              <span className="oak-stat-label">In Progress</span>
            </div>
          </div>

          <div className="oak-stat-card">
            <div className="oak-stat-icon-wrap icon-purple">
              <UserCheck size={20} />
            </div>
            <div className="oak-stat-content">
              <span className="oak-stat-num">{summary.totalWaitingForStudent}</span>
              <span className="oak-stat-label">Waiting for Student</span>
            </div>
          </div>

          <div className="oak-stat-card">
            <div className="oak-stat-icon-wrap icon-emerald">
              <CheckCircle2 size={20} />
            </div>
            <div className="oak-stat-content">
              <span className="oak-stat-num">{summary.totalResolved}</span>
              <span className="oak-stat-label">Resolved Issues</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="oak-leave-filters-bar">
        <div className="oak-leave-filter-group">
          <span className="oak-filter-label">
            <Filter size={14} /> Status:
          </span>
          {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_STUDENT', 'RESOLVED', 'CLOSED'].map(
            (status) => (
              <button
                key={status}
                type="button"
                className={`oak-filter-pill ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL'
                  ? 'All Statuses'
                  : status === 'WAITING_FOR_STUDENT'
                  ? 'Awaiting Student'
                  : status.replace(/_/g, ' ')}
              </button>
            )
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="oak-filter-pill"
            style={{ padding: '6px 12px', background: 'var(--oak-bg-surface, #fff)', border: '1px solid var(--oak-border, #e2e8f0)', cursor: 'pointer', borderRadius: '20px', fontSize: '13px' }}
          >
            <option value="ALL">All Categories</option>
            <option value="ACADEMIC">Academic</option>
            <option value="FEES_FINANCE">Fees &amp; Finance</option>
            <option value="EXAMINATIONS">Examinations</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="HOSTEL_CAMPUS">Hostel &amp; Campus</option>
            <option value="IT_PORTAL">IT &amp; Portal</option>
            <option value="GENERAL_INQUIRY">General Inquiry</option>
          </select>
        </div>

        <div className="oak-leave-search-wrap">
          <label className="oak-assigned-checkbox-label">
            <input
              type="checkbox"
              checked={assignedToMeFilter}
              onChange={(e) => setAssignedToMeFilter(e.target.checked)}
            />
            <span>Assigned to Me</span>
          </label>

          <Search size={16} className="oak-search-icon" />
          <input
            type="text"
            placeholder="Search ticket #, student name, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="oak-search-input"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading && (
        <div className="oak-loading-box">
          <Loader2 size={32} className="animate-spin text-emerald" />
          <p>Retrieving authoritative queue tickets...</p>
        </div>
      )}

      {error && !loading && (
        <div className="oak-error-box">
          <AlertCircle size={20} className="text-rose" />
          <p>{error}</p>
          <button type="button" onClick={fetchQueueData} className="oak-retry-btn">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="oak-empty-state">
          <div className="oak-empty-icon-circle">
            <CheckCircle2 size={36} />
          </div>
          <h3>Queue is clear</h3>
          <p>
            {statusFilter !== 'ALL' || assignedToMeFilter || searchQuery
              ? 'No tickets match the active queue filter criteria.'
              : 'There are no active student tickets requiring staff attention at this time.'}
          </p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="oak-table-wrap">
          <table className="oak-data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Student Details</th>
                <th>Category</th>
                <th>Subject &amp; Inquiry</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={selectedTicketId === t.id ? 'oak-row-active' : ''}
                  onClick={() => loadTicketDetail(t.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="oak-bold-cell font-mono">{t.ticketNumber}</span>
                  </td>
                  <td>
                    <div className="oak-student-cell">
                      <strong>{t.student.fullName}</strong>
                      <span className="oak-sub-text">
                        {t.student.rollNumber || t.student.email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="oak-category-cell">{getCategoryLabel(t.category)}</span>
                  </td>
                  <td>
                    <div className="oak-subject-cell">
                      <strong>{t.subject}</strong>
                      <span className="oak-sub-text">
                        {t.description.length > 55
                          ? `${t.description.substring(0, 55)}...`
                          : t.description}
                      </span>
                    </div>
                  </td>
                  <td>{getPriorityBadge(t.priority)}</td>
                  <td>{getStatusBadge(t.status)}</td>
                  <td>
                    {t.assignedStaff ? (
                      <span className="oak-staff-tag">
                        <User size={12} />
                        {t.assignedStaff.fullName}
                      </span>
                    ) : (
                      <span className="oak-unassigned-tag">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="oak-date-cell">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="oak-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTicketDetail(t.id);
                      }}
                    >
                      <span>Manage</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Management Drawer */}
      {selectedTicketId && (
        <div className="oak-modal-overlay" onClick={() => setSelectedTicketId(null)}>
          <div
            className="oak-ticket-drawer animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail && (
              <div className="oak-drawer-loading">
                <Loader2 size={32} className="animate-spin text-emerald" />
                <p>Loading ticket discussion thread...</p>
              </div>
            )}

            {detailError && (
              <div className="oak-drawer-error">
                <AlertCircle size={24} className="text-rose" />
                <p>{detailError}</p>
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  className="oak-close-drawer-btn"
                >
                  Close
                </button>
              </div>
            )}

            {selectedTicket && !loadingDetail && (
              <>
                {/* Drawer Header */}
                <div className="oak-drawer-header">
                  <div className="oak-drawer-title-box">
                    <div className="oak-drawer-badge-row">
                      <span className="oak-bold-cell font-mono">
                        {selectedTicket.ticketNumber}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                    <h2 className="oak-drawer-title">{selectedTicket.subject}</h2>
                    <span className="oak-drawer-meta">
                      Student:{' '}
                      <strong>
                        {selectedTicket.student.fullName} ({selectedTicket.student.rollNumber || 'No Roll'})
                      </strong>{' '}
                      &bull; Category: <strong>{getCategoryLabel(selectedTicket.category)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="oak-modal-close-btn"
                    onClick={() => setSelectedTicketId(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Staff Actions Bar */}
                <div className="oak-drawer-staff-bar">
                  <div className="oak-staff-actions-row">
                    <button
                      type="button"
                      className="oak-btn-sm-primary"
                      onClick={() => {
                        setTargetStatus(
                          selectedTicket.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED'
                        );
                        setShowStatusModal(true);
                      }}
                    >
                      <span>Update Status / Resolve</span>
                    </button>
                    {!selectedTicket.assignedStaff && (
                      <button
                        type="button"
                        className="oak-btn-sm-secondary"
                        onClick={handleSelfAssign}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <UserCheck size={14} />
                        <span>Assign to Me</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Resolution Notice Banner */}
                {selectedTicket.resolutionNotes && (
                  <div className="oak-resolution-banner animate-fade-in">
                    <CheckCircle2 size={18} className="text-emerald" />
                    <div>
                      <strong>Recorded Resolution:</strong>
                      <p>{selectedTicket.resolutionNotes}</p>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="oak-drawer-tabs">
                  <button
                    type="button"
                    className={`oak-drawer-tab ${activeTab === 'conversation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('conversation')}
                  >
                    <MessageSquare size={14} />
                    <span>Conversation &amp; Internal Notes ({selectedTicket.messages.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`oak-drawer-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    <History size={14} />
                    <span>Audit Trail</span>
                  </button>
                </div>

                {/* Conversation Body */}
                {activeTab === 'conversation' && (
                  <div className="oak-conversation-container">
                    <div className="oak-messages-stream">
                      {/* Original Student Inquiry */}
                      <div className="oak-message-bubble student-bubble initial-bubble">
                        <div className="oak-message-meta">
                          <strong>{selectedTicket.student.fullName} (Student)</strong>
                          <span>
                            {new Date(selectedTicket.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="oak-message-body">
                          <p>{selectedTicket.description}</p>
                        </div>
                      </div>

                      {/* Conversation Messages */}
                      {selectedTicket.messages.map((m) => {
                        const isStudent = m.sender.id === selectedTicket.student.id;
                        return (
                          <div
                            key={m.id}
                            className={`oak-message-bubble ${
                              m.isInternal
                                ? 'internal-note-bubble'
                                : isStudent
                                ? 'student-bubble'
                                : 'staff-bubble'
                            }`}
                          >
                            <div className="oak-message-meta">
                              <div className="oak-sender-badge-group">
                                <strong>{m.sender.fullName}</strong>
                                <span className="oak-sender-role">({m.sender.role})</span>
                                {m.isInternal && (
                                  <span className="oak-internal-tag">
                                    <Lock size={11} /> Internal Note &bull; Hidden from Student
                                  </span>
                                )}
                              </div>
                              <span>
                                {new Date(m.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                })}{' '}
                                &bull;{' '}
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="oak-message-body">
                              <p>{m.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Staff Reply Form */}
                    <form onSubmit={handleSendReply} className="oak-reply-box">
                      <div className="oak-note-type-toggle">
                        <button
                          type="button"
                          className={`oak-type-btn ${!isInternalNote ? 'active' : ''}`}
                          onClick={() => setIsInternalNote(false)}
                        >
                          <MessageSquare size={13} />
                          <span>Public Reply to Student</span>
                        </button>
                        <button
                          type="button"
                          className={`oak-type-btn internal ${isInternalNote ? 'active' : ''}`}
                          onClick={() => setIsInternalNote(true)}
                        >
                          <Lock size={13} />
                          <span>Internal Staff Note (Private)</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        placeholder={
                          isInternalNote
                            ? 'Add a private note for other faculty/staff members (students will NOT see this)...'
                            : 'Compose official response visible to the student...'
                        }
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className={`oak-reply-textarea ${isInternalNote ? 'internal-mode' : ''}`}
                        required
                      />

                      <div className="oak-reply-action-row">
                        <span className="oak-reply-hint">
                          {isInternalNote
                            ? 'Private internal note recorded in server audit logs.'
                            : 'Student will receive your response immediately.'}
                        </span>
                        <button
                          type="submit"
                          className={`oak-send-btn ${isInternalNote ? 'btn-internal' : ''}`}
                          disabled={!replyText.trim() || submittingReply}
                        >
                          {submittingReply ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          <span>{isInternalNote ? 'Save Internal Note' : 'Send Public Reply'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Audit Trail Tab */}
                {activeTab === 'history' && (
                  <div className="oak-audit-timeline">
                    {selectedTicket.auditLogs.map((log) => (
                      <div key={log.id} className="oak-timeline-item">
                        <div className="oak-timeline-marker">
                          <div className="oak-marker-dot" />
                          <div className="oak-marker-line" />
                        </div>
                        <div className="oak-timeline-content">
                          <div className="oak-timeline-head">
                            <strong className="oak-action-tag">
                              {log.action.replace(/_/g, ' ')}
                            </strong>
                            <span className="oak-timeline-time">
                              {new Date(log.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="oak-timeline-actor">
                            By <strong>{log.performedBy.fullName}</strong> ({log.performedBy.role})
                          </p>
                          {log.reason && (
                            <p className="oak-timeline-reason">Note: {log.reason}</p>
                          )}
                          {log.newStatus && log.previousStatus && (
                            <span className="oak-status-transition-tag">
                              Status: {log.previousStatus} &rarr; {log.newStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Update / Resolution Modal */}
      {showStatusModal && selectedTicket && (
        <div className="oak-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="oak-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-modal-header">
              <h3>Transition Ticket Lifecycle Status</h3>
              <button
                type="button"
                className="oak-modal-close-btn"
                onClick={() => setShowStatusModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStatusUpdateSubmit} className="oak-modal-form">
              <div className="oak-form-group">
                <label>Select Target Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
                  className="oak-select"
                >
                  <option value="IN_PROGRESS">In Progress (Active Staff Review)</option>
                  <option value="WAITING_FOR_STUDENT">
                    Waiting for Student (Awaiting clarification / docs)
                  </option>
                  <option value="RESOLVED">Resolved (Grievance addressed / answer provided)</option>
                  <option value="CLOSED">Closed (Final archival)</option>
                </select>
              </div>

              {targetStatus === 'RESOLVED' && (
                <div className="oak-form-group">
                  <label>Official Resolution Notes (Required for Resolution) *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document the resolution provided, actions taken, or instructions for the student..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="oak-textarea"
                    minLength={5}
                  />
                </div>
              )}

              <div className="oak-form-group">
                <label>Reason / Audit Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional internal justification for status transition..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="oak-input"
                />
              </div>

              <div className="oak-modal-actions">
                <button
                  type="button"
                  className="oak-btn-secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="oak-btn-primary"
                  disabled={submittingStatus}
                >
                  {submittingStatus ? 'Updating Database...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
