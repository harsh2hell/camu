import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator, 
  BookOpen, 
  Clock, 
  Calendar,
  FileText,
  ShieldCheck,
  Info
} from 'lucide-react';
import { CURRENT_STUDENT, ATTENDANCE_DATA } from '../data/mockData';

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigateTab }) => {
  // Simulator State
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('CS308'); // Start with the danger subject (OS)
  const [classesToAttend, setClassesToAttend] = useState<number>(3);
  const [classesToMiss, setClassesToMiss] = useState<number>(0);

  // Overall attendance calculation
  const totalAttended = ATTENDANCE_DATA.reduce((acc, curr) => acc + curr.attended + curr.onDuty, 0);
  const totalConducted = ATTENDANCE_DATA.reduce((acc, curr) => acc + curr.conducted, 0);
  const overallPercentage = Number(((totalAttended / totalConducted) * 100).toFixed(1));

  // Find simulated subject
  const currentSimSubject = ATTENDANCE_DATA.find(s => s.code === selectedSubjectCode) || ATTENDANCE_DATA[0];

  // Simulator Math
  const simTotalAttended = (currentSimSubject.attended + currentSimSubject.onDuty) + classesToAttend;
  const simTotalConducted = currentSimSubject.conducted + classesToAttend + classesToMiss;
  const simulatedPercentage = Number(((simTotalAttended / simTotalConducted) * 100).toFixed(1));

  // Safety buffer calculation: how many can be missed while staying >= 75%
  // (attended) / (conducted + x) >= 0.75  =>  x <= (attended / 0.75) - conducted
  const safeMisses = Math.max(
    0, 
    Math.floor(((currentSimSubject.attended + currentSimSubject.onDuty) / 0.75) - currentSimSubject.conducted)
  );

  // Deficit calculation: how many needed to reach 75%
  // (attended + y) / (conducted + y) >= 0.75 => y >= (0.75 * conducted - attended) / 0.25
  const neededClasses = Math.max(
    0,
    Math.ceil((0.75 * currentSimSubject.conducted - (currentSimSubject.attended + currentSimSubject.onDuty)) / 0.25)
  );

  return (
    <div className="dashboard-content animate-fade-in">
      {/* 1. Welcome & Status Banner */}
      <section className="hero-banner glass-panel">
        <div className="hero-left">
          <div className="status-pill">
            <span className="pulse-dot"></span>
            Academic Term: Odd Semester 2026-27 &bull; Active
          </div>
          <h1 className="hero-greeting heading-display">
            Welcome back, {CURRENT_STUDENT.name.split(' ')[0]}!
          </h1>
          <p className="hero-sub">
            {CURRENT_STUDENT.program} &bull; Semester {CURRENT_STUDENT.semester} ({CURRENT_STUDENT.section}) &bull; Roll: <strong className="highlight-text">{CURRENT_STUDENT.rollNo}</strong>
          </p>
        </div>

        <div className="hero-quick-actions">
          <button 
            className="btn btn-accent" 
            onClick={() => onNavigateTab('leaves')}
          >
            <ShieldCheck size={16} /> Apply for OD / Leave
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => onNavigateTab('timetable')}
          >
            <Calendar size={16} /> View Full Schedule
          </button>
        </div>
      </section>

      {/* 2. Primary KPI Cards */}
      <div className="kpi-grid">
        {/* Attendance KPI */}
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Aggregate Attendance</span>
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> Exam Eligible
            </span>
          </div>
          <div className="kpi-body">
            <div className="kpi-value heading-display">
              {overallPercentage}%
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill progress-emerald" 
                style={{ width: `${overallPercentage}%` }}
              ></div>
            </div>
            <div className="kpi-subtext">
              <span>{totalAttended} attended of {totalConducted} classes</span>
              <span className="threshold-marker">Threshold: 75%</span>
            </div>
          </div>
        </div>

        {/* Current Class Status */}
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Current Class</span>
            <span className="badge badge-info">
              <Clock size={12} /> In Progress
            </span>
          </div>
          <div className="kpi-body">
            <div className="current-class-title">CS304: Database Systems</div>
            <div className="current-class-venue">
              Room <strong>LT-201</strong> &bull; Prof. Ananya Sen
            </div>
            <div className="kpi-subtext">
              <span>Timing: 10:00 - 10:55 AM</span>
              <span className="accent-text">Next: Algorithms Lab</span>
            </div>
          </div>
        </div>

        {/* Academic CGPA */}
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Current CGPA</span>
            <span className="badge badge-success">
              <TrendingUp size={12} /> Top 10% Batch
            </span>
          </div>
          <div className="kpi-body">
            <div className="kpi-value heading-display">
              {CURRENT_STUDENT.cgpa} <span className="kpi-denom">/ 10.0</span>
            </div>
            <div className="kpi-subtext">
              <span>Last Sem SGPA: 8.80</span>
              <span className="accent-text">No active backlogs</span>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="glass-panel kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Action Items</span>
            <span className="badge badge-warning">2 Deadlines</span>
          </div>
          <div className="kpi-body">
            <div className="task-summary-line">
              <BookOpen size={16} className="text-secondary" />
              <span>Algorithms PS4 due in <strong>3 days</strong></span>
            </div>
            <div className="task-summary-line">
              <FileText size={16} className="text-secondary" />
              <span>Basketball OD approval <strong>pending</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. The 75% Attendance Simulator & Bunk Calculator (Killer Feature) */}
      <section className="simulator-section glass-panel">
        <div className="section-header">
          <div className="header-icon-group">
            <Calculator className="header-icon" size={22} />
            <div>
              <h2 className="heading-display section-title">
                Smart 75% Attendance Simulator & Bunk Calculator
              </h2>
              <p className="section-desc">
                Simulate your future attendance before skipping or planning leaves. (Never get caught off-guard on MyCamu debarment lists!)
              </p>
            </div>
          </div>
        </div>

        <div className="simulator-body">
          {/* Controls */}
          <div className="simulator-controls">
            <div className="form-group">
              <label htmlFor="sim-subject">Select Subject:</label>
              <select 
                id="sim-subject"
                className="custom-select"
                value={selectedSubjectCode}
                onChange={(e) => {
                  setSelectedSubjectCode(e.target.value);
                  setClassesToAttend(0);
                  setClassesToMiss(0);
                }}
              >
                {ATTENDANCE_DATA.map(sub => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code}: {sub.title} ({sub.percentage}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="sim-counter-row">
              <div className="counter-box">
                <span className="counter-label">Classes you plan to attend:</span>
                <div className="counter-input-wrap">
                  <button 
                    className="counter-btn"
                    onClick={() => setClassesToAttend(Math.max(0, classesToAttend - 1))}
                  >-</button>
                  <span className="counter-val text-success">+{classesToAttend}</span>
                  <button 
                    className="counter-btn"
                    onClick={() => setClassesToAttend(classesToAttend + 1)}
                  >+</button>
                </div>
              </div>

              <div className="counter-box">
                <span className="counter-label">Classes you plan to miss / bunk:</span>
                <div className="counter-input-wrap">
                  <button 
                    className="counter-btn"
                    onClick={() => setClassesToMiss(Math.max(0, classesToMiss - 1))}
                  >-</button>
                  <span className="counter-val text-danger">+{classesToMiss}</span>
                  <button 
                    className="counter-btn"
                    onClick={() => setClassesToMiss(classesToMiss + 1)}
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className={`simulator-result ${simulatedPercentage >= 75 ? 'result-safe' : 'result-danger'}`}>
            <div className="result-main">
              <div className="result-label">Projected Attendance:</div>
              <div className="result-percentage heading-display">
                {simulatedPercentage}%
              </div>
              <div className="result-delta">
                Current: {currentSimSubject.percentage}% &rarr; New: {simulatedPercentage}%
              </div>
            </div>

            <div className="result-advice">
              {simulatedPercentage >= 75 ? (
                <div className="advice-box advice-good">
                  <CheckCircle2 size={18} />
                  <span>
                    <strong>Safe zone!</strong> You will remain eligible for exams. 
                    {safeMisses > 0 && ` You can still safely miss up to ${safeMisses} lecture(s).`}
                  </span>
                </div>
              ) : (
                <div className="advice-box advice-alert">
                  <AlertTriangle size={18} />
                  <span>
                    <strong>Debarment risk!</strong> You need to attend <strong>{neededClasses} consecutive classes</strong> without missing any to restore 75% eligibility.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Subject-Wise Attendance Breakdown */}
      <section className="glass-panel subjects-section">
        <div className="section-header">
          <div>
            <h2 className="heading-display section-title">Subject-Wise Attendance Breakdown</h2>
            <p className="section-desc">Real-time attendance recorded directly from faculty sessions.</p>
          </div>
          <span className="badge badge-info">
            <Info size={12} /> Mandatory 75% for Mid/End-Term Exam Hall Ticket
          </span>
        </div>

        <div className="subjects-grid">
          {ATTENDANCE_DATA.map((subject) => {
            const isDanger = subject.percentage < 75;
            const isWarning = subject.percentage >= 75 && subject.percentage < 80;

            return (
              <div key={subject.code} className="subject-card glass-panel glass-panel-interactive">
                <div className="subject-card-top">
                  <div>
                    <span className="subject-code">{subject.code}</span>
                    <h3 className="subject-title">{subject.title}</h3>
                    <div className="subject-faculty">{subject.faculty}</div>
                  </div>
                  <div className={`subject-pct heading-display ${isDanger ? 'pct-danger' : isWarning ? 'pct-warning' : 'pct-safe'}`}>
                    {subject.percentage}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-bg">
                  <div 
                    className={`progress-bar-fill ${isDanger ? 'progress-rose' : isWarning ? 'progress-amber' : 'progress-emerald'}`}
                    style={{ width: `${Math.min(100, subject.percentage)}%` }}
                  ></div>
                </div>

                <div className="subject-stats-row">
                  <div className="stat-pill">
                    Attended: <strong>{subject.attended}</strong>
                  </div>
                  <div className="stat-pill">
                    Total: <strong>{subject.conducted}</strong>
                  </div>
                  {subject.onDuty > 0 && (
                    <div className="stat-pill stat-od">
                      OD Credited: <strong>+{subject.onDuty}</strong>
                    </div>
                  )}
                </div>

                {isDanger && (
                  <div className="subject-warning-callout">
                    <AlertTriangle size={14} /> Below 75% threshold! Immediate makeup required.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .dashboard-content {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .hero-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          gap: 20px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, rgba(22, 36, 79, 0.7), rgba(11, 19, 41, 0.8));
          border-left: 4px solid var(--amber-500);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--amber-400);
          margin-bottom: 8px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--amber-400);
          box-shadow: 0 0 10px var(--amber-400);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }

        .hero-greeting {
          font-size: 1.8rem;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .hero-sub {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .highlight-text {
          color: var(--amber-400);
        }

        .hero-quick-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .kpi-title {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kpi-value {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .kpi-denom {
          font-size: 1rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .progress-bar-bg {
          width: 100%;
          height: 7px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin: 10px 0;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.4s ease;
        }

        .progress-emerald { background: linear-gradient(90deg, var(--emerald-500), var(--emerald-400)); }
        .progress-amber { background: linear-gradient(90deg, var(--amber-600), var(--amber-400)); }
        .progress-rose { background: linear-gradient(90deg, var(--rose-600), var(--rose-400)); }

        .kpi-subtext {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .threshold-marker {
          color: var(--amber-400);
          font-weight: 600;
        }

        .current-class-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .current-class-venue {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .task-summary-line {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          padding: 6px 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .task-summary-line:last-child {
          border-bottom: none;
        }

        /* Simulator Section */
        .simulator-section {
          padding: 24px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(11, 19, 41, 0.7));
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-icon-group {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .header-icon {
          color: var(--amber-400);
          margin-top: 2px;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .section-desc {
          font-size: 0.825rem;
          color: var(--text-secondary);
        }

        .simulator-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .custom-select {
          width: 100%;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          color: var(--text-primary);
          margin-top: 6px;
        }

        .sim-counter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .counter-box {
          background: rgba(0, 0, 0, 0.2);
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .counter-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 8px;
        }

        .counter-input-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .counter-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .counter-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .counter-val {
          font-size: 1.15rem;
          font-weight: 800;
        }

        .text-success { color: var(--emerald-400); }
        .text-danger { color: var(--rose-400); }

        .simulator-result {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          border-radius: var(--radius-md);
          border: 1px solid;
        }

        .result-safe {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .result-danger {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .result-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
        }

        .result-percentage {
          font-size: 2.8rem;
          font-weight: 800;
          margin: 4px 0;
        }

        .result-safe .result-percentage { color: var(--emerald-400); }
        .result-danger .result-percentage { color: var(--rose-400); }

        .result-delta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .advice-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.825rem;
          margin-top: 12px;
        }

        .advice-good {
          background: rgba(16, 185, 129, 0.15);
          color: #a7f3d0;
        }

        .advice-alert {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        /* Subjects Grid */
        .subjects-section {
          padding: 24px;
        }

        .subjects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 18px;
        }

        .subject-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .subject-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .subject-code {
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(59, 130, 246, 0.15);
          color: var(--blue-400);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .subject-title {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 6px 0 2px;
          line-height: 1.3;
        }

        .subject-faculty {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .subject-pct {
          font-size: 1.45rem;
          font-weight: 800;
        }

        .pct-safe { color: var(--emerald-400); }
        .pct-warning { color: var(--amber-400); }
        .pct-danger { color: var(--rose-400); }

        .subject-stats-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .stat-pill {
          font-size: 0.72rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
        }

        .stat-od {
          background: rgba(245, 158, 11, 0.15);
          color: var(--amber-400);
        }

        .subject-warning-callout {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--rose-400);
          margin-top: 10px;
          background: rgba(239, 68, 68, 0.1);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
        }

        @media (max-width: 850px) {
          .simulator-body {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
