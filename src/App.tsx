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

type PortalView = 'choice' | 'student-login' | 'teacher-login';

function detectInitialView(): PortalView {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const query = new URLSearchParams(window.location.search).get('portal');

  // 1. Subdomain detection (e.g. student.autonex.studio, teacher.autonex.studio)
  if (hostname.startsWith('student.') || hostname === 'student.localhost') {
    return 'student-login';
  }
  if (hostname.startsWith('teacher.') || hostname.startsWith('faculty.') || hostname === 'teacher.localhost') {
    return 'teacher-login';
  }

  // 2. URL Pathname detection (e.g. /student, /teacher)
  if (pathname === '/student' || pathname.startsWith('/student/')) {
    return 'student-login';
  }
  if (pathname === '/teacher' || pathname === '/faculty' || pathname.startsWith('/teacher/')) {
    return 'teacher-login';
  }

  // 3. Query Parameter detection (e.g. ?portal=student)
  if (query === 'student') return 'student-login';
  if (query === 'teacher' || query === 'faculty') return 'teacher-login';

  // 4. Default for root domain (autonex.studio, dgu-eight.vercel.app, localhost): Show Choice Page
  return 'choice';
}

export function App() {
  const [portalView, setPortalView] = useState<PortalView>(detectInitialView);
  const [portalMode, setPortalMode] = useState<'student' | 'teacher'>(() => {
    const initial = detectInitialView();
    return initial === 'teacher-login' ? 'teacher' : 'student';
  });

  const [session, setSession] = useState<UserSession | null>(null);
  const [currentRole, setCurrentRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  // Check saved session on mount
  useEffect(() => {
    const existing = authApi.getCurrentSession();
    if (existing) {
      setSession(existing);
      const role = existing.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
      setCurrentRole(role);
      setPortalMode(role === 'FACULTY' ? 'teacher' : 'student');
      setPortalView(role === 'FACULTY' ? 'teacher-login' : 'student-login');
    }
    setIsInitializing(false);
  }, []);

  const handleSelectPortal = (target: 'student' | 'teacher') => {
    const currentHostname = window.location.hostname.toLowerCase();
    const isCustomDomain = currentHostname.includes('autonex.studio') || currentHostname.includes('dgu.');

    // If live on a domain with subdomains configured
    if (isCustomDomain && !currentHostname.startsWith('student.') && !currentHostname.startsWith('teacher.')) {
      const baseDomain = currentHostname.replace(/^www\./, '');
      const sub = target === 'student' ? 'student.' : 'teacher.';
      window.location.href = `${window.location.protocol}//${sub}${baseDomain}`;
      return;
    }

    // Client-side routing transition
    if (target === 'student') {
      setPortalView('student-login');
      setPortalMode('student');
      window.history.pushState({}, '', '/student');
    } else {
      setPortalView('teacher-login');
      setPortalMode('teacher');
      window.history.pushState({}, '', '/teacher');
    }
  };

  const handlePortalChange = (mode: 'student' | 'teacher') => {
    setPortalMode(mode);
    setPortalView(mode === 'student' ? 'student-login' : 'teacher-login');
    localStorage.setItem('dbs_portal_mode', mode);
    window.history.pushState({}, '', mode === 'student' ? '/student' : '/teacher');
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    const role = newSession.role === 'FACULTY' ? 'FACULTY' : 'STUDENT';
    setCurrentRole(role);
    setPortalMode(role === 'FACULTY' ? 'teacher' : 'student');
    localStorage.setItem('dbs_portal_mode', role === 'FACULTY' ? 'teacher' : 'student');
    setActiveTab(role === 'FACULTY' ? 'faculty-attendance' : 'dashboard');
  };

  const handleLogout = () => {
    authApi.logout();
    setSession(null);
    const currentHostname = window.location.hostname.toLowerCase();
    const isSubdomain = currentHostname.startsWith('student.') || currentHostname.startsWith('teacher.');
    
    // If not locked to a specific subdomain, return cleanly to the main choice page
    if (!isSubdomain) {
      setPortalView('choice');
      window.history.pushState({}, '', '/');
    }
  };

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>Loading DBS Global University Portal...</div>
      </div>
    );
  }

  // 1. If not authenticated: Route between Main Choice, Student Login, or Teacher Login
  if (!session) {
    if (portalView === 'choice') {
      return <PortalChoicePage onSelectPortal={handleSelectPortal} />;
    }

    if (portalView === 'teacher-login') {
      return (
        <TeacherLoginPage 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToStudent={() => {
            setPortalView('student-login');
            setPortalMode('student');
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
          setPortalView('teacher-login');
          setPortalMode('teacher');
          window.history.pushState({}, '', '/teacher');
        }}
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  // 2. If authenticated, show full University Campus Portal
  return (
    <div className="app-layout">
      {/* Top Portal Banner */}
      <div className="subdomain-top-banner">
        <div className="banner-inner">
          <div className="subdomain-badge-active">
            <span className="dot-pulse"></span>
            <strong>{currentRole === 'STUDENT' ? 'student.autonex.studio' : 'teacher.autonex.studio'}</strong>
            <span className="badge-sep">&bull;</span>
            <span>{currentRole === 'STUDENT' ? 'Student & Parent Portal' : 'Faculty & Staff Administration Gateway'}</span>
          </div>

          <div className="banner-actions">
            <button 
              className="switch-portal-btn-top"
              onClick={() => {
                const nextMode = portalMode === 'student' ? 'teacher' : 'student';
                handleLogout();
                handlePortalChange(nextMode);
              }}
            >
              Switch to {portalMode === 'student' ? 'teacher.autonex.studio' : 'student.autonex.studio'} &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Universal Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        userSession={session}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {currentRole === 'STUDENT' ? (
          <>
            {activeTab === 'dashboard' && (
              <StudentDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
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

      {/* University Footer */}
      <footer className="portal-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-brand">DBS GLOBAL UNIVERSITY</span>
            <span className="footer-divider">&bull;</span>
            <span className="footer-campus">
              {currentRole === 'STUDENT' ? 'student.dgu.in' : 'teacher.dgu.in'} &bull; Dehradun Campus
            </span>
          </div>
          <div className="footer-right">
            <span>
              Signed in as <strong>{session.name}</strong> ({session.role}) &bull;{' '}
              <button onClick={handleLogout} style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 600 }}>
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
        }

        .subdomain-top-banner {
          background: #0b1329;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 20px;
          font-size: 0.75rem;
          color: #94a3b8;
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
          color: ${currentRole === 'STUDENT' ? '#38bdf8' : '#fbbf24'};
        }

        .dot-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${currentRole === 'STUDENT' ? '#38bdf8' : '#fbbf24'};
          box-shadow: 0 0 6px ${currentRole === 'STUDENT' ? '#38bdf8' : '#fbbf24'};
        }

        .badge-sep {
          color: #475569;
        }

        .switch-portal-btn-top {
          background: none;
          border: none;
          color: #cbd5e1;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.75rem;
          padding: 2px 6px;
        }

        .switch-portal-btn-top:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .main-content {
          flex: 1;
        }

        .portal-footer {
          margin-top: auto;
          border-top: 1px solid var(--border-subtle);
          background: rgba(6, 11, 20, 0.7);
          padding: 16px 24px;
          font-size: 0.78rem;
          color: var(--text-muted);
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
          color: var(--text-secondary);
        }

        .footer-divider {
          color: var(--amber-500);
        }
      `}</style>
    </div>
  );
}

export default App;
