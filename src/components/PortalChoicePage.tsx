import React from 'react';
import { GraduationCap, Briefcase, ArrowRight, ShieldCheck, HelpCircle, Building2, CheckCircle2 } from 'lucide-react';

interface PortalChoicePageProps {
  onSelectPortal: (portal: 'student' | 'teacher') => void;
}

export const PortalChoicePage: React.FC<PortalChoicePageProps> = ({ onSelectPortal }) => {
  const currentHostname = window.location.hostname;
  const isCustomDomain = currentHostname.includes('autonex.studio') || currentHostname.includes('dgu.');

  const handlePortalClick = (target: 'student' | 'teacher') => {
    // If on a live custom domain that supports subdomains, navigate to subdomain
    if (isCustomDomain && !currentHostname.startsWith('student.') && !currentHostname.startsWith('teacher.')) {
      const baseDomain = currentHostname.replace(/^www\./, '');
      const targetSubdomain = target === 'student' ? 'student.' : 'teacher.';
      // Try navigating to subdomain, fallback to client state if fails
      window.location.href = `${window.location.protocol}//${targetSubdomain}${baseDomain}`;
      return;
    }
    // Default / fallback: Client routing via state or path
    onSelectPortal(target);
  };

  return (
    <div className="choice-viewport">
      {/* Background Decor */}
      <div className="choice-bg-gradient" />
      <div className="choice-bg-mesh" />

      {/* Main Choice Card Container */}
      <div className="choice-container">
        {/* University Header */}
        <header className="choice-header">
          <div className="choice-brand-logo-wrap">
            <img 
              src="/dbs_logo_dark.png" 
              alt="DBS Global University" 
              className="choice-main-logo"
            />
          </div>
          <span className="choice-tagline">Academic Enterprise Gateway &bull; Digital Campus 2026</span>
          <h1 className="choice-title">Select Your Academic Portal</h1>
          <p className="choice-subtitle">
            Welcome to DBS Global University. Please choose your designated gateway to access student services or faculty administration.
          </p>
        </header>

        {/* 2 Choice Portals Grid */}
        <div className="choice-grid">
          {/* Card 1: Student & Parent Portal */}
          <div 
            className="choice-card student-card"
            onClick={() => handlePortalClick('student')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePortalClick('student'); }}
          >
            <div className="card-top-row">
              <div className="card-icon-wrap student-icon-wrap">
                <GraduationCap size={28} />
              </div>
              <span className="card-badge student-badge">STUDENT &amp; PARENT</span>
            </div>

            <div className="card-body">
              <h2 className="card-name">Student Portal</h2>
              <div className="card-domain-slug">
                <span>student.autonex.studio</span>
                <span className="card-domain-alias">&bull; student.dgu.in</span>
              </div>
              <p className="card-desc">
                Access course registrations, smart AI timetable, attendance analytics, LMS assignments, examination grades, fee receipts, and campus gate passes.
              </p>

              <ul className="card-feature-list">
                <li><CheckCircle2 size={14} className="feature-check" /> Real-time biometric attendance tracker</li>
                <li><CheckCircle2 size={14} className="feature-check" /> Instant OD / Leave applications &amp; Gate pass</li>
                <li><CheckCircle2 size={14} className="feature-check" /> Semester fee receipts &amp; exam grade cards</li>
              </ul>
            </div>

            <div className="card-footer">
              <button 
                type="button" 
                className="choice-action-btn student-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePortalClick('student');
                }}
              >
                <span>Enter Student Portal</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          {/* Card 2: Faculty & Staff Gateway */}
          <div 
            className="choice-card faculty-card"
            onClick={() => handlePortalClick('teacher')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePortalClick('teacher'); }}
          >
            <div className="card-top-row">
              <div className="card-icon-wrap faculty-icon-wrap">
                <Briefcase size={28} />
              </div>
              <span className="card-badge faculty-badge">FACULTY &amp; STAFF</span>
            </div>

            <div className="card-body">
              <h2 className="card-name">Faculty Gateway</h2>
              <div className="card-domain-slug">
                <span>teacher.autonex.studio</span>
                <span className="card-domain-alias">&bull; teacher.dgu.in</span>
              </div>
              <p className="card-desc">
                Classroom attendance recording, defaulter lists, OD &amp; leave approvals, grade submission, academic courseware, and faculty performance dashboards.
              </p>

              <ul className="card-feature-list">
                <li><CheckCircle2 size={14} className="feature-check" /> Fast 1-click lecture attendance logging</li>
                <li><CheckCircle2 size={14} className="feature-check" /> Real-time student OD &amp; medical leave approvals</li>
                <li><CheckCircle2 size={14} className="feature-check" /> Defaulter reports &amp; student academic monitoring</li>
              </ul>
            </div>

            <div className="card-footer">
              <button 
                type="button" 
                className="choice-action-btn faculty-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePortalClick('teacher');
                }}
              >
                <span>Enter Faculty Gateway</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Help Bar */}
        <footer className="choice-bottom-bar">
          <div className="choice-bottom-item">
            <ShieldCheck size={16} className="choice-bottom-icon" />
            <span>256-bit Encrypted University SSO Authentication</span>
          </div>
          <div className="choice-bottom-sep">&bull;</div>
          <div className="choice-bottom-item">
            <Building2 size={16} className="choice-bottom-icon" />
            <span>DBS Global University, Dehradun</span>
          </div>
          <div className="choice-bottom-sep">&bull;</div>
          <div className="choice-bottom-item">
            <HelpCircle size={16} className="choice-bottom-icon" />
            <a href="mailto:registrar@dbs.edu.in" className="choice-help-link">Need Help? Registrar Office</a>
          </div>
        </footer>
      </div>

      <style>{`
        .choice-viewport {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 16px;
          position: relative;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .choice-bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(86, 43, 99, 0.08) 0%, transparent 60%),
                      radial-gradient(circle at 10% 90%, rgba(57, 12, 70, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .choice-bg-mesh {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#cbd5e1 0.75px, transparent 0.75px);
          background-size: 24px 24px;
          opacity: 0.45;
          pointer-events: none;
        }

        .choice-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* University Header */
        .choice-header {
          text-align: center;
          margin-bottom: 32px;
          max-width: 680px;
        }

        .choice-brand-logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        }

        .choice-main-logo {
          height: 44px;
          width: auto;
          max-width: 260px;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.04));
        }

        .choice-tagline {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #562b63;
          background: rgba(86, 43, 99, 0.07);
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 12px;
        }

        .choice-title {
          font-size: 2.1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin: 0 0 10px;
        }

        .choice-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        /* Two Choice Cards Grid */
        .choice-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
          margin-bottom: 28px;
        }

        .choice-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1.5px solid #e2e8f0;
          padding: 28px 26px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.02);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }

        .choice-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px rgba(86, 43, 99, 0.16), 0 0 0 1.5px #562b63;
          border-color: #562b63;
        }

        .choice-card:focus-visible {
          box-shadow: 0 0 0 3px rgba(86, 43, 99, 0.25);
          border-color: #562b63;
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .card-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .choice-card:hover .card-icon-wrap {
          transform: scale(1.08);
        }

        .student-icon-wrap {
          background: rgba(86, 43, 99, 0.08);
          color: #562b63;
        }

        .faculty-icon-wrap {
          background: rgba(57, 12, 70, 0.08);
          color: #390c46;
        }

        .card-badge {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .student-badge {
          background: #f3e8ff;
          color: #6b21a8;
        }

        .faculty-badge {
          background: #fdf2f8;
          color: #9d174d;
        }

        .card-name {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
          letter-spacing: -0.015em;
        }

        .card-domain-slug {
          font-size: 0.8rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: #562b63;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-domain-alias {
          color: #94a3b8;
          font-weight: 400;
        }

        .card-desc {
          font-size: 0.86rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0 0 16px;
        }

        .card-feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .card-feature-list li {
          font-size: 0.81rem;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .feature-check {
          color: #059669;
          flex-shrink: 0;
        }

        /* Action Buttons */
        .choice-action-btn {
          width: 100%;
          height: 46px;
          border: none;
          border-radius: 12px;
          font-size: 0.94rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.18s ease;
        }

        .student-btn {
          background: #562b63;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(86, 43, 99, 0.22);
        }

        .student-btn:hover {
          background: #461f52;
          box-shadow: 0 6px 18px rgba(86, 43, 99, 0.32);
        }

        .faculty-btn {
          background: #390c46;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(57, 12, 70, 0.22);
        }

        .faculty-btn:hover {
          background: #2a0834;
          box-shadow: 0 6px 18px rgba(57, 12, 70, 0.32);
        }

        /* Bottom Bar */
        .choice-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.78rem;
          color: #64748b;
          text-align: center;
        }

        .choice-bottom-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .choice-bottom-icon {
          color: #562b63;
        }

        .choice-bottom-sep {
          color: #cbd5e1;
        }

        .choice-help-link {
          color: #562b63;
          font-weight: 600;
          text-decoration: underline;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .choice-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .choice-title {
            font-size: 1.6rem;
          }

          .choice-card {
            padding: 22px 18px 20px;
          }

          .choice-header {
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
};
