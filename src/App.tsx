import { useState } from 'react';
import { Navbar } from './components/Navbar';
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

export function App() {
  const [currentRole, setCurrentRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div className="app-layout">
      {/* Universal Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={(role) => setCurrentRole(role)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
            <span className="footer-campus">Dehradun Campus Portal &bull; Camu-Next Initiative</span>
          </div>
          <div className="footer-right">
            <span>Built by University Student Dev Team &bull; Powered by Modern Web & PostgreSQL</span>
          </div>
        </div>
      </footer>

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
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
