import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  Clock,
  Pin,
  CheckCircle2,
  AlertCircle,
  Archive,
  Ban,
  History,
  Search,
  RefreshCw,
  X,
  FileUp,
  Radio,
  Send
} from 'lucide-react';
import {
  getManagementNotices,
  createNotice,
  publishNotice,
  archiveNotice,
  cancelNotice,
  getAudiencePreview,
  getNoticeAuditTrail,
  getNoticeAttachmentUrl,
  type NoticeDTO,
  type NoticeStatus,
  type NoticePriority,
  type NoticeAuditLogDTO,
  type AudiencePreviewDTO,
} from '../api/notice';

export const FacultyNoticeManagerView: React.FC = () => {
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('ACADEMIC');
  const [priority, setPriority] = useState<NoticePriority>('NORMAL');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [targetRole, setTargetRole] = useState<string>('');
  const [targetSemester, setTargetSemester] = useState<string>('');
  const [publicationMode, setPublicationMode] = useState<'NOW' | 'SCHEDULE' | 'DRAFT'>('NOW');
  const [publishAtDate, setPublishAtDate] = useState<string>('');
  const [expiresAtDate, setExpiresAtDate] = useState<string>('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreviewDTO | null>(null);

  // Cancel Modal State
  const [cancelNoticeId, setCancelNoticeId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Audit History Modal State
  const [auditNoticeId, setAuditNoticeId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<NoticeAuditLogDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getManagementNotices({
        status: selectedStatus === 'ALL' ? undefined : (selectedStatus as NoticeStatus),
        search: searchQuery.trim() || undefined,
      });
      setNotices(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [selectedStatus]);

  // Update Audience Preview whenever criteria changes
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const fetchPreview = async () => {
      try {
        const res = await getAudiencePreview({
          targetRole: targetRole || null,
          targetSemester: targetSemester ? Number(targetSemester) : null,
        });
        setAudiencePreview(res.data);
      } catch {
        // ignore
      }
    };
    fetchPreview();
  }, [targetRole, targetSemester, isCreateModalOpen]);

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Attachment exceeds 10MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Submit Notice
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    if (publicationMode === 'SCHEDULE' && !publishAtDate) {
      showToast('Please specify a future publication date/time for scheduled notice.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const publishNow = publicationMode === 'NOW';
      const publishAt = publicationMode === 'SCHEDULE' ? publishAtDate : undefined;

      await createNotice({
        title,
        content,
        category,
        priority,
        isPinned,
        targetRole: targetRole || null,
        targetSemester: targetSemester ? Number(targetSemester) : null,
        publishNow,
        publishAt,
        expiresAt: expiresAtDate || null,
        fileData,
        fileName,
      });

      showToast(`Notice successfully ${publishNow ? 'published' : publicationMode === 'SCHEDULE' ? 'scheduled' : 'saved as draft'}!`);
      setIsCreateModalOpen(false);
      resetForm();
      await fetchNotices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create notice.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('ACADEMIC');
    setPriority('NORMAL');
    setIsPinned(false);
    setTargetRole('');
    setTargetSemester('');
    setPublicationMode('NOW');
    setPublishAtDate('');
    setExpiresAtDate('');
    setFileData(undefined);
    setFileName(undefined);
  };

  // Publish Now
  const handlePublishNow = async (noticeId: string) => {
    try {
      await publishNotice(noticeId, { publishNow: true });
      showToast('Notice published successfully!');
      await fetchNotices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish notice.', 'error');
    }
  };

  // Archive Notice
  const handleArchive = async (noticeId: string) => {
    try {
      await archiveNotice(noticeId, 'Moved to archives by administrator');
      showToast('Notice successfully archived.');
      await fetchNotices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to archive notice.', 'error');
    }
  };

  // Confirm Cancel
  const handleConfirmCancel = async () => {
    if (!cancelNoticeId || cancelReason.trim().length < 3) {
      showToast('Cancellation reason is required (min 3 chars).', 'error');
      return;
    }

    try {
      setIsCancelling(true);
      await cancelNotice(cancelNoticeId, cancelReason);
      showToast('Notice cancelled.');
      setCancelNoticeId(null);
      setCancelReason('');
      await fetchNotices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel notice.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // View Audit Trail
  const openAuditModal = async (noticeId: string) => {
    setAuditNoticeId(noticeId);
    setIsLoadingAudit(true);
    try {
      const res = await getNoticeAuditTrail(noticeId);
      setAuditLogs(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load audit history.', 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const getStatusBadge = (status: NoticeStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 size={12} /> Published
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="badge badge-info flex items-center gap-1">
            <Clock size={12} /> Scheduled
          </span>
        );
      case 'DRAFT':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <FileText size={12} /> Draft
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="badge badge-secondary flex items-center gap-1">
            <Archive size={12} /> Archived
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <Ban size={12} /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="faculty-notice-container animate-fade-in">
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
          <h2 className="heading-display page-title">Campus Notices &amp; Announcements Console</h2>
          <p className="page-desc">
            Publish official circulars, schedule announcements, manage drafts, and configure targeted recipient groups.
          </p>
        </div>

        <button 
          type="button" 
          className="btn btn-accent"
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
        >
          <PlusCircle size={16} /> New Circular / Notice
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="faculty-filter-bar glass-panel">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search circular title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNotices()}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <div className="tab-pill-group">
            {['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`pill-btn ${selectedStatus === st ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-icon"
            onClick={fetchNotices}
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notices List */}
      {isLoading ? (
        <div className="loading-state glass-panel">
          <RefreshCw size={24} className="animate-spin text-accent" />
          <p>Loading notices...</p>
        </div>
      ) : error ? (
        <div className="error-state glass-panel">
          <AlertCircle size={28} className="text-danger" />
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={fetchNotices}>
            Retry
          </button>
        </div>
      ) : notices.length === 0 ? (
        <div className="empty-state glass-panel">
          <FileText size={36} className="text-muted" />
          <h3 className="empty-title">No notices found</h3>
          <p className="empty-desc">There are no notices matching the selected status or keyword.</p>
        </div>
      ) : (
        <div className="notices-list">
          {notices.map((n) => {
            const canPublishNow = n.status === 'DRAFT' || n.status === 'SCHEDULED';
            const canArchive = n.status === 'PUBLISHED';
            const canCancel = n.status !== 'CANCELLED' && n.status !== 'ARCHIVED';

            return (
              <div key={n.id} className="management-card glass-panel">
                <div className="card-top">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge badge-secondary">{n.category}</span>
                    <span className={`badge ${n.priority === 'URGENT' || n.priority === 'HIGH' ? 'badge-danger' : 'badge-info'}`}>
                      {n.priority}
                    </span>
                    {n.isPinned && (
                      <span className="badge badge-warning flex items-center gap-1">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    {getStatusBadge(n.status)}
                  </div>

                  <span className="timestamp-text">
                    Created: {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="card-body">
                  <h3 className="notice-title">{n.title}</h3>
                  <p className="notice-content-snippet">{n.content}</p>

                  <div className="meta-pills-row">
                    <span className="meta-info-pill">
                      <strong>Target:</strong> {n.targetRole ? n.targetRole : 'All Roles'}
                      {n.targetSemester ? ` &bull; Sem ${n.targetSemester}` : ''}
                      {n.departmentName ? ` &bull; ${n.departmentName}` : ''}
                    </span>

                    {n.publishedAt && (
                      <span className="meta-info-pill">
                        <strong>Published:</strong> {new Date(n.publishedAt).toLocaleString()}
                      </span>
                    )}

                    {n.publishAt && n.status === 'SCHEDULED' && (
                      <span className="meta-info-pill text-amber">
                        <strong>Scheduled For:</strong> {new Date(n.publishAt).toLocaleString()}
                      </span>
                    )}

                    {n.hasAttachment && (
                      <a 
                        href={getNoticeAttachmentUrl(n.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        <FileUp size={13} /> View Attached File
                      </a>
                    )}
                  </div>
                </div>

                <div className="card-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-xs"
                    onClick={() => openAuditModal(n.id)}
                  >
                    <History size={13} /> Audit Trail
                  </button>

                  <div className="action-buttons">
                    {canPublishNow && (
                      <button 
                        type="button" 
                        className="btn btn-success btn-xs"
                        onClick={() => handlePublishNow(n.id)}
                      >
                        <Send size={13} /> Publish Now
                      </button>
                    )}

                    {canArchive && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleArchive(n.id)}
                      >
                        <Archive size={13} /> Archive
                      </button>
                    )}

                    {canCancel && (
                      <button 
                        type="button" 
                        className="btn btn-danger btn-xs"
                        onClick={() => {
                          setCancelNoticeId(n.id);
                          setCancelReason('');
                        }}
                      >
                        <Ban size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Notice Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">Create Notice / Circular</h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="modal-form">
              <div className="form-group">
                <label>Notice / Circular Title *</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g., End-Semester Examination Schedule & Regulations"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category *</label>
                  <select 
                    className="modal-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="EXAM">Exam</option>
                    <option value="EVENT">Event</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="PLACEMENT">Placement</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Priority</label>
                  <select 
                    className="modal-input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NoticePriority)}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Content / Body Text *</label>
                <textarea 
                  className="modal-input modal-textarea" 
                  placeholder="Enter detailed notice content, instructions, and dates..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Target Audience Selector */}
              <div className="audience-section glass-panel">
                <h4 className="audience-title flex items-center gap-2">
                  <Radio size={14} className="text-accent" /> Audience Targeting
                </h4>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Target Role</label>
                    <select 
                      className="modal-input"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    >
                      <option value="">All Roles (University-Wide)</option>
                      <option value="STUDENT">Students Only</option>
                      <option value="FACULTY">Faculty Only</option>
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Target Semester (Optional)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="12" 
                      className="modal-input" 
                      placeholder="e.g., 6"
                      value={targetSemester}
                      onChange={(e) => setTargetSemester(e.target.value)}
                    />
                  </div>
                </div>

                {audiencePreview && (
                  <div className="audience-preview-pill">
                    <strong>Audience:</strong> {audiencePreview.audienceDescription} &bull; Approx.{' '}
                    <strong>{audiencePreview.estimatedRecipientCount}</strong> recipient(s)
                  </div>
                )}
              </div>

              {/* Publication Mode */}
              <div className="form-group">
                <label>Publication Lifecycle</label>
                <div className="tab-pill-group w-full">
                  <button 
                    type="button" 
                    className={`pill-btn flex-1 ${publicationMode === 'NOW' ? 'active' : ''}`}
                    onClick={() => setPublicationMode('NOW')}
                  >
                    Publish Immediately
                  </button>
                  <button 
                    type="button" 
                    className={`pill-btn flex-1 ${publicationMode === 'SCHEDULE' ? 'active' : ''}`}
                    onClick={() => setPublicationMode('SCHEDULE')}
                  >
                    Schedule for Later
                  </button>
                  <button 
                    type="button" 
                    className={`pill-btn flex-1 ${publicationMode === 'DRAFT' ? 'active' : ''}`}
                    onClick={() => setPublicationMode('DRAFT')}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>

              {publicationMode === 'SCHEDULE' && (
                <div className="form-group">
                  <label>Scheduled Publication Date &amp; Time *</label>
                  <input 
                    type="datetime-local" 
                    className="modal-input"
                    value={publishAtDate}
                    onChange={(e) => setPublishAtDate(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Expiration Date (Optional)</label>
                  <input 
                    type="datetime-local" 
                    className="modal-input"
                    value={expiresAtDate}
                    onChange={(e) => setExpiresAtDate(e.target.value)}
                  />
                </div>

                <div className="form-group flex items-center gap-2 mt-6">
                  <input 
                    type="checkbox" 
                    id="isPinnedCheck"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  <label htmlFor="isPinnedCheck" className="cursor-pointer mb-0">
                    Pin notice to top of noticeboard
                  </label>
                </div>
              </div>

              {/* File Attachment */}
              <div className="form-group">
                <label>Official Attachment (PDF, PNG, JPG, DOCX - Max 10MB)</label>
                <div className="file-drop-zone">
                  <FileUp size={22} className="drop-icon" />
                  <span>{fileName ? fileName : 'Click to select attachment file'}</span>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,.txt" 
                    className="hidden-file-input"
                    onChange={handleFileChange}
                  />
                </div>
                {fileName && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-xs mt-2"
                    onClick={() => { setFileData(undefined); setFileName(undefined); }}
                  >
                    Remove File
                  </button>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-accent"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : publicationMode === 'NOW' ? 'Publish Circular' : publicationMode === 'SCHEDULE' ? 'Schedule Circular' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Notice Modal */}
      {cancelNoticeId && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display">Cancel Notice</h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setCancelNoticeId(null)}
                disabled={isCancelling}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-secondary text-sm mb-4">
              Cancelling this notice will permanently hide it from recipient feeds. A written cancellation reason is mandatory.
            </p>

            <div className="form-group mb-4">
              <label>Reason for Cancellation *</label>
              <textarea 
                className="modal-input modal-textarea"
                placeholder="e.g., Event rescheduled due to state election holidays; revised notice to follow."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCancelNoticeId(null)}
                disabled={isCancelling}
              >
                Back
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditNoticeId && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 className="modal-title heading-display flex items-center gap-2">
                <History size={18} className="text-accent" /> Notice Lifecycle Audit Trail
              </h3>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setAuditNoticeId(null)}
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingAudit ? (
              <div className="loading-state py-6">
                <RefreshCw size={20} className="animate-spin text-accent" />
                <p>Retrieving immutable audit history...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-secondary text-sm py-4">No audit history found.</p>
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
                onClick={() => setAuditNoticeId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-notice-container {
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
          font-size: 0.82rem;
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

        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .management-card {
          padding: 22px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.2s ease;
        }

        .management-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timestamp-text {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .notice-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .notice-content-snippet {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meta-pills-row {
          display: flex;
          gap: 14px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .meta-info-pill {
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 10px;
          border-radius: 4px;
        }

        .text-amber {
          color: var(--accent);
        }

        .attachment-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
          flex-wrap: wrap;
          gap: 10px;
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

        .btn-success {
          background: #10b981;
          color: #0b0f19;
          font-weight: 600;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          font-weight: 600;
        }

        .audience-section {
          padding: 16px;
          border-radius: var(--radius-md);
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audience-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .audience-preview-pill {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: var(--text-secondary);
          font-size: 0.82rem;
          padding: 8px 12px;
          border-radius: var(--radius-md);
        }

        .audience-preview-pill strong {
          color: var(--text-primary);
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
          max-width: 600px;
          padding: 26px;
          border-radius: var(--radius-lg);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
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
          padding: 9px 12px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          color: var(--text-primary);
        }

        .modal-textarea {
          resize: vertical;
        }

        .file-drop-zone {
          position: relative;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-md);
          padding: 18px;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
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

        .loading-state, .empty-state, .error-state {
          padding: 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-radius: var(--radius-lg);
        }
      `}</style>
    </div>
  );
};
