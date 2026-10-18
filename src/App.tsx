import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PortalChoicePage } from './components/PortalChoicePage';
import { CamuLoginPage } from './components/CamuLoginPage';
import { TeacherLoginPage } from './components/TeacherLoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { SmartTimetable } from './components/SmartTimetable';
import { LeaveODManager } from './components/LeaveODManager';
import { LMSAssignments } from './components/LMSAssignments';
import { NoticeBoardView } from './components/NoticeBoardView';
import { FacultyAttendanceView } from './components/FacultyAttendanceView';
import { DefaultersView } from './components/DefaultersView';
import { FeeReceiptsView } from './components/FeeReceiptsView';
import { GradebookView } from './components/GradebookView';
import { HostelGatePassView } from './components/HostelGatePassView';
import { authApi, type UserSession } from './api/auth';
import { ShieldAlert, ShieldCheck, Lock, LogOut, ArrowLeft } from 'lucide-react';

type PortalView = 'choice' | 'student-login' | 'teacher-login';

function isTeacherAttempt(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const query = new URLSearchParams(window.location.search).get('portal');

  return (
    hostname.startsWith('teacher.') ||
    hostname.startsWith('faculty.') ||
    hostname === 'teacher.localhost' ||
    pathname === '/teacher' ||
    pathname === '/faculty' ||
    pathname.startsWith('/teacher/') ||
    pathname.startsWith('/faculty/') ||
    query === 'teacher' ||
    query === 'faculty'
  );
}

function detectInitialView(): PortalView {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const query = new URLSearchParams(window.location.search).get('portal');

  // Subdomain detection
  if (hostname.startsWith('student.') || hostname === 'student.localhost') {
    return 'student-login';
  }
  if (hostname.startsWith('teacher.') || hostname.startsWith('faculty.') || hostname === 'teacher.localhost') {
    return 'teacher-login';
  }

  // Pathname detection
  if (pathname === '/student' || pathname.startsWith('/student/')) {
    return 'student-login';
  }
  if (pathname === '/teacher' || pathname === '/faculty' || pathname.startsWith('/teacher/')) {
    return 'teacher-login';
  }

  // Explicit choice route (only when specifically navigated to /choice)
  if (pathname === '/choice' || query === 'choice') {
    return 'choice';
  }

  // Query parameter detection
  if (query === 'student') return 'student-login';
  if (query === 'teacher' || query === 'faculty') return 'teacher-login';

  // Fallback for returning users whose session/token/cookie expired or who logged out:
  // Directly fallback to their respective login page instead of the first-timer choice page!
  const lastRole = localStorage.getItem('dbs_last_user_role');
  if (lastRole === 'FACULTY') {
    return 'teacher-login';
  }
  if (lastRole === 'STUDENT' || localStorage.getItem('dbs_last_user_email')) {
    return 'student-login';
  }

  // Default root domain: choice between Student and Faculty portal strictly for brand-new visitors
  return 'choice';
}

export function App() {
  const [portalView, setPortalView] = useState<PortalView>(detectInitialView);
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentRole, setCurrentRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSecurityChallenge, setShowSecurityChallenge] = useState(false);

  // Check saved session & enforce route security on mount
  useEffect(() => {
    const existing = authApi.getCurrentSession();
    const teacherRouteRequested = isTeacherAttempt();

    if (existing) {
      if (existing.role === 'STUDENT') {
        // Authenticated as Student
        setSession(existing);
        setCurrentRole('STUDENT');

        if (teacherRouteRequested) {
          // Security violation attempt: student typed teacher URL!
          setShowSecurityChallenge(true);
          setPortalView('student-login');
        } else {
          setPortalView('student-login');
        }
      } else if (existing.role === 'FACULTY') {
        // Authenticated as Faculty
        setSession(existing);
        setCurrentRole('FACULTY');
        setPortalView('teacher-login');
        setActiveTab('faculty-attendance');
      }
    } else {
      // Unauthenticated visitor
      if (teacherRouteRequested) {
        setPortalView('teacher-login');
      } else {
        setPortalView(detectInitialView());
      }
    }

    setIsInitializing(false);
  }, []);

  // Listen to browser navigation / URL address bar changes for role security
  useEffect(() => {
    const handlePopState = () => {
      const existing = authApi.getCurrentSession();
      const teacherRoute = isTeacherAttempt();

      if (teacherRoute) {
        if (existing && existing.role === 'STUDENT') {
          // Block student from entering teacher space
          setShowSecurityChallenge(true);
          window.history.replaceState({}, '', '/student');
          return;
        }
        if (!existing) {
          setPortalView('teacher-login');
          return;
        }
      }

      setPortalView(detectInitialView());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectPortal = (target: 'student' | 'teacher') => {
    const currentHostname = window.location.hostname.toLowerCase();
    const isCustomDomain = currentHostname.includes('autonex.studio') || currentHostname.includes('dgu.');

    if (isCustomDomain && !currentHostname.startsWith('student.') && !currentHostname.startsWith('teacher.')) {
      const baseDomain = currentHostname.replace(/^www\./, '');
      const sub = target === 'student' ? 'student.' : 'teacher.';
      window.location.href = `${window.location.protocol}//${sub}${baseDomain}`;
      return;
    }

    if (target === 'student') {
      setPortalView('student-login');
      window.history.pushState({}, '', '/student');
    } else {
      setPortalView('teacher-login');
      window.history.pushState({}, '', '/teacher');
    }
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    const role = newSession.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
    setCurrentRole(role);
    localStorage.setItem('dbs_portal_mode', role === 'FACULTY' ? 'teacher' : 'student');
    localStorage.setItem('dbs_last_user_role', role);
    setActiveTab(role === 'FACULTY' ? 'faculty-attendance' : 'dashboard');
    setShowSecurityChallenge(false);

    if (role === 'STUDENT') {
      window.history.replaceState({}, '', '/student');
    } else {
      window.history.replaceState({}, '', '/teacher');
    }
  };

  const handleLogout = () => {
    // 1. Determine prior role for fallback redirect
    const targetRole: 'STUDENT' | 'FACULTY' =
      session?.role === 'FACULTY' || currentRole === 'FACULTY' || localStorage.getItem('dbs_last_user_role') === 'FACULTY'
        ? 'FACULTY'
        : 'STUDENT';

    // 2. Persist role so fallback always routes directly to their login screen
    localStorage.setItem('dbs_last_user_role', targetRole);

    // 3. Clear auth session & tokens
    authApi.logout();
    setSession(null);
    setShowSecurityChallenge(false);

    const currentHostname = window.location.hostname.toLowerCase();
    const isSubdomain = currentHostname.startsWith('student.') || currentHostname.startsWith('teacher.');

    // 4. Fallback redirect directly to their respective login page, NEVER to choice page!
    if (targetRole === 'FACULTY') {
      setPortalView('teacher-login');
      if (!isSubdomain) {
        window.history.pushState({}, '', '/teacher');
      }
    } else {
      setPortalView('student-login');
      if (!isSubdomain) {
        window.history.pushState({}, '', '/student');
      }
    }
  };

  // Handle token, cookie, or session expiration fallback
  useEffect(() => {
    const handleSessionExpired = () => {
      const targetRole: 'STUDENT' | 'FACULTY' =
        session?.role === 'FACULTY' || currentRole === 'FACULTY' || localStorage.getItem('dbs_last_user_role') === 'FACULTY'
          ? 'FACULTY'
          : 'STUDENT';

      localStorage.setItem('dbs_last_user_role', targetRole);
      authApi.logout();
      setSession(null);
      setShowSecurityChallenge(false);

      const currentHostname = window.location.hostname.toLowerCase();
      const isSubdomain = currentHostname.startsWith('student.') || currentHostname.startsWith('teacher.');

      if (targetRole === 'FACULTY') {
        setPortalView('teacher-login');
        if (!isSubdomain) {
          window.history.pushState({}, '', '/teacher');
        }
      } else {
        setPortalView('student-login');
        if (!isSubdomain) {
          window.history.pushState({}, '', '/student');
        }
      }
    };

    window.addEventListener('dbs-session-expired', handleSessionExpired);

    // Periodic heartbeat check: if session expired via inactivity timeout in authApi
    const checkInterval = setInterval(() => {
      if (session) {
        const current = authApi.getCurrentSession();
        if (!current) {
          handleSessionExpired();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('dbs-session-expired', handleSessionExpired);
      clearInterval(checkInterval);
    };
  }, [session, currentRole]);

  const handleDismissSecurityChallenge = () => {
    setShowSecurityChallenge(false);
    window.history.replaceState({}, '', '/student');
  };

  const handleSecuritySignOutToFaculty = () => {
    localStorage.setItem('dbs_last_user_role', 'FACULTY');
    authApi.logout();
    setSession(null);
    setShowSecurityChallenge(false);
    setPortalView('teacher-login');
    window.history.pushState({}, '', '/teacher');
  };

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: '1rem', color: '#562b63', fontWeight: 600 }}>
          Initializing DBS University Security Gateway...
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Gateway: Choice, Student Login, or Teacher Login
  if (!session) {
    if (portalView === 'choice') {
      return <PortalChoicePage onSelectPortal={handleSelectPortal} />;
    }

    if (portalView === 'teacher-login') {
      return (
        <TeacherLoginPage 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToStudent={() => {
            localStorage.setItem('dbs_last_user_role', 'STUDENT');
            setPortalView('student-login');
            window.history.pushState({}, '', '/student');
          }}
        />
      );
    }

    // Default to student login
    return (
      <CamuLoginPage 
        portalMode="student"
        onTogglePortal={() => {
          localStorage.setItem('dbs_last_user_role', 'FACULTY');
          setPortalView('teacher-login');
          window.history.pushState({}, '', '/teacher');
        }}
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  // 2. Authenticated Dashboard: Strictly isolated by role
  return (
    <div className="app-layout">
      {/* Top Security & Domain Strip */}
      <div className="subdomain-top-banner">
        <div className="banner-inner">
          <div className="subdomain-badge-active">
            <span className="dot-pulse"></span>
            <strong>{currentRole === 'STUDENT' ? 'student.autonex.studio' : 'teacher.autonex.studio'}</strong>
            <span className="badge-sep">&bull;</span>
            <span>
              {currentRole === 'STUDENT'
                ? 'DBS Global University &bull; Official Student &amp; Academic ERP'
                : 'DBS Global University &bull; Faculty &amp; Staff Administration'}
            </span>
          </div>

          <div className="banner-actions">
            <div className="security-tag-pill">
              <ShieldCheck size={13} className="text-emerald" />
              <span>Biometric 256-bit Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={() => {}}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        userSession={session}
        onLogout={handleLogout}
      />

      {/* Main Content Area - Strictly Enforced Student Portal */}
      <main className="main-content">
        {currentRole === 'STUDENT' ? (
          <>
            {activeTab === 'dashboard' && (
              <StudentDashboard 
                onNavigateTab={(tab) => setActiveTab(tab)} 
                userSession={session}
                onLogout={handleLogout}
              />
            )}
            {activeTab === 'timetable' && <SmartTimetable />}
            {activeTab === 'grades' && <GradebookView />}
            {activeTab === 'fees' && <FeeReceiptsView />}
            {activeTab === 'gatepass' && <HostelGatePassView />}
            {activeTab === 'leaves' && <LeaveODManager />}
            {activeTab === 'lms' && <LMSAssignments />}
            {activeTab === 'notices' && <NoticeBoardView />}
          </>
        ) : (
          <>
            {activeTab === 'faculty-attendance' && <FacultyAttendanceView />}
            {activeTab === 'defaulters' && <DefaultersView />}
            {activeTab === 'od-approvals' && <LeaveODManager />}
          </>
        )}
      </main>

      {/* Role Security Challenge Modal */}
      {showSecurityChallenge && (
        <div className="security-modal-overlay">
          <div className="security-modal-box">
            <div className="security-modal-header">
              <div className="security-icon-circle">
                <ShieldAlert size={28} />
              </div>
              <h2 className="security-title">Faculty Authentication Required</h2>
            </div>
            
            <p className="security-body-text">
              You attempted to navigate directly to the Faculty Administration Gateway (<code>/teacher</code>), but your active browser session is verified as a <strong>Student</strong> (<code>{session.name} - {session.rollNo || '23DBSBTECH042'}</code>).
            </p>
            
            <div className="security-note-box">
              <Lock size={15} />
              <span>Direct URL bypassing is strictly prohibited under DBS ERP Role-Based Access Control (RBAC).</span>
            </div>

            <div className="security-modal-actions">
              <button 
                type="button" 
                className="btn-security-primary"
                onClick={handleDismissSecurityChallenge}
              >
                <ArrowLeft size={16} />
                <span>Return to Student Dashboard</span>
              </button>

              <button 
                type="button" 
                className="btn-security-secondary"
                onClick={handleSecuritySignOutToFaculty}
              >
                <LogOut size={16} />
                <span>Sign Out &amp; Authenticate as Faculty</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* University Footer */}
      <footer className="portal-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-brand">DBS GLOBAL UNIVERSITY</span>
            <span className="footer-divider">&bull;</span>
            <span className="footer-campus">
              {currentRole === 'STUDENT' ? 'student.dgu.in' : 'teacher.dgu.in'} &bull; Dehradun Academic Campus
            </span>
          </div>
          <div className="footer-right">
            <span>
              Signed in as <strong>{session.name}</strong> ({session.role}) &bull;{' '}
              <button onClick={handleLogout} className="footer-signout-btn">
                Sign Out
              </button>
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .subdomain-top-banner {
          background: #562b63;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding: 7px 24px;
          font-size: 0.76rem;
          color: #f5eff8;
        }

        .banner-inner {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .subdomain-badge-active {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .subdomain-badge-active strong {
          color: #ffffff;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .dot-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        .badge-sep {
          color: rgba(255, 255, 255, 0.4);
        }

        .security-tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #ffffff;
        }

        .text-emerald {
          color: #34d399;
        }

        .main-content {
          flex: 1;
        }

        .portal-footer {
          margin-top: auto;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 16px 24px;
          font-size: 0.78rem;
          color: #64748b;
        }

        .footer-content {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-brand {
          font-weight: 700;
          color: #390c46;
          letter-spacing: 0.02em;
        }

        .footer-divider {
          color: #cbd5e1;
        }

        .footer-campus {
          color: #64748b;
        }

        .footer-signout-btn {
          color: #dc2626;
          font-weight: 600;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          text-decoration: underline;
        }

        .footer-signout-btn:hover {
          color: #b91c1c;
        }

        /* Role Security Modal */
        .security-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .security-modal-box {
          background: #ffffff;
          border-radius: 20px;
          padding: 32px 28px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.25);
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .security-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .security-icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #fef2f2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #fee2e2;
        }

        .security-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .security-body-text {
          font-size: 0.9rem;
          line-height: 1.55;
          color: #475569;
          margin: 0 0 16px 0;
        }

        .security-body-text code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          color: #562b63;
          font-weight: 600;
        }

        .security-note-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #faf5ff;
          border: 1px solid #f3e8ff;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.78rem;
          color: #6b21a8;
          text-align: left;
          margin-bottom: 24px;
        }

        .security-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-security-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          background: #562b63;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-security-primary:hover {
          background: #461f52;
        }

        .btn-security-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #64748b;
          font-weight: 600;
          font-size: 0.86rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .btn-security-secondary:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

export default App;
