import { useState } from 'react';
import { 
  CheckCheck, 
  UserX, 
  ShieldAlert, 
  Send, 
  CheckCircle2
} from 'lucide-react';
import { FACULTY_STUDENT_LIST, type FacultyClassStudent } from '../data/mockData';

export const FacultyAttendanceView: React.FC = () => {
  const [students, setStudents] = useState<FacultyClassStudent[]>(FACULTY_STUDENT_LIST);
  const [sessionTopic, setSessionTopic] = useState('Graph Algorithms: Dijkstra Shortest Path Proof');
  const selectedSection = 'B.Tech CSE 5th Sem - Section A';
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Toggle individual status
  const cycleStatus = (id: string) => {
    if (isSubmitted) return;
    setStudents(prev => prev.map(student => {
      if (student.id !== id) return student;
      const nextStatus = 
        student.status === 'PRESENT' ? 'ABSENT' : 
        student.status === 'ABSENT' ? 'ON_DUTY' : 'PRESENT';
      return { ...student, status: nextStatus };
    }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    if (isSubmitted) return;
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const presentCount = students.filter(s => s.status === 'PRESENT').length;
  const absentCount = students.filter(s => s.status === 'ABSENT').length;
  const odCount = students.filter(s => s.status === 'ON_DUTY').length;
  const defaulterCount = students.filter(s => s.currentAttendance < 75).length;

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  return (
    <div className="faculty-view-container animate-fade-in">
      {/* Top Banner */}
      <div className="faculty-banner glass-panel">
        <div className="banner-info">
          <div className="faculty-badge">
            <span className="live-dot"></span> Active Teaching Mode &bull; CS302 Algorithms
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
          <div className="session-info-item">
            <span className="item-label">Section:</span>
            <strong>{selectedSection}</strong>
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
              disabled={isSubmitted}
            />
          </div>
        </div>

        <div className="controls-right">
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={() => markAll('PRESENT')}
            disabled={isSubmitted}
          >
            <CheckCheck size={16} /> Mark All Present
          </button>
          
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={() => markAll('ABSENT')}
            disabled={isSubmitted}
          >
            <UserX size={16} /> Mark All Absent
          </button>

          <button 
            type="button" 
            className={`btn ${isSubmitted ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={isSubmitted}
          >
            {isSubmitted ? (
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

      {isSubmitted && (
        <div className="submission-alert glass-panel">
          <CheckCircle2 size={20} className="text-success" />
          <div>
            <strong>Session Synchronized Successfully!</strong> Attendance records for 10 students locked to the DBS University central database. Automated SMS/App notifications dispatched to absent students.
          </div>
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
