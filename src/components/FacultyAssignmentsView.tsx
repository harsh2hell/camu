import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  X, 
  Users, 
  Eye, 
  CheckCheck
} from 'lucide-react';
import { assignmentApi } from '../api/assignment';
import { timetableApi } from '../api/timetable';
import type { 
  FacultyAssignmentItemDTO, 
  SubmissionDetailsDTO 
} from '../../server/src/types/assignment';

export const FacultyAssignmentsView: React.FC = () => {
  const [assignments, setAssignments] = useState<FacultyAssignmentItemDTO[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<Array<{ courseOfferingId: string; courseCode: string; courseTitle: string; sectionName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newOfferingId, setNewOfferingId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState(50);
  const [newIsPublished, setNewIsPublished] = useState(true);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Submissions Review Modal
  const [reviewAssignment, setReviewAssignment] = useState<FacultyAssignmentItemDTO | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDetailsDTO[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, courses] = await Promise.all([
        assignmentApi.getFacultyAssignments(),
        timetableApi.getFacultyAssignedCourses().catch(() => []),
      ]);
      setAssignments(data);
      setAssignedCourses(courses);
      if (courses.length > 0 && !newOfferingId) {
        setNewOfferingId(courses[0].courseOfferingId);
      }
    } catch (err: any) {
      console.error('Failed to load faculty assignments:', err);
      setError(err?.message || 'Unable to connect to Faculty LMS API.');
    } finally {
      setLoading(false);
    }
  }, [newOfferingId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Open submissions modal
  const handleOpenReview = async (item: FacultyAssignmentItemDTO) => {
    setReviewAssignment(item);
    setLoadingSubmissions(true);
    try {
      const subs = await assignmentApi.getAssignmentSubmissions(item.id);
      setSubmissions(subs);
      // Initialize scores/feedbacks state
      const initialScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      for (const s of subs) {
        if (s.score !== null) initialScores[s.id] = s.score;
        if (s.feedback) initialFeedbacks[s.id] = s.feedback;
      }
      setGradingScores(initialScores);
      setGradingFeedbacks(initialFeedbacks);
    } catch (err: any) {
      console.error('Failed to load assignment submissions:', err);
      showToast('Error loading submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Create Assignment submit
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('Please enter an assignment title.');
      return;
    }
    if (!newDueDate) {
      setCreateError('Please select a submission cutoff due date.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await assignmentApi.createAssignment({
        courseOfferingId: newOfferingId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        attachmentUrl: newAttachmentUrl.trim() || undefined,
        dueDate: new Date(newDueDate).toISOString(),
        totalMarks: Number(newTotalMarks),
        isPublished: newIsPublished,
      });

      showToast(`Assignment "${newTitle}" created successfully!`);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewAttachmentUrl('');
      await loadAssignments();
    } catch (err: any) {
      console.error('Assignment creation failed:', err);
      setCreateError(err?.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
    }
  };

  // Grade individual submission
  const handleGradeSubmission = async (submissionId: string) => {
    if (!reviewAssignment) return;
    const score = gradingScores[submissionId];
    if (score === undefined || score < 0 || score > reviewAssignment.totalMarks) {
      showToast(`Please enter a valid score between 0 and ${reviewAssignment.totalMarks}.`);
      return;
    }

    setGradingSubmissionId(submissionId);
    try {
      await assignmentApi.gradeSubmission(reviewAssignment.id, submissionId, {
        score,
        feedback: gradingFeedbacks[submissionId] || undefined,
      });

      showToast('Evaluation and score saved successfully!');
      // Refresh submissions
      const updated = await assignmentApi.getAssignmentSubmissions(reviewAssignment.id);
      setSubmissions(updated);
      await loadAssignments();
    } catch (err: any) {
      console.error('Grading failed:', err);
      showToast(err?.message || 'Failed to save evaluation.');
    } finally {
      setGradingSubmissionId(null);
    }
  };

  const filtered = assignments.filter((a) => {
    return (
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalAssignmentsCount = assignments.length;
  const totalSubmissionsCount = assignments.reduce((acc, a) => acc + a.totalSubmissions, 0);
  const totalPendingReviewCount = assignments.reduce((acc, a) => acc + a.pendingReviewCount, 0);

  return (
    <div className="faculty-lms-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="lms-toast-pill">
          <CheckCircle2 size={16} className="toast-icon-emerald" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="fac-lms-header">
        <div className="fac-header-info">
          <div className="fac-header-badge">
            <Sparkles size={13} className="text-blue" />
            <span>Faculty LMS &bull; DBS Global University</span>
          </div>
          <h2 className="fac-header-title">Course Assignments &amp; Grading Desk</h2>
          <p className="fac-header-desc">
            Publish coursework deliverables, monitor turn-in counts, and evaluate student submissions.
          </p>
        </div>

        <div className="fac-header-stats">
          <div className="fac-stat-pill">
            <BookOpen size={15} className="text-blue" />
            <span>Active Deliverables: <strong>{totalAssignmentsCount}</strong></span>
          </div>
          <div className="fac-stat-pill">
            <Users size={15} className="text-emerald" />
            <span>Submissions: <strong>{totalSubmissionsCount}</strong></span>
          </div>
          <div className="fac-stat-pill pill-amber">
            <Clock size={15} className="text-amber" />
            <span>Pending Review: <strong>{totalPendingReviewCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="fac-toolbar">
        <div className="fac-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search assignments by title or course..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="fac-toolbar-actions">
          <button 
            type="button" 
            onClick={loadAssignments} 
            disabled={loading}
            className="fac-btn-secondary"
            title="Refresh assignments"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            onClick={() => setShowCreateModal(true)}
            className="fac-btn-primary"
          >
            <PlusCircle size={15} />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && assignments.length === 0 && (
        <div className="fac-loading-card">
          <Loader2 size={32} className="animate-spin text-blue" />
          <p>Loading course assignments and submission metrics...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="fac-error-card">
          <div className="error-left">
            <AlertCircle size={24} className="text-red" />
            <div>
              <p className="error-title">Unable to synchronize faculty assignments</p>
              <p className="error-desc">{error}</p>
            </div>
          </div>
          <button type="button" onClick={loadAssignments} className="fac-retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {/* Assignments List */}
      {!loading && (
        <div className="fac-assignments-grid">
          {filtered.length === 0 ? (
            <div className="fac-empty-state">
              <BookOpen size={40} className="empty-icon" />
              <h4>No assignments found</h4>
              <p>Create a new assignment for your enrolled course offerings.</p>
              <button 
                type="button" 
                className="fac-btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusCircle size={15} />
                <span>Create First Assignment</span>
              </button>
            </div>
          ) : (
            filtered.map((item) => {
              const formattedDueDate = new Date(item.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={item.id} className="fac-card">
                  <div className="fac-card-header">
                    <span className="fac-course-badge">
                      {item.courseCode} &bull; {item.courseTitle} ({item.sectionName})
                    </span>
                    <span className={`fac-publish-badge ${item.isPublished ? 'published' : 'draft'}`}>
                      {item.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="fac-card-title">{item.title}</h3>
                  {item.description && (
                    <p className="fac-card-desc">{item.description}</p>
                  )}

                  <div className="fac-meta-grid">
                    <div className="meta-box">
                      <span className="meta-lbl">Cutoff Due</span>
                      <strong className="meta-val">{formattedDueDate}</strong>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">Max Marks</span>
                      <strong className="meta-val">{item.totalMarks} pts</strong>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">Submissions</span>
                      <strong className="meta-val text-blue">{item.totalSubmissions} turned in</strong>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">Evaluated</span>
                      <strong className="meta-val text-emerald">{item.gradedSubmissions} graded</strong>
                    </div>
                  </div>

                  <div className="fac-card-footer">
                    <button 
                      type="button" 
                      className="fac-btn-review"
                      onClick={() => handleOpenReview(item)}
                    >
                      <Eye size={14} />
                      <span>Review Submissions ({item.totalSubmissions})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">New Coursework</span>
                <h3 className="modal-title">Create &amp; Publish Assignment</h3>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="modal-body">
              {createError && (
                <div className="modal-error-box">
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Course Offering:</label>
                <select 
                  className="form-select"
                  value={newOfferingId}
                  onChange={(e) => setNewOfferingId(e.target.value)}
                  disabled={creating}
                >
                  {assignedCourses.length > 0 ? (
                    assignedCourses.map((c) => (
                      <option key={c.courseOfferingId} value={c.courseOfferingId}>
                        {c.courseCode}: {c.courseTitle} ({c.sectionName || 'Section A'})
                      </option>
                    ))
                  ) : (
                    <option value="b0000000-0000-4000-8000-000000000001">
                      CS302: Design &amp; Analysis of Algorithms (Section A)
                    </option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assignment Title:</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g., Problem Set 5: Dynamic Programming & Matrix Chain"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={creating}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description &amp; Guidelines:</label>
                <textarea 
                  rows={3}
                  className="form-textarea"
                  placeholder="Outline the problem scope, submission expectations, and grading rubrics..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Submission Due Date &amp; Time:</label>
                  <input 
                    type="datetime-local"
                    className="form-input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    disabled={creating}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Marks:</label>
                  <input 
                    type="number"
                    className="form-input"
                    min={1}
                    max={1000}
                    value={newTotalMarks}
                    onChange={(e) => setNewTotalMarks(Number(e.target.value))}
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Question Brief / Attachment URL (Optional):</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="/uploads/brief.pdf or https://..."
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="form-checkbox-row">
                <input 
                  type="checkbox"
                  id="publish-chk"
                  checked={newIsPublished}
                  onChange={(e) => setNewIsPublished(e.target.checked)}
                  disabled={creating}
                />
                <label htmlFor="publish-chk" className="checkbox-label">
                  Publish assignment immediately to student LMS and Academic Calendar
                </label>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      <span>Publish Deliverable</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submissions Modal */}
      {reviewAssignment && (
        <div className="modal-overlay" onClick={() => setReviewAssignment(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">{reviewAssignment.courseCode} Submissions</span>
                <h3 className="modal-title">{reviewAssignment.title}</h3>
                <p className="modal-subtitle">
                  Max Marks: <strong>{reviewAssignment.totalMarks}</strong> &bull; Total Submissions: <strong>{submissions.length}</strong>
                </p>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setReviewAssignment(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body submissions-body">
              {loadingSubmissions ? (
                <div className="fac-loading-card">
                  <Loader2 size={28} className="animate-spin text-blue" />
                  <p>Fetching student submissions...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="fac-empty-state">
                  <Clock size={36} className="empty-icon" />
                  <h4>No submissions turned in yet</h4>
                  <p>Student turn-ins will appear here as soon as they submit solutions.</p>
                </div>
              ) : (
                <div className="submissions-table-wrap">
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Submitted At</th>
                        <th>Status</th>
                        <th>Submission Content</th>
                        <th>Score ({reviewAssignment.totalMarks})</th>
                        <th>Feedback &amp; Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => {
                        const isLate = sub.status === 'SUBMITTED_LATE';
                        const isGraded = sub.status === 'GRADED';
                        const isGradingThis = gradingSubmissionId === sub.id;

                        return (
                          <tr key={sub.id}>
                            <td>
                              <div className="student-cell">
                                <strong className="st-name">{sub.studentName}</strong>
                                <span className="st-roll">{sub.studentRollNo}</span>
                              </div>
                            </td>
                            <td>
                              <span className="time-cell">
                                {new Date(sub.submittedAt).toLocaleString()}
                              </span>
                            </td>
                            <td>
                              <span className={`sub-status-pill ${isLate ? 'pill-late' : isGraded ? 'pill-graded' : 'pill-ontime'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td>
                              <div className="content-cell">
                                {sub.submissionText && (
                                  <p className="sub-text-snippet" title={sub.submissionText}>
                                    {sub.submissionText}
                                  </p>
                                )}
                                {sub.submissionFileUrl && (
                                  <button
                                    type="button"
                                    onClick={() => assignmentApi.downloadFile(sub.submissionFileUrl!, `${sub.studentName.replace(/\s+/g, '_')}_submission`)}
                                    className="sub-file-link"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Download student submission file"
                                  >
                                    <FileText size={13} />
                                    <span>Attachment</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="score-input-cell">
                                <input 
                                  type="number"
                                  className="grade-num-input"
                                  min={0}
                                  max={reviewAssignment.totalMarks}
                                  value={gradingScores[sub.id] !== undefined ? gradingScores[sub.id] : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    setGradingScores((prev) => ({ ...prev, [sub.id]: val as number }));
                                  }}
                                  placeholder="0"
                                />
                                <span className="max-score-hint">/ {reviewAssignment.totalMarks}</span>
                              </div>
                            </td>
                            <td>
                              <div className="action-grade-cell">
                                <input 
                                  type="text"
                                  className="feedback-text-input"
                                  placeholder="Instructor comments..."
                                  value={gradingFeedbacks[sub.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGradingFeedbacks((prev) => ({ ...prev, [sub.id]: val }));
                                  }}
                                />
                                <button 
                                  type="button" 
                                  className="btn-save-grade"
                                  disabled={isGradingThis}
                                  onClick={() => handleGradeSubmission(sub.id)}
                                >
                                  {isGradingThis ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCheck size={13} />
                                  )}
                                  <span>{isGraded ? 'Update' : 'Grade'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setReviewAssignment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-lms-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .fac-lms-header {
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

        .fac-header-badge {
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

        .fac-header-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .fac-header-desc {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .fac-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fac-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          color: #334155;
        }

        .pill-amber {
          background: #fffbeb;
          border-color: #fde68a;
          color: #b45309;
        }

        .fac-toolbar {
          background: #ffffff;
          border-radius: 20px;
          padding: 16px 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .fac-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 14px;
          flex: 1;
          max-width: 440px;
        }

        .search-icon { color: #94a3b8; }
        .search-input {
          border: none;
          background: transparent;
          font-size: 0.84rem;
          color: #1e293b;
          width: 100%;
          outline: none;
        }

        .fac-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fac-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
        }

        .fac-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 10px;
          cursor: pointer;
        }

        .fac-assignments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 16px;
        }

        .fac-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 22px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .fac-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .fac-course-badge {
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .fac-publish-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .fac-publish-badge.published {
          background: #ecfdf5;
          color: #059669;
        }

        .fac-publish-badge.draft {
          background: #f1f5f9;
          color: #64748b;
        }

        .fac-card-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .fac-card-desc {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .fac-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: #f8fafc;
          padding: 12px 14px;
          border-radius: 12px;
        }

        .meta-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-lbl {
          font-size: 0.68rem;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
        }

        .meta-val {
          font-size: 0.82rem;
          color: #1e293b;
        }

        .fac-card-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
        }

        .fac-btn-review {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* Modals */
        .modal-overlay {
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

        .modal-dialog {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 560px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .modal-wide {
          max-width: 900px;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          background: #f8fafc;
        }

        .modal-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 4px;
        }

        .modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .modal-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        .modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 75vh;
          overflow-y: auto;
        }

        .modal-error-box {
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

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
        }

        .form-input, .form-select, .form-textarea {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.84rem;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #2563eb;
        }

        .form-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .checkbox-label {
          font-size: 0.8rem;
          color: #334155;
          font-weight: 500;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
        }

        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit {
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

        /* Submissions Table */
        .submissions-table-wrap {
          overflow-x: auto;
        }

        .submissions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .submissions-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          text-align: left;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .submissions-table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .student-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .st-name { color: #0f172a; }
        .st-roll { font-size: 0.72rem; color: #64748b; }

        .time-cell {
          font-size: 0.76rem;
          color: #64748b;
        }

        .sub-status-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .pill-ontime { background: #ecfdf5; color: #059669; }
        .pill-late { background: #fef3c7; color: #d97706; }
        .pill-graded { background: #eff6ff; color: #2563eb; }

        .content-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 180px;
        }

        .sub-text-snippet {
          margin: 0;
          font-size: 0.74rem;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sub-file-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          font-size: 0.72rem;
          text-decoration: underline;
        }

        .score-input-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .grade-num-input {
          width: 54px;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.84rem;
          text-align: center;
        }

        .max-score-hint {
          font-size: 0.76rem;
          color: #64748b;
        }

        .action-grade-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .feedback-text-input {
          width: 140px;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.76rem;
        }

        .btn-save-grade {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          cursor: pointer;
        }

        .fac-loading-card, .fac-empty-state {
          background: #ffffff;
          border-radius: 20px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #64748b;
          text-align: center;
        }

        .empty-icon { color: #cbd5e1; }
      `}</style>
    </div>
  );
};
