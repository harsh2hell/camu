import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCheck, 
  UserX, 
  ShieldAlert, 
  Send, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  QrCode
} from 'lucide-react';
import { attendanceApi } from '../api/attendance';
import { timetableApi } from '../api/timetable';
import { FacultyQrModal } from './FacultyQrModal';

export interface FacultyRosterStudent {
  id: string;
  rollNo: string;
  name: string;
  currentAttendance: number;
  status: 'PRESENT' | 'ABSENT' | 'ON_DUTY';
}

export interface AssignedCourse {
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  sectionName?: string;
}

export const FacultyAttendanceView: React.FC = () => {
  const [assignedCourses, setAssignedCourses] = useState<AssignedCourse[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [students, setStudents] = useState<FacultyRosterStudent[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [sessionTopic, setSessionTopic] = useState('Graph Algorithms: Dijkstra Shortest Path Proof');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeQrSessionId, setActiveQrSessionId] = useState<string | null>(null);
  const [isCreatingQrSession, setIsCreatingQrSession] = useState(false);

  // 1. Load authenticated faculty's assigned courses from timetable
  useEffect(() => {
    let isMounted = true;
    async function loadAssignedCourses() {
      try {
        setIsLoadingCourses(true);
        setErrorMsg(null);
        const courses = await timetableApi.getFacultyAssignedCourses();
        if (isMounted) {
          setAssignedCourses(courses);
          if (courses.length > 0) {
            setSelectedOfferingId(courses[0].courseOfferingId);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Failed to retrieve assigned teaching courses.');
        }
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    }
    loadAssignedCourses();
    return () => { isMounted = false; };
  }, []);

  // 2. Load authorized roster from backend for selected course offering
  const loadRoster = useCallback(async (offeringId: string) => {
    if (!offeringId) return;
    try {
      setIsLoadingRoster(true);
      setErrorMsg(null);
      setIsSubmitted(false);
      setSuccessMsg(null);
      const roster = await attendanceApi.getRoster(offeringId);
      setStudents(
        roster.map((r) => ({
          id: r.studentUserId,
          rollNo: r.rollNumber,
          name: r.fullName,
          currentAttendance: r.currentAttendancePercent,
          status: 'PRESENT',
        }))
      );
    } catch (err: any) {
      setStudents([]);
      setErrorMsg(err?.message || 'Failed to retrieve course roster from database.');
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  // Toggle individual status
  const cycleStatus = (id: string) => {
    if (isSubmitted || isSubmitting) return;
    setStudents(prev => prev.map(student => {
      if (student.id !== id) return student;
      const nextStatus = 
        student.status === 'PRESENT' ? 'ABSENT' : 
        student.status === 'ABSENT' ? 'ON_DUTY' : 'PRESENT';
      return { ...student, status: nextStatus };
    }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    if (isSubmitted || isSubmitting) return;
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const presentCount = students.filter(s => s.status === 'PRESENT').length;
  const absentCount = students.filter(s => s.status === 'ABSENT').length;
  const odCount = students.filter(s => s.status === 'ON_DUTY').length;
  const defaulterCount = students.filter(s => s.currentAttendance < 75).length;

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    if (!selectedOfferingId) {
      setErrorMsg('Please select an authorized course offering before submitting attendance.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create attendance session
      const session = await attendanceApi.createSession({
        courseOfferingId: selectedOfferingId,
        startTime: '10:00 AM',
        topicTaught: sessionTopic,
      });

      // 2. Record student attendance records in batch
      const batchPayload = students.map((s) => ({
        studentId: s.id,
        status: s.status,
      }));

      const result = await attendanceApi.recordBatch(session.id, batchPayload, true);

      setIsSubmitted(true);
      setSuccessMsg(
        `Session synchronized! Attendance records for ${result.recordsMarked} student(s) locked to central database.`
      );
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.message?.toLowerCase().includes('locked')) {
        setErrorMsg('This attendance session is locked. In accordance with university academic audit policies, locked sessions cannot be altered.');
      } else {
        setErrorMsg(err.message || 'Failed to submit attendance session. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenQrAttendance = async () => {
    if (isSubmitted || isCreatingQrSession) return;
    if (!selectedOfferingId) {
      setErrorMsg('Please select an authorized course offering before generating QR attendance.');
      return;
    }
    setIsCreatingQrSession(true);
    setErrorMsg(null);
    try {
      let currentSessionId = activeQrSessionId;
      if (!currentSessionId) {
        const session = await attendanceApi.createSession({
          courseOfferingId: selectedOfferingId,
          startTime: '10:00 AM',
          topicTaught: sessionTopic,
        });
        currentSessionId = session.id;
        setActiveQrSessionId(session.id);
      }
      setIsQrModalOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize QR attendance session.');
    } finally {
      setIsCreatingQrSession(false);
    }
  };

  const handleSessionFinalized = async () => {
    setIsSubmitted(true);
    setSuccessMsg('Attendance session closed and finalized to central database.');
    if (selectedOfferingId) {
      await loadRoster(selectedOfferingId);
    }
  };

  const selectedCourse = assignedCourses.find(c => c.courseOfferingId === selectedOfferingId);

  return (
    <div className="faculty-view-container animate-fade-in">
      {/* Top Banner */}
      <div className="faculty-banner glass-panel">
        <div className="banner-info">
          <div className="faculty-badge">
            <span className="live-dot"></span> Active Teaching Mode &bull; {selectedCourse ? `${selectedCourse.courseCode} ${selectedCourse.courseTitle}` : 'Course Attendance'}
          </div>
          <h2 className="heading-display banner-heading">
            1-Click Faculty Attendance Marker
          </h2>
          <p className="banner-sub">
            Fast, zero-latency roll call. Replaces slow MyCamu session attendance with real-time sync.
          </p>
        </div>

        <div className="faculty-kpi-summary">
          <div className="fac-kpi">
            <span className="fac-kpi-val text-success">{presentCount}</span>
            <span className="fac-kpi-lbl">Present</span>
          </div>
          <div className="fac-kpi">
            <span className="fac-kpi-val text-danger">{absentCount}</span>
            <span className="fac-kpi-lbl">Absent</span>
          </div>
          <div className="fac-kpi">
            <span className="fac-kpi-val text-accent">{odCount}</span>
            <span className="fac-kpi-lbl">On Duty (OD)</span>
          </div>
          <div className="fac-kpi defaulter-kpi">
            <span className="fac-kpi-val text-danger">{defaulterCount}</span>
            <span className="fac-kpi-lbl">&lt;75% Defaulters</span>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="attendance-controls glass-panel">
        <div className="controls-left">
          {/* Course Offering Selector */}
          <div className="session-info-item">
            <span className="item-label">Teaching Course:</span>
            {isLoadingCourses ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <Loader2 size={14} className="animate-spin text-blue" /> Loading courses...
              </span>
            ) : assignedCourses.length > 0 ? (
              <select
                className="course-select-input"
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(e.target.value)}
                disabled={isSubmitting || isSubmitted}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '5px 10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {assignedCourses.map((c) => (
                  <option key={c.courseOfferingId} value={c.courseOfferingId} style={{ background: '#0b1329', color: '#fff' }}>
                    {c.courseCode} - {c.courseTitle} ({c.sectionName || 'Sec A'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-danger" style={{ fontSize: '0.85rem' }}>No authorized courses assigned</span>
            )}
          </div>

          <div className="session-info-item">
            <span className="item-label">Date & Time:</span>
            <span>Today, 10:00 AM (LT-204)</span>
          </div>
          <div className="session-info-item">
            <span className="item-label">Topic:</span>
            <input 
              type="text" 
              className="topic-input"
              value={sessionTopic}
              onChange={(e) => setSessionTopic(e.target.value)}
              disabled={isSubmitted || isSubmitting}
            />
          </div>
        </div>

        <div className="controls-right">
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={() => loadRoster(selectedOfferingId)}
            disabled={isSubmitting || isLoadingRoster}
            title="Refresh Roster from Database"
          >
            <RefreshCw size={15} className={isLoadingRoster ? 'animate-spin' : ''} />
          </button>

          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={() => markAll('PRESENT')}
            disabled={isSubmitted || isSubmitting || students.length === 0}
          >
            <CheckCheck size={16} /> Mark All Present
          </button>
          
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={() => markAll('ABSENT')}
            disabled={isSubmitted || isSubmitting || students.length === 0}
          >
            <UserX size={16} /> Mark All Absent
          </button>

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleOpenQrAttendance}
            disabled={isSubmitted || isCreatingQrSession || students.length === 0}
            style={{
              background: 'linear-gradient(135deg, #1e40af, #2563eb)',
              color: '#ffffff',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
            }}
            title="Display rotating QR code for student self check-in"
          >
            {isCreatingQrSession ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <QrCode size={16} />
            )}
            <span>Generate QR</span>
          </button>

          <button 
            type="button" 
            className={`btn ${isSubmitted ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={isSubmitted || isSubmitting || students.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : isSubmitted ? (
              <>
                <CheckCircle2 size={16} className="text-success" /> Attendance Locked
              </>
            ) : (
              <>
                <Send size={16} /> Lock & Submit Attendance
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="submission-alert glass-panel" style={{ borderLeft: '4px solid var(--rose-500)', color: 'var(--rose-400)' }}>
          <AlertCircle size={20} className="text-danger" />
          <div style={{ flex: 1 }}>
            <strong>Submission Notice:</strong> {errorMsg}
          </div>
          <button type="button" className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.85rem' }} onClick={handleSubmit}>
            Retry
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="submission-alert glass-panel">
          <CheckCircle2 size={20} className="text-success" />
          <div>
            <strong>Session Synchronized Successfully!</strong> {successMsg || 'Attendance records locked to central database.'}
          </div>
        </div>
      )}

      {/* Loading & Empty States */}
      {isLoadingRoster && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
          <Loader2 size={28} className="animate-spin text-blue" style={{ margin: '0 auto 12px' }} />
          <p>Retrieving authoritative course roster from university database...</p>
        </div>
      )}

      {!isLoadingRoster && students.length === 0 && !errorMsg && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
          <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p>No students enrolled in this course offering for the current semester.</p>
        </div>
      )}

      {/* Student Attendance Grid */}
      <div className="attendance-grid">
        {students.map((student) => {
          const isPresent = student.status === 'PRESENT';
          const isAbsent = student.status === 'ABSENT';
          const isOD = student.status === 'ON_DUTY';
          const isDefaulter = student.currentAttendance < 75;

          return (
            <div 
              key={student.id} 
              className={`student-roll-card glass-panel ${
                isPresent ? 'card-present' : isAbsent ? 'card-absent' : 'card-od'
              }`}
              onClick={() => cycleStatus(student.id)}
            >
              <div className="roll-top">
                <span className="student-roll">{student.rollNo}</span>
                {isDefaulter && (
                  <span className="badge badge-danger" title="Attendance below 75%">
                    <ShieldAlert size={12} /> {student.currentAttendance}%
                  </span>
                )}
                {!isDefaulter && (
                  <span className="badge badge-info">
                    {student.currentAttendance}%
                  </span>
                )}
              </div>

              <h3 className="student-name">{student.name}</h3>

              <div className="status-toggle-indicator">
                {isPresent && <span className="status-badge status-present">PRESENT</span>}
                {isAbsent && <span className="status-badge status-absent">ABSENT</span>}
                {isOD && <span className="status-badge status-od">ON-DUTY (OD)</span>}
                <span className="click-hint">Click to toggle</span>
              </div>
            </div>
          );
        })}
      </div>

      {activeQrSessionId && (
        <FacultyQrModal
          sessionId={activeQrSessionId}
          courseCode={selectedCourse?.courseCode || 'CS302'}
          courseTitle={selectedCourse?.courseTitle || 'Course Attendance'}
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onSessionFinalized={handleSessionFinalized}
        />
      )}

      <style>{`
        .faculty-view-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .faculty-banner {
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, rgba(22, 36, 79, 0.75), rgba(11, 19, 41, 0.85));
          border-left: 4px solid var(--blue-500);
        }

        .faculty-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--blue-400);
          margin-bottom: 8px;
        }

        .banner-heading {
          font-size: 1.6rem;
          margin-bottom: 4px;
        }

        .banner-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .faculty-kpi-summary {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .fac-kpi {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          padding: 12px 18px;
          border-radius: var(--radius-md);
          text-align: center;
          min-width: 80px;
        }

        .defaulter-kpi {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.08);
        }

        .fac-kpi-val {
          font-size: 1.6rem;
          font-weight: 800;
          display: block;
          line-height: 1;
        }

        .fac-kpi-lbl {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 4px;
          display: block;
        }

        .attendance-controls {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .controls-left {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .session-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .item-label {
          color: var(--text-muted);
          font-weight: 600;
        }

        .topic-input {
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--text-primary);
          min-width: 280px;
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .submission-alert {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.4);
          color: #a7f3d0;
          font-size: 0.9rem;
        }

        /* Roll Grid */
        .attendance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }

        .student-roll-card {
          padding: 16px;
          cursor: pointer;
          user-select: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-width: 2px;
          transition: all 0.15s ease;
        }

        .card-present {
          border-color: rgba(16, 185, 129, 0.4);
          background: rgba(16, 185, 129, 0.05);
        }

        .card-present:hover {
          border-color: var(--emerald-500);
          background: rgba(16, 185, 129, 0.1);
        }

        .card-absent {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(239, 68, 68, 0.08);
        }

        .card-absent:hover {
          border-color: var(--rose-500);
          background: rgba(239, 68, 68, 0.14);
        }

        .card-od {
          border-color: rgba(245, 158, 11, 0.5);
          background: rgba(245, 158, 11, 0.08);
        }

        .card-od:hover {
          border-color: var(--amber-500);
          background: rgba(245, 158, 11, 0.14);
        }

        .roll-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .student-roll {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .student-name {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .status-toggle-indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .status-present {
          background: var(--emerald-500);
          color: #042f2e;
        }

        .status-absent {
          background: var(--rose-500);
          color: white;
        }

        .status-od {
          background: var(--amber-500);
          color: #451a03;
        }

        .click-hint {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
