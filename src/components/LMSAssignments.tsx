import React, { useState } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Award,
  Search,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { MOCK_ASSIGNMENTS, type AssignmentItem } from '../data/mockData';

export const LMSAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(MOCK_ASSIGNMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'submitted' | 'graded'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handleSimulatedSubmit = (id: string, title: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, status: 'submitted' as const };
    }));

    showToast(`Solution PDF for "${title}" successfully uploaded and timestamped!`);
  };

  const handleDownloadMaterial = (title: string, size: string) => {
    showToast(`Downloading repository pack: "${title}" (${size})`);
  };

  const handleDownloadBrief = (title: string) => {
    showToast(`Opening Question Brief: "${title}" (Official PDF)`);
  };

  const filteredAssignments = assignments.filter(item => {
    const matchesFilter = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const gradedCount = assignments.filter(a => a.status === 'graded').length;

  return (
    <div className="lms-page-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="lms-toast-pill">
          <CheckCircle2 size={16} className="toast-icon-emerald" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Header Card */}
      <div className="lms-header-card">
        <div className="lms-header-info">
          <div className="lms-header-badge">
            <Sparkles size={13} className="text-blue" />
            <span>Academic Portal &bull; DBS Global University</span>
          </div>
          <h2 className="lms-header-title">Academics &amp; Learning Management (LMS)</h2>
          <p className="lms-header-desc">
            Assignments, syllabus repositories, and lecture slides with deadline countdowns.
          </p>
        </div>

        <div className="lms-header-badges">
          <div className="lms-credit-pill">
            <Award size={15} className="text-amber" />
            <span>Semester 5 Credits: <strong>24.0</strong></span>
          </div>
          <div className="lms-stat-pill">
            <span className="stat-indicator-dot"></span>
            <span>{pendingCount} Pending Turn-ins</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="lms-toolbar-card">
        <div className="lms-search-box">
          <Search size={15} className="lms-search-icon" />
          <input 
            type="text" 
            placeholder="Search assignments by title or subject code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="lms-search-input"
          />
        </div>

        <div className="lms-filter-tabs">
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Deliverables ({assignments.length})
          </button>
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Due Soon ({pendingCount})
          </button>
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            Under Review
          </button>
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'graded' ? 'active' : ''}`}
            onClick={() => setStatusFilter('graded')}
          >
            Evaluated ({gradedCount})
          </button>
        </div>
      </div>

      {/* Deliverables Section Title */}
      <div className="lms-section-header">
        <div>
          <h3 className="lms-section-title">Active Assignments &amp; Course Deliverables</h3>
          <p className="lms-section-subtitle">Turn in code repositories, written briefs, and design documents before cutoff deadlines.</p>
        </div>
      </div>

      {/* Deliverables Cards Grid */}
      <div className="assignments-grid">
        {filteredAssignments.length === 0 ? (
          <div className="lms-empty-state">
            <FileText size={36} className="empty-icon" />
            <h4>No assignments found</h4>
            <p>Try clearing your search query or switching the status filter tab.</p>
            <button 
              type="button" 
              className="lms-reset-btn"
              onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredAssignments.map((item) => {
            const isPending = item.status === 'pending';
            const isSubmitted = item.status === 'submitted';
            const isGraded = item.status === 'graded';

            return (
              <div key={item.id} className="assignment-modern-card">
                {/* Top Meta Bar */}
                <div className="asg-top-bar">
                  <span className="asg-subject-pill">{item.subject}</span>
                  
                  {isPending && (
                    <span className="asg-status-pill pill-due">
                      <Clock size={12} />
                      <span>Due: {item.dueDate}</span>
                    </span>
                  )}
                  {isSubmitted && (
                    <span className="asg-status-pill pill-submitted">
                      <CheckCircle2 size={12} />
                      <span>Submitted for Grading</span>
                    </span>
                  )}
                  {isGraded && (
                    <span className="asg-status-pill pill-graded">
                      <Award size={12} />
                      <span>Score: {item.score} / {item.totalMarks}</span>
                    </span>
                  )}
                </div>

                {/* Assignment Title */}
                <h4 className="asg-card-title">{item.title}</h4>

                {/* Meta details */}
                <div className="asg-meta-row">
                  <div className="asg-meta-item">
                    <span className="meta-label">Maximum Marks:</span>
                    <strong className="meta-value">{item.totalMarks} pts</strong>
                  </div>
                  <div className="asg-meta-item">
                    <span className="meta-label">Cutoff Time:</span>
                    <strong className="meta-value">{item.dueTime}</strong>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="asg-card-actions">
                  <button 
                    type="button" 
                    className="asg-btn-brief"
                    onClick={() => handleDownloadBrief(item.title)}
                  >
                    <FileText size={14} />
                    <span>Question Brief (PDF)</span>
                  </button>

                  {isPending && (
                    <button 
                      type="button"
                      className="asg-btn-submit"
                      onClick={() => handleSimulatedSubmit(item.id, item.title)}
                    >
                      <UploadCloud size={14} />
                      <span>Submit Solution</span>
                    </button>
                  )}

                  {isSubmitted && (
                    <div className="asg-verified-pill">
                      <CheckCircle2 size={14} className="text-emerald" />
                      <span>Turn-in Verified</span>
                    </div>
                  )}

                  {isGraded && (
                    <button 
                      type="button" 
                      className="asg-btn-review"
                      onClick={() => showToast(`Opening Graded Feedback sheet for "${item.title}"`)}
                    >
                      <ExternalLink size={14} />
                      <span>View Feedback</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Course Materials & Syllabus Repositories */}
      <div className="lms-section-header" style={{ marginTop: '24px' }}>
        <div>
          <h3 className="lms-section-title">Course Materials &amp; Lecture Handouts</h3>
          <p className="lms-section-subtitle">Official slide decks, laboratory sheets, and textbook repositories curated by faculty.</p>
        </div>
      </div>

      <div className="materials-list">
        <div className="material-modern-card">
          <div className="mat-left">
            <div className="mat-icon-wrapper icon-blue">
              <BookOpen size={20} />
            </div>
            <div className="mat-text-wrap">
              <div className="mat-tags">
                <span className="mat-code-badge">CS302</span>
                <span className="mat-dept-badge">Computer Science</span>
              </div>
              <h4 className="mat-card-title">CS302: Design &amp; Analysis of Algorithms</h4>
              <p className="mat-card-sub">
                Module 1 to 4 Complete Slides, Dynamic Programming, Lecture Notes &amp; Practice Sets
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="mat-download-btn"
            onClick={() => handleDownloadMaterial("CS302 Lecture Slides Pack", "42 MB PDF")}
          >
            <Download size={14} />
            <span>Download Pack (42 MB)</span>
          </button>
        </div>

        <div className="material-modern-card">
          <div className="mat-left">
            <div className="mat-icon-wrapper icon-emerald">
              <BookOpen size={20} />
            </div>
            <div className="mat-text-wrap">
              <div className="mat-tags">
                <span className="mat-code-badge">CS304</span>
                <span className="mat-dept-badge">Database Systems</span>
              </div>
              <h4 className="mat-card-title">CS304: Database Management Systems</h4>
              <p className="mat-card-sub">
                PostgreSQL Lab Schema, Query Optimization, Normalization (3NF/BCNF) &amp; Transaction Notes
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="mat-download-btn"
            onClick={() => handleDownloadMaterial("CS304 DBMS Handbook & Lab Files", "28 MB PDF")}
          >
            <Download size={14} />
            <span>Download Pack (28 MB)</span>
          </button>
        </div>

        <div className="material-modern-card">
          <div className="mat-left">
            <div className="mat-icon-wrapper icon-indigo">
              <BookOpen size={20} />
            </div>
            <div className="mat-text-wrap">
              <div className="mat-tags">
                <span className="mat-code-badge">CS310</span>
                <span className="mat-dept-badge">Systems Architecture</span>
              </div>
              <h4 className="mat-card-title">CS310: Cloud Computing &amp; Microservices</h4>
              <p className="mat-card-sub">
                Docker Containers, Kubernetes Deployment Manifests &amp; AWS EC2 Architectural Guides
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="mat-download-btn"
            onClick={() => handleDownloadMaterial("CS310 Cloud Labs & Deployment Manifests", "35 MB PDF")}
          >
            <Download size={14} />
            <span>Download Pack (35 MB)</span>
          </button>
        </div>
      </div>

      <style>{`
        .lms-page-container {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
        }

        /* 1. TOAST */
        .lms-toast-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.84rem;
          font-weight: 500;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }

        .toast-icon-emerald {
          color: #10b981;
        }

        /* 2. HEADER CARD */
        .lms-header-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px 28px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .lms-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 4px 10px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }

        .lms-header-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 6px 0;
        }

        .lms-header-desc {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .lms-header-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .lms-credit-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .lms-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .stat-indicator-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3b82f6;
        }

        .text-amber {
          color: #d97706;
        }

        .text-blue {
          color: #2563eb;
        }

        /* 3. TOOLBAR CARD */
        .lms-toolbar-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 12px 18px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .lms-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 8px 16px;
          min-width: 280px;
          flex: 1;
          max-width: 440px;
        }

        .lms-search-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .lms-search-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.82rem;
          color: #0f172a;
          width: 100%;
        }

        .lms-search-input::placeholder {
          color: #94a3b8;
        }

        .lms-filter-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 9999px;
          overflow-x: auto;
        }

        .lms-filter-btn {
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .lms-filter-btn.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        /* 4. SECTION HEADER */
        .lms-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 4px 4px 0;
        }

        .lms-section-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          margin: 0 0 4px 0;
        }

        .lms-section-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
        }

        /* 5. ASSIGNMENTS GRID */
        .assignments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 18px;
        }

        .assignment-modern-card {
          background: #ffffff;
          border-radius: 22px;
          padding: 22px 24px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.025);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }

        .asg-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .asg-subject-pill {
          font-size: 0.74rem;
          font-weight: 700;
          color: #1e40af;
          background: #eff6ff;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #dbeafe;
        }

        .asg-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .pill-due {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
        }

        .pill-submitted {
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          color: #0369a1;
        }

        .pill-graded {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
        }

        .asg-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin: 0;
        }

        .asg-meta-row {
          display: flex;
          align-items: center;
          gap: 18px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }

        .asg-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          color: #0f172a;
          font-weight: 700;
        }

        .asg-card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 4px;
          border-top: 1px solid #f1f5f9;
        }

        .asg-btn-brief {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 9999px;
          cursor: pointer;
        }

        .asg-btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          border: 1px solid #2563eb;
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(37, 99, 235, 0.25);
        }

        .asg-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 6px 14px;
          border-radius: 9999px;
        }

        .asg-btn-review {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 9999px;
          cursor: pointer;
        }

        /* 6. MATERIALS LIST */
        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-modern-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 18px 24px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .mat-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 280px;
        }

        .mat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .icon-emerald {
          background: #ecfdf5;
          color: #059669;
        }

        .icon-indigo {
          background: #eef2ff;
          color: #4f46e5;
        }

        .mat-text-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mat-tags {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mat-code-badge {
          font-size: 0.7rem;
          font-weight: 800;
          color: #2563eb;
          background: #eff6ff;
          padding: 2px 7px;
          border-radius: 6px;
        }

        .mat-dept-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
        }

        .mat-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .mat-card-sub {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          line-height: 1.35;
        }

        .mat-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 9999px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .mat-download-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        /* EMPTY STATE */
        .lms-empty-state {
          grid-column: 1 / -1;
          background: #ffffff;
          border-radius: 20px;
          padding: 40px 20px;
          text-align: center;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon {
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .lms-empty-state h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .lms-empty-state p {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0 0 10px 0;
        }

        .lms-reset-btn {
          border: 1px solid #2563eb;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 9999px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .lms-header-card {
            padding: 20px;
          }
          .assignments-grid {
            grid-template-columns: 1fr;
          }
          .lms-toolbar-card {
            flex-direction: column;
            align-items: stretch;
          }
          .lms-search-box {
            max-width: 100%;
          }
          .material-modern-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .mat-download-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
