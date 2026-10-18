import { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  Mail, 
  Download, 
  CheckCircle2
} from 'lucide-react';
import { FACULTY_STUDENT_LIST } from '../data/mockData';

export const DefaultersView: React.FC = () => {
  const [issuedNotices, setIssuedNotices] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const defaulters = FACULTY_STUDENT_LIST.filter(s => s.currentAttendance < 75);

  const handleSendWarning = (id: string, name: string) => {
    setIssuedNotices(prev => ({ ...prev, [id]: true }));
    setToastMsg(`Official 75% Debarment Warning sent to ${name} and guardian via SMS/Portal.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleBroadcastAll = () => {
    const updated: Record<string, boolean> = {};
    defaulters.forEach(d => { updated[d.id] = true; });
    setIssuedNotices(updated);
    setToastMsg(`Debarment warnings dispatched to all ${defaulters.length} defaulter students.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="defaulters-container animate-fade-in">
      {toastMsg && (
        <div className="toast-notification">
          <CheckCircle2 size={18} className="text-success" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="defaulters-header glass-panel">
        <div>
          <div className="badge badge-danger" style={{ marginBottom: '8px' }}>
            <ShieldAlert size={13} /> Strict UGC / AICTE 75% Attendance Audit
          </div>
          <h2 className="heading-display page-title">
            Attendance Defaulters & Debarment Risk Monitor
          </h2>
          <p className="page-desc">
            Students currently falling below the 75% threshold in B.Tech CSE (Odd Sem). Hall tickets will be blocked unless rectified.
          </p>
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-ghost"
            onClick={() => alert('Exporting Defaulters List to Excel...')}
          >
            <Download size={16} /> Export CSV List
          </button>
          <button 
            className="btn btn-accent"
            onClick={handleBroadcastAll}
          >
            <Send size={16} /> Broadcast Warning to All
          </button>
        </div>
      </div>

      {/* Defaulter Cards */}
      <div className="defaulter-list">
        {defaulters.map(student => {
          const isSent = issuedNotices[student.id];

          return (
            <div key={student.id} className="defaulter-card glass-panel">
              <div className="card-left">
                <div className="def-pct heading-display text-danger">
                  {student.currentAttendance}%
                </div>
                <div>
                  <div className="def-roll">{student.rollNo}</div>
                  <h3 className="def-name">{student.name}</h3>
                  <div className="def-course">CS302: Algorithms &bull; Shortfall: <strong>{Math.ceil((75 - student.currentAttendance) * 0.4)} classes</strong></div>
                </div>
              </div>

              <div className="card-right">
                {isSent ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={13} /> Notice Dispatched
                  </span>
                ) : (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSendWarning(student.id, student.name)}
                  >
                    <Mail size={14} /> Send Official Warning
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .defaulters-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          background: #0f1c3d;
          border: 1px solid var(--emerald-500);
          color: white;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .defaulters-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          border-left: 4px solid var(--rose-500);
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .defaulter-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .defaulter-card {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          border-left: 3px solid var(--rose-500);
        }

        .card-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .def-pct {
          font-size: 2rem;
          font-weight: 800;
          min-width: 85px;
        }

        .def-roll {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .def-name {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .def-course {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .btn-sm {
          font-size: 0.8rem;
          padding: 6px 14px;
        }
      `}</style>
    </div>
  );
};
