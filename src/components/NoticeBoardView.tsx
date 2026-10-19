import React, { useState } from 'react';
import { 
  Pin, 
  Calendar, 
  Download, 
  Search,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Tag
} from 'lucide-react';
import { MOCK_NOTICES } from '../data/mockData';

export const NoticeBoardView: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const categories = ['ALL', 'EXAM', 'PLACEMENT', 'EVENT', 'ACADEMIC'];

  const filteredNotices = MOCK_NOTICES.filter(notice => {
    const matchesFilter = filter === 'ALL' || notice.category === filter;
    const matchesSearch = notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          notice.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownload = (title: string) => {
    setDownloadToast(`Downloading official circular: "${title}"`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  return (
    <div className="dbs-notice-container animate-fade-in">
      {/* Toast Notification */}
      {downloadToast && (
        <div className="dbs-toast-pill">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Modern Clean Header Card */}
      <div className="dbs-header-card">
        <div className="dbs-header-left">
          <h2 className="dbs-header-title">University Noticeboard &amp; Circulars</h2>
          <p className="dbs-header-desc">
            Direct institutional announcements from the Registrar, Dean Academics, and Controller of Examinations.
          </p>
        </div>

        <div className="dbs-header-right">
          {/* Search Bar */}
          <div className="dbs-search-pill">
            <Search size={15} className="dbs-search-icon" />
            <input 
              type="text" 
              placeholder="Search circulars, exams, drives..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dbs-search-input"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="dbs-filter-track">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`dbs-filter-pill ${filter === cat ? 'is-active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notices Feed */}
      <div className="dbs-notices-feed">
        {filteredNotices.length === 0 ? (
          <div className="dbs-empty-card">
            <FileText size={36} className="dbs-empty-icon" />
            <h3>No circulars found</h3>
            <p>Try refining your search keywords or resetting category filters.</p>
            <button 
              type="button" 
              className="dbs-reset-btn"
              onClick={() => { setFilter('ALL'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredNotices.map(notice => {
            const isExam = notice.category === 'EXAM';
            const isPlacement = notice.category === 'PLACEMENT';
            const isEvent = notice.category === 'EVENT';

            return (
              <div 
                key={notice.id} 
                className={`dbs-notice-card ${notice.isPinned ? 'is-pinned-card' : ''}`}
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
                      isEvent ? 'tag-event' : 'tag-academic'
                    }`}>
                      <Tag size={12} />
                      <span>{notice.category}</span>
                    </span>
                  </div>

                  <div className="dbs-date-pill">
                    <Calendar size={13} />
                    <span>{notice.date}</span>
                  </div>
                </div>

                {/* Notice Title & Content */}
                <h3 className="dbs-notice-title">{notice.title}</h3>
                <p className="dbs-notice-body">{notice.description}</p>

                {/* Notice Footer Row */}
                <div className="dbs-card-footer-row">
                  <div className="dbs-verified-stamp">
                    <ShieldCheck size={15} className="text-emerald" />
                    <span>Verified Official Circular &bull; DBS Registrar Office</span>
                  </div>

                  <button 
                    type="button" 
                    className="dbs-download-btn"
                    onClick={() => handleDownload(notice.title)}
                  >
                    <Download size={14} />
                    <span>Official Circular (PDF)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .dbs-notice-container {
          width: 100%;
          max-width: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
        }

        .dbs-toast-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.84rem;
          font-weight: 500;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }

        .text-emerald {
          color: #10b981;
        }

        /* 1. HEADER CARD */
        .dbs-header-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px 28px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .dbs-header-left {
          max-width: 580px;
        }

        .dbs-header-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
          letter-spacing: -0.015em;
        }

        .dbs-header-desc {
          font-size: 0.86rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .dbs-header-right {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .dbs-search-pill {
          display: flex;
          align-items: center;
          background: #f8fafc;
          height: 40px;
          padding: 0 14px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          width: 240px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .dbs-search-pill:focus-within {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .dbs-search-icon {
          color: #94a3b8;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .dbs-search-input {
          border: none;
          background: transparent;
          font-size: 0.82rem;
          color: #0f172a;
          outline: none;
          width: 100%;
        }

        .dbs-search-input::placeholder {
          color: #94a3b8;
        }

        .dbs-filter-track {
          display: flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          gap: 2px;
        }

        .dbs-filter-pill {
          padding: 6px 14px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          font-size: 0.76rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .dbs-filter-pill:hover {
          color: #0f172a;
        }

        .dbs-filter-pill.is-active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
        }

        /* 2. NOTICES FEED */
        .dbs-notices-feed {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dbs-notice-card {
          background: #ffffff;
          border-radius: 22px;
          padding: 22px 26px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.025);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .dbs-notice-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.04);
        }

        .dbs-notice-card.is-pinned-card {
          border-left: 4px solid #f59e0b;
        }

        .dbs-card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
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
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .tag-pinned {
          background: #fef3c7;
          color: #b45309;
        }

        .tag-exam {
          background: #e0f2fe;
          color: #0369a1;
        }

        .tag-placement {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .tag-event {
          background: #dcfce7;
          color: #15803d;
        }

        .tag-academic {
          background: #ffedd5;
          color: #c2410c;
        }

        .dbs-date-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .dbs-notice-title {
          font-size: 1.12rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .dbs-notice-body {
          font-size: 0.88rem;
          color: #475569;
          margin: 0;
          line-height: 1.6;
        }

        .dbs-card-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          margin-top: 4px;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 12px;
        }

        .dbs-verified-stamp {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 500;
        }

        .dbs-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .dbs-download-btn:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        /* Empty State */
        .dbs-empty-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 48px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0,0,0,0.05);
        }

        .dbs-empty-icon {
          color: #cbd5e1;
          margin-bottom: 6px;
        }

        .dbs-empty-card h3 {
          font-size: 1.15rem;
          color: #0f172a;
          margin: 0;
        }

        .dbs-empty-card p {
          font-size: 0.86rem;
          color: #64748b;
          margin: 0;
        }

        .dbs-reset-btn {
          margin-top: 10px;
          padding: 8px 18px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 9999px;
          border: none;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .dbs-header-card {
            padding: 18px 16px;
            gap: 16px;
          }

          .dbs-header-right {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .dbs-search-pill {
            width: 100%;
            box-sizing: border-box;
          }

          .dbs-filter-track {
            overflow-x: auto;
            width: 100%;
            box-sizing: border-box;
          }

          .dbs-notice-card {
            padding: 18px 16px;
          }

          .dbs-card-footer-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .dbs-download-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
