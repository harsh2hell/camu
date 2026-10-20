import React, { useState, useEffect } from 'react';
import { 
  academicApi, 
  type Course, 
  type CourseOffering, 
  type Department, 
  type Program 
} from '../api/academic';
import { 
  BookOpen, 
  Calendar, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const AcademicAdminWorkspaceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'offerings' | 'corrections'>('catalog');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [correctionLogs, setCorrectionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Correction Form State
  const [correctionForm, setCorrectionForm] = useState({
    type: 'ATTENDANCE', // ATTENDANCE or ENROLLMENT_STATUS
    recordId: '',
    studentId: '',
    newStatus: 'PRESENT',
    reason: '',
    approvalRef: '',
  });

  // New Course Form State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    departmentId: '',
    code: '',
    title: '',
    credits: 4,
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 2,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, progRes, courseRes, offRes, logsRes] = await Promise.all([
        academicApi.getDepartments(),
        academicApi.getPrograms(),
        academicApi.getCourses(),
        academicApi.getOfferings(),
        academicApi.getCorrectionLogs(),
      ]);
      setDepartments(deptRes.data || []);
      setPrograms(progRes.data || []);
      setCourses(courseRes.data || []);
      setOfferings(offRes.data || []);
      setCorrectionLogs(logsRes.data || []);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch academic data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.departmentId) {
      setStatusMessage({ type: 'error', text: 'Select a department' });
      return;
    }
    try {
      await academicApi.createCourse(courseForm);
      setStatusMessage({ type: 'success', text: `Course ${courseForm.code} created successfully` });
      setShowCourseModal(false);
      setCourseForm({
        departmentId: '',
        code: '',
        title: '',
        credits: 4,
        lectureHours: 3,
        tutorialHours: 0,
        practicalHours: 2,
      });
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Course creation failed' });
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionForm.reason || correctionForm.reason.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'A detailed reason (min 5 characters) is required for audit compliance.' });
      return;
    }

    try {
      if (correctionForm.type === 'ATTENDANCE') {
        await academicApi.correctAttendance({
          attendanceRecordId: correctionForm.recordId,
          newStatus: correctionForm.newStatus,
          reason: correctionForm.reason,
          approvalRef: correctionForm.approvalRef || undefined,
        });
        setStatusMessage({ type: 'success', text: 'Attendance record corrected and audited successfully' });
      } else {
        await academicApi.correctEnrollmentStatus({
          studentId: correctionForm.studentId,
          status: correctionForm.newStatus,
          reason: correctionForm.reason,
          approvalRef: correctionForm.approvalRef || undefined,
        });
        setStatusMessage({ type: 'success', text: 'Student enrollment status updated and audited successfully' });
      }
      setCorrectionForm({
        type: 'ATTENDANCE',
        recordId: '',
        studentId: '',
        newStatus: 'PRESENT',
        reason: '',
        approvalRef: '',
      });
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Academic correction rejected' });
    }
  };

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">Academic Administration &amp; Registrar Workspace</h1>
          <p className="workspace-subtitle">Course Catalog, Offerings Allocation &amp; Authorized Corrections</p>
        </div>
        <div className="workspace-actions">
          {activeSubTab === 'catalog' && (
            <button type="button" className="btn-primary" onClick={() => setShowCourseModal(true)}>
              <Plus size={16} />
              <span>Create Course</span>
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`alert-banner ${statusMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="alert-close">&times;</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="nav-subtabs">
        <button 
          className={`subtab-btn ${activeSubTab === 'catalog' ? 'subtab-active' : ''}`}
          onClick={() => setActiveSubTab('catalog')}
        >
          <BookOpen size={16} />
          <span>Course Catalog ({courses.length}) &bull; {programs.length} Programs</span>
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'offerings' ? 'subtab-active' : ''}`}
          onClick={() => setActiveSubTab('offerings')}
        >
          <Calendar size={16} />
          <span>Course Offerings &amp; Allocation ({offerings.length})</span>
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'corrections' ? 'subtab-active' : ''}`}
          onClick={() => setActiveSubTab('corrections')}
        >
          <Edit3 size={16} />
          <span>Authorized Corrections &amp; Audit Trail</span>
        </button>
      </div>

      {/* Catalog View */}
      {activeSubTab === 'catalog' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Title</th>
                <th>Department</th>
                <th>Credits</th>
                <th>L-T-P</th>
                <th>Offerings</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-bold text-burgundy">{c.code}</td>
                  <td className="font-medium text-slate-800">{c.title}</td>
                  <td>{c.department?.name}</td>
                  <td><span className="badge-credit">{c.credits} Credits</span></td>
                  <td>{c.lectureHours}-{c.tutorialHours}-{c.practicalHours}</td>
                  <td>{c._count?.offerings ?? 0} active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Offerings View */}
      {activeSubTab === 'offerings' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Section</th>
                <th>Primary Faculty</th>
                <th>Year / Term</th>
                <th>Enrolled</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((off) => (
                <tr key={off.id}>
                  <td>
                    <div className="font-bold text-slate-900">{off.course?.code}</div>
                    <div className="text-xs text-slate-500">{off.course?.title}</div>
                  </td>
                  <td>{off.section?.name}</td>
                  <td className="font-medium text-slate-800">{off.primaryFaculty?.fullName}</td>
                  <td>{off.academicYear} &bull; Sem {off.semester}</td>
                  <td><span className="badge-count">{off._count?.enrollments ?? 0} students</span></td>
                  <td>{off._count?.sessions ?? 0} conducted</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Corrections View */}
      {activeSubTab === 'corrections' && (
        <div className="corrections-grid">
          {/* Correction Action Card */}
          <div className="form-card">
            <div className="card-header">
              <ShieldCheck size={18} className="text-burgundy" />
              <h2>Execute Authorized Academic Correction</h2>
            </div>
            <p className="card-instruction">
              All corrections are logged to an immutable university audit trail with administrative actor identity, IP address, and approval reference.
            </p>

            <form onSubmit={handleSubmitCorrection} className="correction-form">
              <div className="form-group">
                <label>Correction Target</label>
                <select 
                  value={correctionForm.type} 
                  onChange={(e) => setCorrectionForm({ ...correctionForm, type: e.target.value })}
                >
                  <option value="ATTENDANCE">Attendance Record Correction</option>
                  <option value="ENROLLMENT_STATUS">Student Enrollment Status Correction</option>
                </select>
              </div>

              {correctionForm.type === 'ATTENDANCE' ? (
                <>
                  <div className="form-group">
                    <label>Attendance Record UUID</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={correctionForm.recordId}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, recordId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Corrected Attendance Status</label>
                    <select 
                      value={correctionForm.newStatus} 
                      onChange={(e) => setCorrectionForm({ ...correctionForm, newStatus: e.target.value })}
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="LATE">LATE</option>
                      <option value="EXCUSED">EXCUSED</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Student User UUID</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. a0000000-0000-4000-8000-000000000001"
                      value={correctionForm.studentId}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, studentId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Enrollment Status</label>
                    <select 
                      value={correctionForm.newStatus} 
                      onChange={(e) => setCorrectionForm({ ...correctionForm, newStatus: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="WITHDRAWN">WITHDRAWN</option>
                      <option value="GRADUATED">GRADUATED</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Institutional Reason (Mandatory &bull; min 5 characters)</label>
                <textarea 
                  required 
                  rows={2}
                  placeholder="e.g. Approved medical concession verified by University Dean of Academic Affairs"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Official Approval Reference (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. DGU/REG/2026/OD-402"
                  value={correctionForm.approvalRef}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, approvalRef: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Authorize &amp; Commit Correction
              </button>
            </form>
          </div>

          {/* Audit Trail Card */}
          <div className="audit-card">
            <div className="card-header">
              <FileText size={18} />
              <h2>Recent Academic Corrections Audit Log ({correctionLogs.length})</h2>
            </div>

            <div className="audit-list">
              {correctionLogs.length === 0 ? (
                <div className="empty-state">No academic corrections recorded in this session.</div>
              ) : (
                correctionLogs.map((log) => (
                  <div key={log.id} className="audit-item">
                    <div className="audit-item-header">
                      <span className="audit-target">{log.targetEntity}</span>
                      <span className="audit-date">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="audit-actor">
                      Authorized By: <strong>{log.performedBy?.fullName}</strong> ({log.performedBy?.role})
                    </div>
                    <div className="audit-reason">
                      Reason: <em>"{log.reason}"</em>
                    </div>
                    {log.approvalRef && (
                      <div className="audit-ref">
                        Approval Ref: <code>{log.approvalRef}</code>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Course to University Catalog</h2>
              <button onClick={() => setShowCourseModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateCourse} className="modal-form">
              <div className="form-group">
                <label>Academic Department</label>
                <select 
                  required 
                  value={courseForm.departmentId} 
                  onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Course Code</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. CSE-302"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group">
                  <label>Credits</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Course Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Distributed Database Systems &amp; Cloud Architecture"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lecture Hours (L)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={courseForm.lectureHours}
                    onChange={(e) => setCourseForm({ ...courseForm, lectureHours: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Tutorial Hours (T)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={courseForm.tutorialHours}
                    onChange={(e) => setCourseForm({ ...courseForm, tutorialHours: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Practical Hours (P)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={courseForm.practicalHours}
                    onChange={(e) => setCourseForm({ ...courseForm, practicalHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCourseModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .workspace-container {
          padding: 24px;
          max-width: 1380px;
          margin: 0 auto;
        }
        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }
        .workspace-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .workspace-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .workspace-actions {
          display: flex;
          gap: 12px;
        }
        .btn-primary {
          background: #562b63;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary {
          background: #fff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-subtabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        .subtab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }
        .subtab-active {
          color: #562b63;
          border-bottom-color: #562b63;
        }
        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .data-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
        .text-burgundy { color: #562b63; }
        .badge-credit {
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
          color: #475569;
          font-size: 0.78rem;
        }
        .badge-count {
          background: #ede9fe;
          color: #6d28d9;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .corrections-grid {
          display: grid;
          grid-template-columns: 440px 1fr;
          gap: 20px;
        }
        .form-card, .audit-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        .card-instruction {
          font-size: 0.82rem;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .correction-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
        }
        .form-group input, .form-group select, .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .audit-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 600px;
          overflow-y: auto;
        }
        .audit-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 3px solid #562b63;
          border-radius: 0 6px 6px 0;
          padding: 12px;
          font-size: 0.85rem;
        }
        .audit-item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .audit-target {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.78rem;
        }
        .audit-date {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .audit-actor {
          color: #475569;
          margin-bottom: 4px;
        }
        .audit-reason {
          color: #334155;
          margin-bottom: 2px;
        }
        .audit-ref {
          font-size: 0.75rem;
          color: #64748b;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 10px;
          width: 520px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modal-header h2 { font-size: 1.2rem; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .alert-success { background: #dcfce7; color: #166534; }
        .alert-error { background: #fee2e2; color: #991b1b; }
        .alert-close { margin-left: auto; background: none; border: none; font-size: 1.2rem; cursor: pointer; }
      `}</style>
    </div>
  );
};
