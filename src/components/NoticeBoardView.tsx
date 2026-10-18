import { useState } from 'react';
import { 
  Pin, 
  Calendar, 
  Download, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { MOCK_NOTICES } from '../data/mockData';

export const NoticeBoardView: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['ALL', 'EXAM', 'PLACEMENT', 'EVENT', 'ACADEMIC'];

  const filteredNotices = MOCK_NOTICES.filter(notice => {
    const matchesFilter = filter === 'ALL' || notice.category === filter;
    const matchesSearch = notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          notice.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="notice-container animate-fade-in">
      <div className="notice-header glass-panel">
        <div>
          <h2 className="heading-display page-title">University Noticeboard & Circulars</h2>
          <p className="page-desc">
            Direct announcements from the Registrar, Dean Academics, and Exam Controller.
          </p>
        </div>

        <div className="notice-header-right">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search circulars..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filter Pills */}
          <div className="filter-group">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${filter === cat ? 'filter-active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notices Feed */}
      <div className="notices-list">
        {filteredNotices.map(notice => (
          <div key={notice.id} className={`notice-card glass-panel ${notice.isPinned ? 'notice-pinned' : ''}`}>
            <div className="notice-top">
              <div className="notice-badge-group">
                {notice.isPinned && (
                  <span className="badge badge-warning">
                    <Pin size={12} /> Pinned Circular
                  </span>
                )}
                <span className="badge badge-info">
                  {notice.category}
                </span>
              </div>
              <div className="notice-date">
                <Calendar size={13} /> {notice.date}
              </div>
            </div>

            <h3 className="notice-title">{notice.title}</h3>
            <p className="notice-desc">{notice.description}</p>

            <div className="notice-footer">
              <span className="official-stamp">
                <CheckCircle2 size={14} className="text-success" /> Verified Official Circular &bull; DBS Registrar Office
              </span>
              <button className="btn btn-ghost notice-dl-btn">
                <Download size={14} /> Official Circular (PDF)
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .notice-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .notice-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .filter-group {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          padding: 4px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          overflow-x: auto;
        }

        .filter-btn {
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .filter-btn:hover {
          color: var(--text-primary);
        }

        .filter-active {
          background: var(--blue-600);
          color: white !important;
        }

        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .notice-card {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-left: 3px solid transparent;
        }

        .notice-pinned {
          border-left: 3px solid var(--amber-500);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(11, 19, 41, 0.7));
        }

        .notice-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notice-badge-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notice-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .notice-title {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .notice-desc {
          font-size: 0.88rem;
          color: var(--slate-300);
          line-height: 1.5;
        }

        .notice-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle);
          flex-wrap: wrap;
          gap: 10px;
        }

        .official-stamp {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .notice-dl-btn {
          font-size: 0.8rem;
          padding: 6px 12px;
        }
      `}</style>
    </div>
  );
};
