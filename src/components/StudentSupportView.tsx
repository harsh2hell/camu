import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Send,
  RotateCcw,
  ChevronRight,
  X,
  History,
  User,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getMyTickets,
  getTicketDetail,
  createTicket,
  addTicketMessage,
  reopenTicket,
  type SupportTicketDTO,
  type TicketDetailDTO,
  type TicketCategory,
  type TicketStatus,
  type TicketPriority,
} from '../api/support';

export const StudentSupportView: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket Detail
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversation' | 'history'>('conversation');

  // New Reply State
  const [replyText, setReplyText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // Reopen Modal State
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [submittingReopen, setSubmittingReopen] = useState<boolean>(false);

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createCategory, setCreateCategory] = useState<TicketCategory>('ACADEMIC');
  const [createPriority, setCreatePriority] = useState<TicketPriority>('MEDIUM');
  const [createSubject, setCreateSubject] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [submittingTicket, setSubmittingTicket] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter as TicketStatus;
      if (categoryFilter !== 'ALL') params.category = categoryFilter as TicketCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getMyTickets(params);
      setTickets(res.tickets);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const loadTicketDetail = async (ticketId: string) => {
    try {
      setSelectedTicketId(ticketId);
      setLoadingDetail(true);
      setDetailError(null);
      const detail = await getTicketDetail(ticketId);
      setSelectedTicket(detail);
      setActiveTab('conversation');
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load ticket conversation');
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
        isInternal: false,
      });

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, newMsg],
              messageCount: prev.messageCount + 1,
              status: prev.status === 'WAITING_FOR_STUDENT' ? 'IN_PROGRESS' : prev.status,
            }
          : null
      );
      setReplyText('');
      setSuccessToast('Reply sent successfully');
      setTimeout(() => setSuccessToast(null), 3000);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReopenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reopenReason.trim() || submittingReopen) return;

    try {
      setSubmittingReopen(true);
      const updated = await reopenTicket(selectedTicket.id, {
        reason: reopenReason.trim(),
      });

      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              reopenedAt: updated.reopenedAt,
              reopenReason: updated.reopenReason,
            }
          : null
      );
      setShowReopenModal(false);
      setReopenReason('');
      setSuccessToast('Ticket reopened successfully. Staff has been alerted.');
      setTimeout(() => setSuccessToast(null), 4000);
      fetchTickets();
      if (selectedTicketId) loadTicketDetail(selectedTicketId);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket');
    } finally {
      setSubmittingReopen(false);
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingTicket) return;

    if (!createSubject.trim() || createSubject.trim().length < 5) {
      setCreateError('Subject must be at least 5 characters');
      return;
    }
    if (!createDescription.trim() || createDescription.trim().length < 10) {
      setCreateError('Description must be at least 10 characters');
      return;
    }

    try {
      setSubmittingTicket(true);
      setCreateError(null);

      const created = await createTicket({
        category: createCategory,
        priority: createPriority,
        subject: createSubject.trim(),
        description: createDescription.trim(),
      });

      setShowCreateModal(false);
      setCreateSubject('');
      setCreateDescription('');
      setSuccessToast(`Ticket ${created.ticketNumber} created successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      await fetchTickets();
      loadTicketDetail(created.id);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="oak-badge badge-blue">Open</span>;
      case 'IN_PROGRESS':
        return <span className="oak-badge badge-amber">In Progress</span>;
      case 'WAITING_FOR_STUDENT':
        return <span className="oak-badge badge-purple">Waiting for Response</span>;
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

  // Stats calculation
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_STUDENT'
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  ).length;

  return (
    <div className="oak-leave-container animate-fade-in">
      {/* Toast Notification */}
      {successToast && (
        <div className="oak-toast-banner animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="oak-leave-header">
        <div className="oak-leave-header-info">
          <div className="oak-leave-badge-row">
            <span className="oak-category-tag">DBS Global University ERP</span>
            <span className="oak-sep">&bull;</span>
            <span className="oak-system-tag">Student Grievance &amp; Helpdesk Cell</span>
          </div>
          <h1 className="oak-leave-title">Support &amp; Service Requests</h1>
          <p className="oak-leave-sub">
            Track inquiries, submit official grievances, communicate directly with faculty advisors, and review resolution records.
          </p>
        </div>

        <button
          type="button"
          className="oak-apply-btn"
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
        >
          <Plus size={16} />
          <span>Raise Support Ticket</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="oak-leave-stats-grid">
        <div className="oak-stat-card">
          <div className="oak-stat-icon-wrap icon-blue">
            <MessageSquare size={20} />
          </div>
          <div className="oak-stat-content">
            <span className="oak-stat-num">{totalCount}</span>
            <span className="oak-stat-label">Total Tickets Submitted</span>
          </div>
        </div>

        <div className="oak-stat-card">
          <div className="oak-stat-icon-wrap icon-amber">
            <Clock size={20} />
          </div>
          <div className="oak-stat-content">
            <span className="oak-stat-num">{openCount}</span>
            <span className="oak-stat-label">Active / Open Inquiries</span>
          </div>
        </div>

        <div className="oak-stat-card">
          <div className="oak-stat-icon-wrap icon-purple">
            <RotateCcw size={20} />
          </div>
          <div className="oak-stat-content">
            <span className="oak-stat-num">{inProgressCount}</span>
            <span className="oak-stat-label">In Progress / Review</span>
          </div>
        </div>

        <div className="oak-stat-card">
          <div className="oak-stat-icon-wrap icon-emerald">
            <CheckCircle2 size={20} />
          </div>
          <div className="oak-stat-content">
            <span className="oak-stat-num">{resolvedCount}</span>
            <span className="oak-stat-label">Resolved / Closed</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="oak-leave-filters-bar">
        <div className="oak-leave-filter-group">
          <span className="oak-filter-label">
            <Filter size={14} /> Filter Status:
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
                  ? 'Needs Response'
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
          <Search size={16} className="oak-search-icon" />
          <input
            type="text"
            placeholder="Search ticket #, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="oak-search-input"
          />
          <button
            type="button"
            className="oak-refresh-btn"
            onClick={fetchTickets}
            title="Refresh tickets"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content: Tickets Table / Cards */}
      {loading && (
        <div className="oak-loading-box">
          <Loader2 size={32} className="animate-spin text-emerald" />
          <p>Fetching authoritative ticket records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="oak-error-box">
          <AlertCircle size={20} className="text-rose" />
          <p>{error}</p>
          <button type="button" onClick={fetchTickets} className="oak-retry-btn">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="oak-empty-state">
          <div className="oak-empty-icon-circle">
            <LifeBuoy size={36} />
          </div>
          <h3>No support tickets found</h3>
          <p>
            {statusFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery
              ? 'No tickets match your active filter criteria.'
              : 'You have not submitted any helpdesk queries or grievances yet.'}
          </p>
          <button
            type="button"
            className="oak-apply-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Create First Ticket</span>
          </button>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div className="oak-table-wrap">
          <table className="oak-data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Subject &amp; Details</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Created</th>
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
                    <span className="oak-category-cell">{getCategoryLabel(t.category)}</span>
                  </td>
                  <td>
                    <div className="oak-subject-cell">
                      <strong>{t.subject}</strong>
                      <span className="oak-sub-text">
                        {t.description.length > 65
                          ? `${t.description.substring(0, 65)}...`
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
                      <span className="oak-unassigned-tag">Unassigned Queue</span>
                    )}
                  </td>
                  <td>
                    <span className="oak-date-cell">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
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
                      <span>Thread</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Details Drawer / Modal */}
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
                      Category: <strong>{getCategoryLabel(selectedTicket.category)}</strong> &bull;{' '}
                      Submitted on{' '}
                      {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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

                {/* Assigned Staff Banner */}
                <div className="oak-drawer-staff-bar">
                  <div className="oak-staff-avatar-circle">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="oak-staff-label">Assigned Staff / Officer:</span>
                    <strong>
                      {selectedTicket.assignedStaff
                        ? `${selectedTicket.assignedStaff.fullName} (${selectedTicket.assignedStaff.role})`
                        : 'Institutional Registrar Helpdesk Queue'}
                    </strong>
                  </div>
                  {selectedTicket.status === 'RESOLVED' && (
                    <button
                      type="button"
                      className="oak-reopen-pill-btn"
                      onClick={() => setShowReopenModal(true)}
                    >
                      <RotateCcw size={13} />
                      <span>Issue Persists? Reopen Ticket</span>
                    </button>
                  )}
                </div>

                {/* Resolution Notice Banner if Resolved/Closed */}
                {selectedTicket.resolutionNotes && (
                  <div className="oak-resolution-banner animate-fade-in">
                    <CheckCircle2 size={18} className="text-emerald" />
                    <div>
                      <strong>Official Resolution Recorded:</strong>
                      <p>{selectedTicket.resolutionNotes}</p>
                    </div>
                  </div>
                )}

                {/* Reopened Banner if applicable */}
                {selectedTicket.reopenReason && (
                  <div className="oak-reopen-banner animate-fade-in">
                    <RotateCcw size={16} className="text-amber" />
                    <div>
                      <strong>Ticket Reopened by Student:</strong>
                      <p>{selectedTicket.reopenReason}</p>
                    </div>
                  </div>
                )}

                {/* Drawer Tab Navigation */}
                <div className="oak-drawer-tabs">
                  <button
                    type="button"
                    className={`oak-drawer-tab ${activeTab === 'conversation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('conversation')}
                  >
                    <MessageSquare size={14} />
                    <span>Conversation ({selectedTicket.messages.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`oak-drawer-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    <History size={14} />
                    <span>Audit &amp; Lifecycle Timeline</span>
                  </button>
                </div>

                {/* Drawer Body: Conversation Thread */}
                {activeTab === 'conversation' && (
                  <div className="oak-conversation-container">
                    <div className="oak-messages-stream">
                      {/* Original Student Inquiry */}
                      <div className="oak-message-bubble student-bubble initial-bubble">
                        <div className="oak-message-meta">
                          <strong>{selectedTicket.student.fullName} (You)</strong>
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

                      {/* Subsequent Replies */}
                      {selectedTicket.messages.map((m) => {
                        const isMe = m.sender.id === selectedTicket.student.id;
                        return (
                          <div
                            key={m.id}
                            className={`oak-message-bubble ${
                              isMe ? 'student-bubble' : 'staff-bubble'
                            }`}
                          >
                            <div className="oak-message-meta">
                              <strong>
                                {isMe ? 'You' : `${m.sender.fullName} (${m.sender.role})`}
                              </strong>
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
                              {m.attachmentFileKey && (
                                <div className="oak-attachment-pill">
                                  <Paperclip size={13} />
                                  <span>{m.attachmentName || 'Attachment'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Input Box */}
                    {selectedTicket.status !== 'CLOSED' ? (
                      <form onSubmit={handleSendReply} className="oak-reply-box">
                        <textarea
                          rows={3}
                          placeholder="Type your follow-up reply or question for the staff officer..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="oak-reply-textarea"
                          required
                        />
                        <div className="oak-reply-action-row">
                          <span className="oak-reply-hint">
                            Staff will receive an official notification on your reply.
                          </span>
                          <button
                            type="submit"
                            className="oak-send-btn"
                            disabled={!replyText.trim() || submittingReply}
                          >
                            {submittingReply ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="oak-closed-notice">
                        <AlertCircle size={16} />
                        <span>
                          This ticket is finalized and closed. If you require further assistance on this issue, please raise a new support ticket.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Drawer Body: Audit History */}
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

      {/* Reopen Ticket Modal */}
      {showReopenModal && (
        <div className="oak-modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="oak-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-modal-header">
              <h3>Reopen Support Ticket</h3>
              <button
                type="button"
                className="oak-modal-close-btn"
                onClick={() => setShowReopenModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReopenTicket} className="oak-modal-form">
              <p className="oak-modal-desc">
                If the previous resolution did not resolve your issue or if follow-up action is required, please provide specific details below:
              </p>
              <div className="oak-form-group">
                <label>Reason for Reopening (Required)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why the issue persists or what further assistance is needed..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="oak-textarea"
                />
              </div>
              <div className="oak-modal-actions">
                <button
                  type="button"
                  className="oak-btn-secondary"
                  onClick={() => setShowReopenModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="oak-btn-primary"
                  disabled={!reopenReason.trim() || submittingReopen}
                >
                  {submittingReopen ? 'Submitting...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Ticket Modal */}
      {showCreateModal && (
        <div className="oak-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="oak-modal-box oak-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="oak-modal-header">
              <div className="oak-modal-title-row">
                <LifeBuoy size={20} className="text-emerald" />
                <h3>Raise Official Support Ticket / Grievance</h3>
              </div>
              <button
                type="button"
                className="oak-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="oak-modal-error animate-fade-in">
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicketSubmit} className="oak-modal-form">
              <div className="oak-form-row">
                <div className="oak-form-group">
                  <label>Grievance / Inquiry Category *</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as TicketCategory)}
                    className="oak-select"
                  >
                    <option value="ACADEMIC">Academic &amp; Coursework Query</option>
                    <option value="EXAMINATION">Examination &amp; Grading Grievance</option>
                    <option value="FINANCE">Fee Receipts &amp; Billing Query</option>
                    <option value="HOSTEL">Hostel Accommodation &amp; Facilities</option>
                    <option value="FACILITY">Campus Infrastructure &amp; Wi-Fi</option>
                    <option value="GENERAL">General Administration &amp; Other</option>
                  </select>
                </div>

                <div className="oak-form-group">
                  <label>Urgency / Priority *</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as TicketPriority)}
                    className="oak-select"
                  >
                    <option value="LOW">Low (General Query / Information)</option>
                    <option value="MEDIUM">Medium (Standard Academic Service)</option>
                    <option value="HIGH">High (Impacts Upcoming Deadlines / Classes)</option>
                    <option value="URGENT">Urgent (Immediate Exam / Medical Issue)</option>
                  </select>
                </div>
              </div>

              <div className="oak-form-group">
                <label>Subject / Brief Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discrepancy in Mid-term marks for CS302 / Hostel Wi-Fi issue..."
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                  className="oak-input"
                  minLength={5}
                  maxLength={255}
                />
              </div>

              <div className="oak-form-group">
                <label>Detailed Description *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide comprehensive details, relevant course codes, transaction IDs, or room numbers to help staff resolve your inquiry swiftly..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="oak-textarea"
                  minLength={10}
                />
              </div>

              <div className="oak-modal-footer">
                <span className="oak-form-notice">
                  Your ticket is cryptographically registered in the university ERP audit log.
                </span>
                <div className="oak-modal-actions">
                  <button
                    type="button"
                    className="oak-btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="oak-btn-primary"
                    disabled={submittingTicket}
                  >
                    {submittingTicket ? 'Submitting to Registrar...' : 'Submit Support Ticket'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
