import React, { useState, useEffect } from 'react';
import { 
  Pin, 
  Calendar, 
  Download, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Tag,
  RefreshCw,
  AlertCircle,
  Clock,
  Eye,
  X,
  FileUp,
  User
} from 'lucide-react';
import {
  getRecipientNotices,
  getNoticeDetails,
  getNoticeAttachmentUrl,
  type NoticeDTO,
  type NoticePriority,
} from '../api/notice';

export const NoticeBoardView: React.FC = () => {
  const [notices, setNotices] = useState<NoticeDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Notice Modal State
  const [activeNotice, setActiveNotice] = useState<NoticeDTO | null>(null);

  const categories = ['ALL', 'ACADEMIC', 'EXAM', 'EVENT', 'HOLIDAY', 'PLACEMENT', 'ADMINISTRATIVE'];

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRecipientNotices({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        priority: selectedPriority === 'ALL' ? undefined : (selectedPriority as NoticePriority),
        search: searchQuery.trim() || undefined,
      });
      setNotices(res.data);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load university notices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotices();
  };

  const handleOpenNotice = async (noticeId: string) => {
    try {
      const res = await getNoticeDetails(noticeId);
      setActiveNotice(res.data);
      // Update local acknowledgement
      setNotices((prev) =>
        prev.map((n) => (n.id === noticeId ? { ...n, isAcknowledged: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to fetch notice details:', err);
    }
  };

  return (
    <div className="dbs-notice-container animate-fade-in">
      {/* Modern Clean Header Card */}
      <div className="dbs-header-card">
        <div className="dbs-header-left">
          <div className="flex items-center gap-2">
            <h2 className="dbs-header-title">University Noticeboard &amp; Circulars</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount} New</span>
            )}
          </div>
          <p className="dbs-header-desc">
            Direct institutional announcements from the Registrar, Dean Academics, and Controller of Examinations.
          </p>
        </div>

        <div className="dbs-header-right">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="dbs-search-pill">
            <Search size={15} className="dbs-search-icon" />
            <input 
              type="text" 
              placeholder="Search circulars, exams, drives..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dbs-search-input"
            />
            <button type="submit" className="hidden-submit" aria-hidden="true" />
          </form>

          {/* Category Filter Pills */}
          <div className="dbs-filter-track">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`dbs-filter-pill ${selectedCategory === cat ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="dbs-priority-select"
              aria-label="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
            </select>

            <button 
              type="button" 
              className="dbs-refresh-btn"
              onClick={fetchNotices}
              title="Refresh noticeboard"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="dbs-loading-card">
          <RefreshCw size={28} className="animate-spin text-accent" />
          <p>Retrieving university notices &amp; circulars...</p>
        </div>
      ) : error ? (
        <div className="dbs-error-card">
          <AlertCircle size={32} className="text-danger" />
          <p>{error}</p>
          <button type="button" className="dbs-reset-btn mt-3" onClick={fetchNotices}>
            Retry Loading
          </button>
        </div>
      ) : notices.length === 0 ? (
        <div className="dbs-empty-card">
          <FileText size={36} className="dbs-empty-icon" />
          <h3>No circulars found</h3>
          <p>There are no active notices matching your current search or category filters.</p>
          <button 
            type="button" 
            className="dbs-reset-btn"
            onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="dbs-notices-feed">
          {notices.map((notice) => {
            const isExam = notice.category === 'EXAM';
            const isPlacement = notice.category === 'PLACEMENT';
            const isEvent = notice.category === 'EVENT';
            const isHoliday = notice.category === 'HOLIDAY';
            const isUrgent = notice.priority === 'URGENT' || notice.priority === 'HIGH';

            return (
              <div 
                key={notice.id} 
                className={`dbs-notice-card ${notice.isPinned ? 'is-pinned-card' : ''} ${!notice.isAcknowledged ? 'is-unread-card' : ''}`}
              >
                {/* Notice Top Meta Row */}
                <div className="dbs-card-top-row">
                  <div className="dbs-badges-wrap">
                    {notice.isPinned && (
                      <span className="dbs-tag tag-pinned">
                        <Pin size={12} />
                        <span>Pinned Circular</span>
                      </span>
                    )}

                    <span className={`dbs-tag ${
                      isExam ? 'tag-exam' :
                      isPlacement ? 'tag-placement' :
                      isEvent ? 'tag-event' :
                      isHoliday ? 'tag-holiday' : 'tag-academic'
                    }`}>
                      <Tag size={12} />
                      <span>{notice.category}</span>
                    </span>

                    {isUrgent && (
                      <span className="dbs-tag tag-urgent">
                        <span>{notice.priority}</span>
                      </span>
                    )}

                    {!notice.isAcknowledged && (
                      <span className="unread-dot-badge">New</span>
                    )}
                  </div>

                  <div className="dbs-date-pill">
                    <Calendar size={13} />
                    <span>
                      {notice.publishedAt
                        ? new Date(notice.publishedAt).toLocaleDateString()
                        : new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Notice Title & Body */}
                <h3 
                  className="dbs-notice-title cursor-pointer"
                  onClick={() => handleOpenNotice(notice.id)}
                >
                  {notice.title}
                </h3>
                <p className="dbs-notice-body">{notice.content}</p>

                {/* Notice Footer Row */}
                <div className="dbs-card-footer-row">
                  <div className="dbs-verified-stamp">
                    <ShieldCheck size={15} className="text-emerald" />
                    <span>
                      Verified Circular &bull; {notice.authorName} ({notice.authorRole})
                    </span>
                  </div>

                  <div className="dbs-footer-actions">
                    <button 
                      type="button" 
                      className="dbs-view-btn"
                      onClick={() => handleOpenNotice(notice.id)}
                    >
                      <Eye size={13} /> View Notice
                    </button>

                    {notice.hasAttachment && (
                      <a 
                        href={getNoticeAttachmentUrl(notice.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dbs-download-btn"
                      >
                        <Download size={13} />
                        <span>Official Attachment</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notice Detail Modal */}
      {activeNotice && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span className={`dbs-tag ${
                  activeNotice.category === 'EXAM' ? 'tag-exam' :
                  activeNotice.category === 'PLACEMENT' ? 'tag-placement' :
                  activeNotice.category === 'EVENT' ? 'tag-event' : 'tag-academic'
                }`}>
                  {activeNotice.category}
                </span>
                {activeNotice.isPinned && (
                  <span className="dbs-tag tag-pinned">
                    <Pin size={11} /> Pinned
                  </span>
                )}
                {activeNotice.priority !== 'NORMAL' && (
                  <span className={`dbs-tag ${activeNotice.priority === 'URGENT' || activeNotice.priority === 'HIGH' ? 'tag-urgent' : ''}`}>
                    {activeNotice.priority}
                  </span>
                )}
              </div>

              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setActiveNotice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="modal-notice-title">{activeNotice.title}</h2>

            <div className="modal-meta-row">
              <div className="meta-pill">
                <User size={13} className="text-accent" />
                <span>Issued by: <strong>{activeNotice.authorName}</strong> ({activeNotice.authorRole})</span>
              </div>
              <div className="meta-pill">
                <Clock size={13} className="text-accent" />
                <span>
                  Date: {activeNotice.publishedAt ? new Date(activeNotice.publishedAt).toLocaleString() : new Date(activeNotice.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-notice-content">
              {activeNotice.content.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {activeNotice.hasAttachment && (
              <div className="modal-attachment-box">
                <FileUp size={20} className="text-accent" />
                <div className="flex-1">
                  <strong>Official Verified Attachment Available</strong>
                  <p className="text-xs text-secondary">Click below to download authenticated document.</p>
                </div>
                <a 
                  href={getNoticeAttachmentUrl(activeNotice.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dbs-download-btn"
                >
                  <Download size={14} /> Download File
                </a>
              </div>
            )}

            <div className="modal-footer-row mt-6">
              <div className="dbs-verified-stamp">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Recorded as Read &bull; DBS Academic Registry</span>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setActiveNotice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dbs-notice-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .unread-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          margin-left: 8px;
        }

        .unread-dot-badge {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .is-unread-card {
          border-left: 4px solid var(--accent) !important;
        }

        .hidden-submit {
          display: none;
        }

        .dbs-header-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: rgba(18, 24, 38, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          gap: 20px;
          flex-wrap: wrap;
        }

        .dbs-header-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .dbs-header-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .dbs-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dbs-search-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          padding: 6px 14px;
          border-radius: 999px;
          min-width: 220px;
        }

        .dbs-search-icon {
          color: var(--text-muted);
        }

        .dbs-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 0.82rem;
          width: 100%;
        }

        .dbs-filter-track {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 3px;
          border-radius: 999px;
          border: 1px solid var(--border-subtle);
        }

        .dbs-filter-pill {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.76rem;
          padding: 4px 12px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .dbs-filter-pill.is-active {
          background: var(--accent);
          color: #0b0f19;
          font-weight: 600;
        }

        .dbs-refresh-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .dbs-refresh-btn:hover {
          color: var(--text-primary);
        }

        .dbs-notices-feed {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dbs-notice-card {
          padding: 22px;
          background: rgba(18, 24, 38, 0.65);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .dbs-notice-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .is-pinned-card {
          border-color: rgba(245, 158, 11, 0.35);
          background: rgba(245, 158, 11, 0.03);
        }

        .dbs-card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dbs-badges-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dbs-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.74rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .tag-pinned {
          background: rgba(245, 158, 11, 0.15);
          color: var(--accent);
        }

        .tag-exam {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .tag-placement {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .tag-event {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
        }

        .tag-holiday {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .tag-academic {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
        }

        .tag-urgent {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }

        .dbs-date-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .dbs-notice-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.35;
        }

        .dbs-notice-body {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .dbs-card-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
          margin-top: 4px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .dbs-verified-stamp {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-muted);
        }

        .text-emerald {
          color: #10b981;
        }

        .dbs-footer-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dbs-view-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .dbs-view-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .dbs-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: var(--accent);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          text-decoration: none;
        }

        .dbs-download-btn:hover {
          background: rgba(245, 158, 11, 0.2);
        }

        .dbs-loading-card, .dbs-error-card, .dbs-empty-card {
          padding: 48px;
          text-align: center;
          background: rgba(18, 24, 38, 0.6);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .dbs-reset-btn {
          background: var(--accent);
          border: none;
          color: #0b0f19;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          cursor: pointer;
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
          max-width: 620px;
          padding: 26px;
          border-radius: var(--radius-lg);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .modal-notice-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
          margin-bottom: 12px;
        }

        .modal-meta-row {
          display: flex;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .meta-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .modal-notice-content {
          font-size: 0.92rem;
          line-height: 1.6;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
        }

        .modal-attachment-box {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-top: 18px;
        }

        .modal-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
        }
      `}</style>
    </div>
  );
};
