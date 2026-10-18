import { useState } from 'react';
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
  Receipt,
  QrCode,
  ChevronRight,
  Building,
  GraduationCap
} from 'lucide-react';
import { CURRENT_STUDENT, ATTENDANCE_DATA, TODAY_CLASSES } from '../data/mockData';

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigateTab }) => {
  // Simulator State
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('CS308'); // Start with the attention subject (OS)
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
  const safeMisses = Math.max(
    0, 
    Math.floor(((currentSimSubject.attended + currentSimSubject.onDuty) / 0.75) - currentSimSubject.conducted)
  );

  // Deficit calculation: how many needed to reach 75%
  const neededClasses = Math.max(
    0,
    Math.ceil((0.75 * currentSimSubject.conducted - (currentSimSubject.attended + currentSimSubject.onDuty)) / 0.25)
  );

  // Today's classes from Timetable
  const todayClasses = TODAY_CLASSES;

  return (
    <div className="student-dash-viewport">
      <div className="student-dash-container">
        
        {/* 1. HERO BANNER: Student Welcome & Quick Services */}
        <section className="dash-hero-card">
          <div className="dash-hero-content">
            <div className="dash-term-pill">
              <span className="dash-pulse-dot" />
              <span>Odd Semester 2026-27 &bull; Active Biometric Sync</span>
            </div>
            <h1 className="dash-greeting">
              Welcome back, {CURRENT_STUDENT.name.split(' ')[0]}!
            </h1>
            <p className="dash-subtext">
              {CURRENT_STUDENT.program} &bull; Semester {CURRENT_STUDENT.semester} ({CURRENT_STUDENT.section}) &bull; Roll: <strong className="roll-highlight">{CURRENT_STUDENT.rollNo}</strong> &bull; Mentor: Prof. Rajesh Sharma
            </p>
          </div>

          <div className="dash-hero-actions">
            <button 
              type="button" 
              className="dash-action-btn primary-plum"
              onClick={() => onNavigateTab('leaves')}
            >
              <ShieldCheck size={16} />
              <span>Apply OD / Leave</span>
            </button>
            <button 
              type="button" 
              className="dash-action-btn secondary-btn"
              onClick={() => onNavigateTab('timetable')}
            >
              <Calendar size={16} />
              <span>Full Timetable</span>
            </button>
          </div>
        </section>

        {/* 2. 4 PRIMARY METRIC CARDS */}
        <div className="metrics-grid">
          {/* Card 1: Aggregate Attendance */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Aggregate Attendance</span>
              <span className={`status-badge ${overallPercentage >= 75 ? 'badge-safe' : 'badge-danger'}`}>
                <CheckCircle2 size={13} />
                <span>{overallPercentage >= 75 ? 'Exam Eligible' : 'Debarred Risk'}</span>
              </span>
            </div>
            <div className="metric-main-value">
              {overallPercentage}<span className="unit">%</span>
            </div>
            <div className="metric-progress-track">
              <div 
                className="metric-progress-fill emerald-fill" 
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="metric-footer-note">
              <span>{totalAttended} attended of {totalConducted} conducted</span>
              <span className="threshold-pill">Req: 75%</span>
            </div>
          </div>

          {/* Card 2: Current Class Status */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Current Lecture</span>
              <span className="status-badge badge-live">
                <Clock size={13} className="spin-slow" />
                <span>In Progress</span>
              </span>
            </div>
            <div className="class-title-text">CS304: Database Systems</div>
            <div className="class-venue-info">
              <Building size={14} className="info-icon" />
              <span>Room <strong>LT-201</strong> &bull; Prof. Ananya Sen</span>
            </div>
            <div className="metric-footer-note">
              <span>10:00 AM &ndash; 10:55 AM</span>
              <span className="next-class-tag">Next: Algorithms Lab</span>
            </div>
          </div>

          {/* Card 3: Academic Standing / CGPA */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Cumulative GPA (CGPA)</span>
              <span className="status-badge badge-purple">
                <TrendingUp size={13} />
                <span>Top 10% Batch</span>
              </span>
            </div>
            <div className="metric-main-value">
              {CURRENT_STUDENT.cgpa}<span className="unit-denom"> / 10.0</span>
            </div>
            <div className="metric-footer-note">
              <span>Last Sem SGPA: <strong>8.80</strong></span>
              <span className="badge-clear">Zero Active Backlogs</span>
            </div>
          </div>

          {/* Card 4: Action Items & Deadlines */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Deadlines &amp; Approvals</span>
              <span className="status-badge badge-warning">
                <AlertTriangle size={13} />
                <span>2 Action Items</span>
              </span>
            </div>
            <div className="action-items-list">
              <div className="action-item-row" onClick={() => onNavigateTab('lms')}>
                <BookOpen size={14} className="action-item-icon" />
                <span className="action-item-text">Algorithms PS4 due in <strong>3 days</strong></span>
              </div>
              <div className="action-item-row" onClick={() => onNavigateTab('leaves')}>
                <FileText size={14} className="action-item-icon" />
                <span className="action-item-text">Inter-College OD: <strong>Approved</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. KILLER FEATURE: 75% ATTENDANCE SIMULATOR & BUNK CALCULATOR */}
        <section className="dash-simulator-card">
          <div className="simulator-header-row">
            <div className="sim-title-group">
              <div className="sim-icon-box">
                <Calculator size={22} />
              </div>
              <div>
                <h2 className="sim-heading">Smart 75% Attendance Simulator &amp; Bunk Calculator</h2>
                <p className="sim-description">
                  Plan your absences safely without getting debarred. Predict your exact attendance percentage before skipping lectures.
                </p>
              </div>
            </div>
          </div>

          <div className="simulator-interactive-grid">
            {/* Controls */}
            <div className="sim-controls-panel">
              <div className="sim-input-group">
                <label className="sim-field-label">Select Subject to Simulate:</label>
                <select 
                  className="sim-dropdown"
                  value={selectedSubjectCode}
                  onChange={(e) => {
                    setSelectedSubjectCode(e.target.value);
                    setClassesToAttend(0);
                    setClassesToMiss(0);
                  }}
                >
                  {ATTENDANCE_DATA.map(sub => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code}: {sub.title} (Current: {sub.percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sim-counters-row">
                {/* Classes to Attend */}
                <div className="sim-counter-card">
                  <span className="counter-title">Classes you will ATTEND:</span>
                  <div className="counter-control">
                    <button 
                      type="button"
                      className="counter-btn"
                      onClick={() => setClassesToAttend(Math.max(0, classesToAttend - 1))}
                    >&minus;</button>
                    <span className="counter-number text-attend">+{classesToAttend}</span>
                    <button 
                      type="button"
                      className="counter-btn"
                      onClick={() => setClassesToAttend(classesToAttend + 1)}
                    >+</button>
                  </div>
                </div>

                {/* Classes to Miss */}
                <div className="sim-counter-card">
                  <span className="counter-title">Classes you will MISS (Bunk):</span>
                  <div className="counter-control">
                    <button 
                      type="button"
                      className="counter-btn"
                      onClick={() => setClassesToMiss(Math.max(0, classesToMiss - 1))}
                    >&minus;</button>
                    <span className="counter-number text-miss">+{classesToMiss}</span>
                    <button 
                      type="button"
                      className="counter-btn"
                      onClick={() => setClassesToMiss(classesToMiss + 1)}
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Result Calculation Box */}
            <div className={`sim-result-card ${simulatedPercentage >= 75 ? 'result-eligible' : 'result-debarred'}`}>
              <div className="result-top-label">Simulated Projected Attendance:</div>
              <div className="result-big-value">
                {simulatedPercentage}<span className="result-unit">%</span>
              </div>
              <div className="result-delta-pill">
                Current: {currentSimSubject.percentage}% &rarr; Delta: {(simulatedPercentage - currentSimSubject.percentage).toFixed(1)}%
              </div>

              <div className="result-guidance-box">
                {simulatedPercentage >= 75 ? (
                  <div className="guidance-safe">
                    <CheckCircle2 size={16} />
                    <span>Safe Zone! You can safely miss <strong>{safeMisses}</strong> more lecture{safeMisses === 1 ? '' : 's'} and stay &ge; 75%.</span>
                  </div>
                ) : (
                  <div className="guidance-danger">
                    <AlertTriangle size={16} />
                    <span>Debarment Risk! You need to attend <strong>{neededClasses}</strong> consecutive classes to reach 75%.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. TWO-COLUMN LAYOUT: Subject-wise Health Breakdown + Today's Schedule */}
        <div className="dash-split-section">
          {/* Left: Subject Attendance Cards */}
          <div className="subject-health-column">
            <div className="column-header-row">
              <h2 className="column-title">Course-Wise Biometric Attendance</h2>
              <button 
                type="button" 
                className="column-link-btn"
                onClick={() => onNavigateTab('leaves')}
              >
                Request OD Credit &rarr;
              </button>
            </div>

            <div className="subject-cards-list">
              {ATTENDANCE_DATA.map((sub) => {
                const isSafe = sub.percentage >= 75;
                const isBorderline = sub.percentage >= 70 && sub.percentage < 75;
                const badgeClass = isSafe ? 'badge-safe' : isBorderline ? 'badge-warning' : 'badge-danger';
                const statusLabel = isSafe ? 'Eligible' : isBorderline ? 'Warning (70-75%)' : 'Debarred (<70%)';

                return (
                  <div key={sub.code} className="subject-item-card">
                    <div className="sub-header-line">
                      <div>
                        <span className="sub-code">{sub.code}</span>
                        <h3 className="sub-title">{sub.title}</h3>
                        <span className="sub-faculty">Instructor: {sub.faculty}</span>
                      </div>
                      <div className="sub-pct-block">
                        <span className="sub-pct-val">{sub.percentage}%</span>
                        <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="sub-progress-bar">
                      <div 
                        className={`sub-progress-fill ${isSafe ? 'fill-green' : isBorderline ? 'fill-yellow' : 'fill-red'}`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      />
                    </div>

                    <div className="sub-footer-meta">
                      <span>Attended: <strong>{sub.attended}</strong></span>
                      <span>Conducted: <strong>{sub.conducted}</strong></span>
                      <span>Approved ODs: <strong>{sub.onDuty}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Today's Class Schedule & Quick Launchpad */}
          <div className="schedule-side-column">
            {/* Today's Classes Card */}
            <div className="schedule-card">
              <div className="column-header-row">
                <h2 className="column-title">Today's Class Schedule</h2>
                <button 
                  type="button" 
                  className="column-link-btn"
                  onClick={() => onNavigateTab('timetable')}
                >
                  Full Week &rarr;
                </button>
              </div>

              <div className="schedule-timeline">
                {todayClasses.map((item, idx) => (
                  <div key={idx} className={`timeline-item ${idx === 1 ? 'item-active' : ''}`}>
                    <div className="timeline-time">
                      <span>{item.time.split(' - ')[0]}</span>
                      <span className="time-end">{item.time.split(' - ')[1]}</span>
                    </div>
                    <div className="timeline-marker">
                      <div className="marker-dot" />
                      {idx < todayClasses.length - 1 && <div className="marker-line" />}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-subject-title">{item.subjectCode}: {item.subjectTitle}</div>
                      <div className="timeline-sub-details">
                        <span>{item.faculty}</span>
                        <span className="venue-pill">{item.room}</span>
                        <span className="type-pill">{item.isLab ? 'Lab Practicum' : 'Lecture'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Campus Launchpad */}
            <div className="launchpad-card">
              <h3 className="launchpad-title">Student Services Launchpad</h3>
              <div className="launchpad-grid">
                <button 
                  type="button" 
                  className="launchpad-tile"
                  onClick={() => onNavigateTab('fees')}
                >
                  <Receipt size={20} className="tile-icon icon-purple" />
                  <span className="tile-name">Fee Receipts</span>
                  <ChevronRight size={14} className="tile-arrow" />
                </button>

                <button 
                  type="button" 
                  className="launchpad-tile"
                  onClick={() => onNavigateTab('gatepass')}
                >
                  <QrCode size={20} className="tile-icon icon-emerald" />
                  <span className="tile-name">Gate Pass</span>
                  <ChevronRight size={14} className="tile-arrow" />
                </button>

                <button 
                  type="button" 
                  className="launchpad-tile"
                  onClick={() => onNavigateTab('grades')}
                >
                  <GraduationCap size={20} className="tile-icon icon-blue" />
                  <span className="tile-name">Grade Card</span>
                  <ChevronRight size={14} className="tile-arrow" />
                </button>

                <button 
                  type="button" 
                  className="launchpad-tile"
                  onClick={() => onNavigateTab('lms')}
                >
                  <BookOpen size={20} className="tile-icon icon-amber" />
                  <span className="tile-name">LMS Portal</span>
                  <ChevronRight size={14} className="tile-arrow" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .student-dash-viewport {
          background: #f8fafc;
          min-height: calc(100vh - 64px);
          padding: 24px 20px 48px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }

        .student-dash-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* 1. HERO CARD */
        .dash-hero-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
        }

        .dash-hero-content {
          max-width: 750px;
        }

        .dash-term-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #562b63;
          background: rgba(86, 43, 99, 0.08);
          border: 1px solid rgba(86, 43, 99, 0.12);
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 10px;
        }

        .dash-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
          box-shadow: 0 0 6px #059669;
        }

        .dash-greeting {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
          line-height: 1.2;
        }

        .dash-subtext {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .roll-highlight {
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .dash-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .dash-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 16px;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          border: none;
        }

        .primary-plum {
          background: #562b63;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(86, 43, 99, 0.22);
        }

        .primary-plum:hover {
          background: #461f52;
        }

        .secondary-btn {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #0f172a;
        }

        .secondary-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* 2. METRICS GRID */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .metric-card {
          background: #ffffff;
          border-radius: 18px;
          border: 1.5px solid #e2e8f0;
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .metric-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .badge-safe {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .badge-warning {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fde68a;
        }

        .badge-danger {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .badge-live {
          background: #f3e8ff;
          color: #7e22ce;
          border: 1px solid #e9d5ff;
        }

        .badge-purple {
          background: #faf5ff;
          color: #6b21a8;
          border: 1px solid #e9d5ff;
        }

        .badge-clear {
          font-size: 0.72rem;
          font-weight: 600;
          color: #059669;
        }

        .metric-main-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .metric-main-value .unit {
          font-size: 1.3rem;
          font-weight: 600;
          color: #64748b;
        }

        .metric-main-value .unit-denom {
          font-size: 1.05rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .metric-progress-track {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .metric-progress-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s ease;
        }

        .emerald-fill {
          background: #059669;
        }

        .metric-footer-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #64748b;
        }

        .threshold-pill {
          font-size: 0.7rem;
          font-weight: 700;
          color: #562b63;
        }

        .class-title-text {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .class-venue-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 12px;
        }

        .info-icon {
          color: #562b63;
        }

        .next-class-tag {
          font-size: 0.74rem;
          font-weight: 600;
          color: #7f2672;
        }

        .action-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-item-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: #f8fafc;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .action-item-row:hover {
          background: #f1f5f9;
        }

        .action-item-icon {
          color: #562b63;
          flex-shrink: 0;
        }

        .action-item-text {
          font-size: 0.78rem;
          color: #334155;
          line-height: 1.3;
        }

        /* 3. SIMULATOR CARD */
        .dash-simulator-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          padding: 26px 28px;
          box-shadow: 0 6px 24px -6px rgba(15, 23, 42, 0.05);
        }

        .simulator-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .sim-title-group {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .sim-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(86, 43, 99, 0.08);
          color: #562b63;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sim-heading {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .sim-description {
          font-size: 0.84rem;
          color: #64748b;
          margin: 0;
        }

        .simulator-interactive-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 24px;
        }

        .sim-controls-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sim-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sim-field-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }

        .sim-dropdown {
          height: 42px;
          padding: 0 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 600;
          color: #0f172a;
          background: #ffffff;
          outline: none;
        }

        .sim-dropdown:focus {
          border-color: #562b63;
        }

        .sim-counters-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .sim-counter-card {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .counter-title {
          font-size: 0.74rem;
          font-weight: 600;
          color: #64748b;
        }

        .counter-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .counter-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #0f172a;
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .counter-btn:hover {
          background: #f1f5f9;
        }

        .counter-number {
          font-size: 1.15rem;
          font-weight: 800;
        }

        .text-attend {
          color: #059669;
        }

        .text-miss {
          color: #dc2626;
        }

        /* Result Card */
        .sim-result-card {
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .result-eligible {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
        }

        .result-debarred {
          background: #fef2f2;
          border: 1.5px solid #fecaca;
        }

        .result-top-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }

        .result-big-value {
          font-size: 2.6rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1;
          margin: 6px 0;
        }

        .result-unit {
          font-size: 1.5rem;
          color: #64748b;
        }

        .result-delta-pill {
          font-size: 0.76rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 12px;
        }

        .result-guidance-box {
          padding: 10px 12px;
          border-radius: 10px;
          background: #ffffff;
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .guidance-safe {
          color: #059669;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .guidance-danger {
          color: #dc2626;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* 4. SPLIT SECTIONS */
        .dash-split-section {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
        }

        .column-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .column-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .column-link-btn {
          font-size: 0.8rem;
          font-weight: 700;
          color: #562b63;
          background: none;
          border: none;
          cursor: pointer;
        }

        .column-link-btn:hover {
          text-decoration: underline;
        }

        /* Subject Cards */
        .subject-cards-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .subject-item-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 2px 12px -2px rgba(15, 23, 42, 0.03);
          transition: border-color 0.15s ease;
        }

        .subject-item-card:hover {
          border-color: #cbd5e1;
        }

        .sub-header-line {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .sub-code {
          font-size: 0.72rem;
          font-weight: 700;
          color: #562b63;
          background: rgba(86, 43, 99, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 3px;
        }

        .sub-title {
          font-size: 0.94rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 2px;
        }

        .sub-faculty {
          font-size: 0.76rem;
          color: #64748b;
        }

        .sub-pct-block {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .sub-pct-val {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        .sub-progress-bar {
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .sub-progress-fill {
          height: 100%;
          border-radius: 9999px;
        }

        .fill-green {
          background: #059669;
        }

        .fill-yellow {
          background: #d97706;
        }

        .fill-red {
          background: #dc2626;
        }

        .sub-footer-meta {
          display: flex;
          align-items: center;
          gap: 18px;
          font-size: 0.74rem;
          color: #64748b;
        }

        .sub-footer-meta strong {
          color: #0f172a;
        }

        /* Right Schedule Column */
        .schedule-side-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .schedule-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 4px 18px -4px rgba(15, 23, 42, 0.04);
        }

        .schedule-timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 10px;
        }

        .timeline-item {
          display: flex;
          gap: 14px;
          position: relative;
          padding-bottom: 16px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-time {
          width: 60px;
          font-size: 0.76rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .time-end {
          font-size: 0.68rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .marker-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #cbd5e1;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1.5px #cbd5e1;
          z-index: 2;
        }

        .item-active .marker-dot {
          background: #562b63;
          box-shadow: 0 0 0 2px #562b63;
        }

        .marker-line {
          width: 2px;
          flex: 1;
          background: #e2e8f0;
          margin-top: 4px;
        }

        .timeline-content {
          flex: 1;
          background: #f8fafc;
          border-radius: 10px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
        }

        .item-active .timeline-content {
          background: #faf5ff;
          border-color: rgba(86, 43, 99, 0.2);
        }

        .timeline-subject-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .timeline-sub-details {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          color: #64748b;
        }

        .venue-pill {
          background: #e2e8f0;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
          color: #334155;
        }

        .type-pill {
          color: #562b63;
          font-weight: 600;
        }

        /* Quick Launchpad */
        .launchpad-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
        }

        .launchpad-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
        }

        .launchpad-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .launchpad-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .launchpad-tile:hover {
          background: #ffffff;
          border-color: #562b63;
          box-shadow: 0 4px 12px -2px rgba(86, 43, 99, 0.1);
        }

        .tile-icon {
          flex-shrink: 0;
        }

        .icon-purple { color: #562b63; }
        .icon-emerald { color: #059669; }
        .icon-blue { color: #2563eb; }
        .icon-amber { color: #d97706; }

        .tile-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
          flex: 1;
          margin-left: 10px;
          text-align: left;
        }

        .tile-arrow {
          color: #94a3b8;
        }

        /* Responsive Layout */
        @media (max-width: 1080px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .dash-split-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dash-hero-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
          }
          .dash-hero-actions {
            width: 100%;
          }
          .dash-action-btn {
            flex: 1;
            justify-content: center;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .simulator-interactive-grid {
            grid-template-columns: 1fr;
          }
          .sim-counters-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
