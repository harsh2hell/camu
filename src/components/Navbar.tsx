import React from 'react';
import { 
  GraduationCap, 
  Bell, 
  UserCheck, 
  ShieldCheck, 
  Sun, 
  Moon
} from 'lucide-react';
import { CURRENT_STUDENT } from '../data/mockData';

interface NavbarProps {
  currentRole: 'STUDENT' | 'FACULTY';
  onRoleChange: (role: 'STUDENT' | 'FACULTY') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  unreadCount = 3,
}) => {
  const [isLightMode, setIsLightMode] = React.useState(false);

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <header className="navbar-container glass-panel">
      <div className="navbar-inner">
        {/* University Brand */}
        <div className="brand-group">
          <div className="brand-crest">
            <GraduationCap className="crest-icon" size={24} />
          </div>
          <div className="brand-text">
            <div className="university-name">
              <span className="accent-text">DBS</span> GLOBAL UNIVERSITY
            </div>
            <div className="portal-sub">Smart Campus ERP &bull; Camu-Next</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Portal Navigation">
          {currentRole === 'STUDENT' ? (
            <>
              <button
                className={`tab-btn ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('dashboard')}
              >
                Attendance
              </button>
              <button
                className={`tab-btn ${activeTab === 'timetable' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('timetable')}
              >
                Schedule
              </button>
              <button
                className={`tab-btn ${activeTab === 'grades' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('grades')}
              >
                Grades & SGPA
              </button>
              <button
                className={`tab-btn ${activeTab === 'fees' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('fees')}
              >
                Fees & Receipts
              </button>
              <button
                className={`tab-btn ${activeTab === 'gatepass' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('gatepass')}
              >
                Hostel Gate Pass
              </button>
              <button
                className={`tab-btn ${activeTab === 'leaves' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('leaves')}
              >
                OD & Leaves
              </button>
              <button
                className={`tab-btn ${activeTab === 'lms' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('lms')}
              >
                LMS
              </button>
              <button
                className={`tab-btn ${activeTab === 'notices' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('notices')}
              >
                Noticeboard
              </button>
            </>
          ) : (
            <>
              <button
                className={`tab-btn ${activeTab === 'faculty-attendance' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('faculty-attendance')}
              >
                1-Click Attendance
              </button>
              <button
                className={`tab-btn ${activeTab === 'defaulters' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('defaulters')}
              >
                75% Defaulter Alert
              </button>
              <button
                className={`tab-btn ${activeTab === 'od-approvals' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('od-approvals')}
              >
                OD Approvals
              </button>
            </>
          )}
        </nav>

        {/* Right Utility Group */}
        <div className="nav-actions">
          {/* Quick Role Switcher (Demonstration Tool) */}
          <div className="role-switch-container">
            <span className="switch-label">Viewing As:</span>
            <div className="role-pills">
              <button
                type="button"
                className={`role-pill ${currentRole === 'STUDENT' ? 'pill-active' : ''}`}
                onClick={() => {
                  onRoleChange('STUDENT');
                  onTabChange('dashboard');
                }}
              >
                <UserCheck size={14} /> Student
              </button>
              <button
                type="button"
                className={`role-pill ${currentRole === 'FACULTY' ? 'pill-active' : ''}`}
                onClick={() => {
                  onRoleChange('FACULTY');
                  onTabChange('faculty-attendance');
                }}
              >
                <ShieldCheck size={14} /> Faculty
              </button>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title="Toggle theme"
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications */}
          <button 
            className="icon-btn notif-btn" 
            aria-label="View notifications"
            onClick={() => onTabChange('notices')}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {/* User Profile Chip */}
          <div className="user-chip">
            <div className="user-avatar">
              {currentRole === 'STUDENT' ? (
                <img src={CURRENT_STUDENT.avatarUrl} alt="Avatar" />
              ) : (
                <div className="faculty-initials">RS</div>
              )}
            </div>
            <div className="user-meta">
              <div className="user-name">
                {currentRole === 'STUDENT' ? CURRENT_STUDENT.name : 'Dr. Rajesh Sharma'}
              </div>
              <div className="user-tag">
                {currentRole === 'STUDENT' ? CURRENT_STUDENT.rollNo : 'HOD • CSE Dept'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .navbar-container {
          position: sticky;
          top: 12px;
          z-index: 100;
          margin: 12px 20px;
          padding: 8px 16px;
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .brand-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-crest {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--navy-800), var(--blue-700));
          border: 1px solid rgba(245, 158, 11, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--amber-400);
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
        }

        .university-name {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }

        .accent-text {
          color: var(--amber-400);
        }

        .portal-sub {
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .nav-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 4px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .tab-btn {
          padding: 6px 14px;
          font-size: 0.825rem;
          font-weight: 600;
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-active {
          background: var(--blue-600);
          color: white !important;
          box-shadow: 0 2px 10px rgba(37, 99, 235, 0.4);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .role-switch-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .switch-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .role-pills {
          display: flex;
          gap: 4px;
        }

        .role-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .pill-active {
          background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
          color: #0b1329;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
        }

        .icon-btn {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .notif-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 17px;
          height: 17px;
          border-radius: var(--radius-full);
          background: var(--rose-500);
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 12px 4px 4px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }

        .user-avatar img, .faculty-initials {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .faculty-initials {
          background: var(--blue-700);
          color: white;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-meta {
          line-height: 1.2;
        }

        .user-name {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .user-tag {
          font-size: 0.68rem;
          color: var(--text-secondary);
        }

        @media (max-width: 900px) {
          .nav-tabs {
            order: 3;
            width: 100%;
            justify-content: center;
            overflow-x: auto;
          }
        }
      `}</style>
    </header>
  );
};
