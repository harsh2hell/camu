import React, { useState, useEffect, useCallback } from 'react';
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
  ExternalLink,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  FileCheck
} from 'lucide-react';
import { assignmentApi } from '../api/assignment';
import type { StudentAssignmentItemDTO } from '../../server/src/types/assignment';

export const LMSAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<StudentAssignmentItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Submission Modal state
  const [activeModalAssignment, setActiveModalAssignment] = useState<StudentAssignmentItemDTO | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Feedback Modal state
  const [feedbackAssignment, setFeedbackAssignment] = useState<StudentAssignmentItemDTO | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assignmentApi.getStudentAssignments();
      setAssignments(data);
    } catch (err: any) {
      console.error('Failed to load student assignments:', err);
      setError(err?.message || 'Unable to connect to LMS service. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleOpenSubmitModal = (item: StudentAssignmentItemDTO) => {
    setActiveModalAssignment(item);
    setSubmissionText(item.mySubmission?.submissionText || '');
    setSelectedFile(null);
    setSubmissionError(null);
  };

  const handleCloseSubmitModal = () => {
    if (submitting) return;
    setActiveModalAssignment(null);
    setSubmissionText('');
    setSelectedFile(null);
    setSubmissionError(null);
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalAssignment) return;

    if (!submissionText.trim() && !selectedFile && !activeModalAssignment.mySubmission?.submissionFileUrl) {
      setSubmissionError('Please provide either solution text/code or upload a document.');
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      let fileUrl = activeModalAssignment.mySubmission?.submissionFileUrl || undefined;

      // Handle file upload if a new file is chosen
      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedFile);
        const base64Content = await base64Promise;

        const uploadRes = await assignmentApi.uploadFile(
          selectedFile.name,
          base64Content,
          selectedFile.type
        );
        fileUrl = uploadRes.fileUrl;
      }

      const res = await assignmentApi.submitAssignment(activeModalAssignment.id, {
        submissionText: submissionText.trim() || undefined,
        submissionFileUrl: fileUrl,
      });

      showToast(res.message || 'Assignment submitted successfully!');
      handleCloseSubmitModal();
      await loadAssignments();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmissionError(err?.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadBrief = (title: string, attachmentUrl?: string | null) => {
    if (attachmentUrl) {
      assignmentApi.downloadFile(attachmentUrl, `${title.replace(/\s+/g, '_')}_brief.pdf`).catch((err) => {
        showToast(err.message || 'Failed to download brief');
      });
      showToast(`Downloading Question Brief for "${title}"...`);
    } else {
      showToast(`Official Question Brief for "${title}" is embedded in the portal.`);
    }
  };

  const handleDownloadMaterial = (title: string, size: string) => {
    showToast(`Downloading repository pack: "${title}" (${size})`);
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((item) => {
    const isSubmitted = item.submissionStatus === 'SUBMITTED_ON_TIME' || item.submissionStatus === 'SUBMITTED_LATE';
    const isGraded = item.submissionStatus === 'GRADED';
    const isPending = item.submissionStatus === 'PENDING' && !item.isOverdue;
    const isOverdue = item.isOverdue || item.submissionStatus === 'MISSED';

    let matchesFilter = true;
    if (statusFilter === 'PENDING') matchesFilter = isPending;
    else if (statusFilter === 'SUBMITTED') matchesFilter = isSubmitted;
    else if (statusFilter === 'GRADED') matchesFilter = isGraded;
    else if (statusFilter === 'OVERDUE') matchesFilter = isOverdue;

    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const pendingCount = assignments.filter((a) => a.submissionStatus === 'PENDING' && !a.isOverdue).length;
  const overdueCount = assignments.filter((a) => a.isOverdue || a.submissionStatus === 'MISSED').length;
  const gradedCount = assignments.filter((a) => a.submissionStatus === 'GRADED').length;

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
          {overdueCount > 0 && (
            <div className="lms-stat-pill pill-overdue">
              <span className="stat-indicator-dot dot-red"></span>
              <span>{overdueCount} Overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="lms-toolbar-card">
        <div className="lms-search-box">
          <Search size={15} className="lms-search-icon" />
          <input 
            type="text" 
            placeholder="Search assignments by title or course code..." 
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
            className={`lms-filter-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            Due Soon ({pendingCount})
          </button>
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'SUBMITTED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('SUBMITTED')}
          >
            Under Review
          </button>
          <button
            type="button"
            className={`lms-filter-btn ${statusFilter === 'GRADED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('GRADED')}
          >
            Evaluated ({gradedCount})
          </button>
          {overdueCount > 0 && (
            <button
              type="button"
              className={`lms-filter-btn ${statusFilter === 'OVERDUE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('OVERDUE')}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>
      </div>

      {/* Deliverables Section Title */}
      <div className="lms-section-header">
        <div>
          <h3 className="lms-section-title">Active Assignments &amp; Course Deliverables</h3>
          <p className="lms-section-subtitle">Turn in code repositories, written briefs, and design documents before cutoff deadlines.</p>
        </div>
        <button 
          type="button" 
          onClick={loadAssignments} 
          disabled={loading}
          className="lms-refresh-btn"
          title="Refresh assignment list"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && assignments.length === 0 && (
        <div className="lms-loading-card">
          <Loader2 size={32} className="animate-spin text-blue" />
          <p>Connecting to DBS LMS and synchronizing assignments...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="lms-error-card">
          <div className="error-left">
            <AlertCircle size={24} className="text-red" />
            <div>
              <p className="error-title">Unable to synchronize LMS deliverables</p>
              <p className="error-desc">{error}</p>
            </div>
          </div>
          <button type="button" onClick={loadAssignments} className="lms-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Deliverables Cards Grid */}
      {!loading && (
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
              const isSubmittedOnTime = item.submissionStatus === 'SUBMITTED_ON_TIME';
              const isSubmittedLate = item.submissionStatus === 'SUBMITTED_LATE';
              const isGraded = item.submissionStatus === 'GRADED';
              const isPending = item.submissionStatus === 'PENDING' && !item.isOverdue;
              const isOverdue = item.isOverdue || item.submissionStatus === 'MISSED';

              const formattedDueDate = new Date(item.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedDueTime = new Date(item.dueDate).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={item.id} className="assignment-modern-card">
                  {/* Top Meta Bar */}
                  <div className="asg-top-bar">
                    <span className="asg-subject-pill">{item.courseCode} &bull; {item.courseTitle}</span>
                    
                    {isPending && (
                      <span className="asg-status-pill pill-due">
                        <Clock size={12} />
                        <span>Due: {formattedDueDate}</span>
                      </span>
                    )}
                    {isOverdue && (
                      <span className="asg-status-pill pill-overdue">
                        <AlertCircle size={12} />
                        <span>Overdue</span>
                      </span>
                    )}
                    {isSubmittedOnTime && (
                      <span className="asg-status-pill pill-submitted">
                        <CheckCircle2 size={12} />
                        <span>Submitted (On-Time)</span>
                      </span>
                    )}
                    {isSubmittedLate && (
                      <span className="asg-status-pill pill-late">
                        <Clock size={12} />
                        <span>Submitted (Late)</span>
                      </span>
                    )}
                    {isGraded && (
                      <span className="asg-status-pill pill-graded">
                        <Award size={12} />
                        <span>Score: {item.mySubmission?.score} / {item.totalMarks}</span>
                      </span>
                    )}
                  </div>

                  {/* Assignment Title & Description */}
                  <h4 className="asg-card-title">{item.title}</h4>
                  {item.description && (
                    <p className="asg-card-desc">{item.description}</p>
                  )}

                  {/* Meta details */}
                  <div className="asg-meta-row">
                    <div className="asg-meta-item">
                      <span className="meta-label">Maximum Marks:</span>
                      <strong className="meta-value">{item.totalMarks} pts</strong>
                    </div>
                    <div className="asg-meta-item">
                      <span className="meta-label">Cutoff Time:</span>
                      <strong className="meta-value">{formattedDueDate} at {formattedDueTime}</strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="asg-card-actions">
                    <button 
                      type="button" 
                      className="asg-btn-brief"
                      onClick={() => handleDownloadBrief(item.title, item.attachmentUrl)}
                    >
                      <FileText size={14} />
                      <span>{item.attachmentUrl ? 'Official Brief (PDF)' : 'View Brief'}</span>
                    </button>

                    {(isPending || isOverdue) && (
                      <button 
                        type="button"
                        className="asg-btn-submit"
                        onClick={() => handleOpenSubmitModal(item)}
                      >
                        <UploadCloud size={14} />
                        <span>{item.mySubmission ? 'Resubmit Solution' : 'Submit Solution'}</span>
                      </button>
                    )}

                    {(isSubmittedOnTime || isSubmittedLate) && (
                      <div className="asg-action-group">
                        <div className="asg-verified-pill">
                          <CheckCircle2 size={14} className="text-emerald" />
                          <span>Turn-in Verified</span>
                        </div>
                        <button 
                          type="button" 
                          className="asg-btn-resubmit"
                          onClick={() => handleOpenSubmitModal(item)}
                          title="Update submission before instructor evaluates"
                        >
                          Update
                        </button>
                      </div>
                    )}

                    {isGraded && (
                      <button 
                        type="button" 
                        className="asg-btn-review"
                        onClick={() => setFeedbackAssignment(item)}
                      >
                        <ExternalLink size={14} />
                        <span>View Grade &amp; Feedback</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Submission Modal */}
      {activeModalAssignment && (
        <div className="lms-modal-backdrop" onClick={handleCloseSubmitModal}>
          <div className="lms-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="lms-modal-header">
              <div>
                <span className="lms-modal-tag">{activeModalAssignment.courseCode} Deliverable</span>
                <h3 className="lms-modal-title">{activeModalAssignment.title}</h3>
              </div>
              <button 
                type="button" 
                className="lms-modal-close" 
                onClick={handleCloseSubmitModal}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitSolution} className="lms-modal-body">
              {submissionError && (
                <div className="lms-modal-error">
                  <AlertCircle size={16} />
                  <span>{submissionError}</span>
                </div>
              )}

              <div className="lms-form-group">
                <label className="lms-form-label">
                  Solution Text / Code Notes / Answers:
                </label>
                <textarea 
                  rows={4}
                  className="lms-textarea"
                  placeholder="Enter code snippets, write-up summaries, GitHub repo URLs, or theoretical proofs..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="lms-form-group">
                <label className="lms-form-label">
                  Attach Solution Document (PDF, ZIP, DOCX, Code):
                </label>
                <div className="lms-file-dropzone">
                  <input 
                    type="file"
                    id="lms-file-input"
                    className="lms-file-hidden"
                    accept=".pdf,.zip,.docx,.txt,.py,.java,.cpp,.sql,.png,.jpg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    disabled={submitting}
                  />
                  <label htmlFor="lms-file-input" className="lms-dropzone-label">
                    <UploadCloud size={24} className="text-blue" />
                    <span>{selectedFile ? selectedFile.name : 'Click to select file or drag & drop'}</span>
                    <span className="lms-file-subtext">Supported: PDF, ZIP, DOCX, Python, Java, SQL (Max 10MB)</span>
                  </label>
                </div>
                {activeModalAssignment.mySubmission?.submissionFileUrl && !selectedFile && (
                  <p className="lms-existing-file">
                    <FileCheck size={14} className="text-emerald" />
                    <span>Existing uploaded file on record: <strong>{activeModalAssignment.mySubmission.submissionFileUrl}</strong></span>
                  </p>
                )}
              </div>

              <div className="lms-modal-footer">
                <button 
                  type="button" 
                  className="lms-btn-cancel" 
                  onClick={handleCloseSubmitModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="lms-btn-confirm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Confirm &amp; Turn In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Graded Feedback Modal */}
      {feedbackAssignment && feedbackAssignment.mySubmission && (
        <div className="lms-modal-backdrop" onClick={() => setFeedbackAssignment(null)}>
          <div className="lms-modal-box feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lms-modal-header">
              <div>
                <span className="lms-modal-tag tag-emerald">Official Evaluation</span>
                <h3 className="lms-modal-title">{feedbackAssignment.title}</h3>
              </div>
              <button 
                type="button" 
                className="lms-modal-close" 
                onClick={() => setFeedbackAssignment(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lms-feedback-body">
              <div className="score-banner">
                <div className="score-circle">
                  <span className="score-val">{feedbackAssignment.mySubmission.score}</span>
                  <span className="score-max">/ {feedbackAssignment.totalMarks}</span>
                </div>
                <div className="score-text">
                  <h4>Grade: {((Number(feedbackAssignment.mySubmission.score) / feedbackAssignment.totalMarks) * 100).toFixed(0)}%</h4>
                  <p>Status: {feedbackAssignment.mySubmission.status}</p>
                </div>
              </div>

              <div className="feedback-section">
                <h5>Faculty Remarks &amp; Feedback:</h5>
                <div className="feedback-content-box">
                  {feedbackAssignment.mySubmission.feedback || 'Evaluated and approved by department faculty.'}
                </div>
              </div>

              {feedbackAssignment.mySubmission.gradedAt && (
                <p className="graded-timestamp">
                  Evaluated on {new Date(feedbackAssignment.mySubmission.gradedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="lms-modal-footer">
              <button 
                type="button" 
                className="lms-btn-cancel" 
                onClick={() => setFeedbackAssignment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="mat-dept-badge">Core Theory</span>
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
          max-width: 100%;
          margin: 0;
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

        .pill-overdue {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .dot-red {
          background: #ef4444 !important;
        }

        .stat-indicator-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3b82f6;
        }

        /* 3. TOOLBAR CARD */
        .lms-toolbar-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 16px 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .lms-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 14px;
          flex: 1;
          min-width: 240px;
          max-width: 440px;
        }

        .lms-search-icon {
          color: #94a3b8;
        }

        .lms-search-input {
          border: none;
          background: transparent;
          font-size: 0.84rem;
          color: #1e293b;
          width: 100%;
          outline: none;
        }

        .lms-filter-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .lms-filter-btn {
          border: none;
          background: #f1f5f9;
          color: #64748b;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .lms-filter-btn.active {
          background: #0f172a;
          color: #ffffff;
        }

        /* 4. SECTION HEADER */
        .lms-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }

        .lms-section-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .lms-section-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
        }

        .lms-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .lms-refresh-btn:hover {
          background: #f1f5f9;
        }

        /* 5. LOADING & ERROR STATES */
        .lms-loading-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          font-size: 0.9rem;
        }

        .lms-error-card {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .error-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .error-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #991b1b;
          margin: 0 0 2px 0;
        }

        .error-desc {
          font-size: 0.8rem;
          color: #b91c1c;
          margin: 0;
        }

        .lms-retry-btn {
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* 6. GRID OF CARDS */
        .assignments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }

        .assignment-modern-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 22px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .assignment-modern-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }

        .asg-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .asg-subject-pill {
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .asg-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 9999px;
        }

        .pill-due {
          background: #fff7ed;
          color: #ea580c;
          border: 1px solid #ffedd5;
        }

        .pill-submitted {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #d1fae5;
        }

        .pill-late {
          background: #fef3c7;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        .pill-graded {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .asg-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.35;
        }

        .asg-card-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .asg-meta-row {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }

        .asg-meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 0.68rem;
          color: #94a3b8;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .meta-value {
          font-size: 0.82rem;
          color: #1e293b;
          font-weight: 700;
        }

        .asg-card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
        }

        .asg-action-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .asg-btn-brief {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .asg-btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          font-size: 0.76rem;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .asg-btn-submit:hover {
          background: #1d4ed8;
        }

        .asg-btn-resubmit {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .asg-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: #059669;
          font-weight: 600;
        }

        .asg-btn-review {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 0.76rem;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* 7. MATERIALS SECTION */
        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-modern-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .mat-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-blue { background: #eff6ff; color: #2563eb; }
        .icon-emerald { background: #ecfdf5; color: #059669; }
        .icon-indigo { background: #e0e7ff; color: #4f46e5; }

        .mat-text-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mat-tags {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mat-code-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: #0f172a;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .mat-dept-badge {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
        }

        .mat-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .mat-card-sub {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0;
        }

        .mat-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* 8. MODALS */
        .lms-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          padding: 16px;
          box-sizing: border-box;
        }

        .lms-modal-box {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: modalEnter 0.2s ease-out;
        }

        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .lms-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          background: #f8fafc;
        }

        .lms-modal-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 4px;
        }

        .tag-emerald {
          color: #059669;
          background: #ecfdf5;
        }

        .lms-modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .lms-modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .lms-modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .lms-modal-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lms-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .lms-form-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
        }

        .lms-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.84rem;
          font-family: inherit;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
        }

        .lms-textarea:focus {
          border-color: #2563eb;
        }

        .lms-file-dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 18px;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .lms-file-dropzone:hover {
          border-color: #3b82f6;
        }

        .lms-file-hidden {
          display: none;
        }

        .lms-dropzone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
        }

        .lms-file-subtext {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 400;
        }

        .lms-existing-file {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          color: #059669;
          margin: 4px 0 0 0;
        }

        .lms-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
        }

        .lms-btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .lms-btn-confirm {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .lms-btn-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 9. FEEDBACK MODAL */
        .lms-feedback-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .score-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 16px 20px;
          border-radius: 16px;
        }

        .score-circle {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .score-val {
          font-size: 2rem;
          font-weight: 900;
          color: #065f46;
        }

        .score-max {
          font-size: 1.1rem;
          color: #047857;
          font-weight: 700;
        }

        .score-text h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #065f46;
        }

        .score-text p {
          margin: 2px 0 0 0;
          font-size: 0.78rem;
          color: #047857;
          font-weight: 600;
        }

        .feedback-section h5 {
          margin: 0 0 8px 0;
          font-size: 0.84rem;
          font-weight: 700;
          color: #334155;
        }

        .feedback-content-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 0.86rem;
          color: #1e293b;
          line-height: 1.5;
        }

        .graded-timestamp {
          font-size: 0.72rem;
          color: #94a3b8;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
