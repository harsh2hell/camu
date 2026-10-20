import React from 'react';
import { 
  Bell, 
  LogOut, 
  CheckCircle2,
  Calendar,
  Award,
  Receipt,
  QrCode,
  FileText,
  BookOpen,
  Sparkles,
  Users,
  LifeBuoy
} from 'lucide-react';
import type { UserSession } from '../api/auth';
import { NotificationCenter } from './NotificationCenter';
import { getUnreadNotificationCount } from '../api/notifications';

interface NavbarProps {
  currentRole: 'STUDENT' | 'FACULTY';
  onRoleChange: (role: 'STUDENT' | 'FACULTY') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
  userSession?: UserSession | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeTab,
  onTabChange,
  unreadCount = 2,
  userSession,
  onLogout,
}) => {
  const studentName = userSession?.name || (currentRole === 'FACULTY' ? 'Faculty Member' : 'Authenticated Student');
  const studentRoll = userSession?.rollNo || (currentRole === 'FACULTY' ? 'FACULTY ID: #DBS-FAC-019' : 'DBS Student');
  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isFaculty = currentRole === 'FACULTY';
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = React.useState<number>(unreadCount);

  React.useEffect(() => {
    let isMounted = true;
    getUnreadNotificationCount()
      .then((res) => {
        if (isMounted) setLiveUnreadCount(res.data.unreadCount);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="dbs-navbar">
      <div className="dbs-navbar-inner">
        {/* LEFT: Official Brand Logo & Portal Badge */}
        <div className="dbs-navbar-brand">
          <img 
            src="/dbs_logo_dark.png" 
            alt="DBS Global University" 
            className="dbs-nav-logo"
            onClick={() => onTabChange(isFaculty ? 'faculty-attendance' : 'dashboard')}
          />
          <span className="dbs-nav-portal-badge">
            <span className="dbs-pulse-dot" />
            {isFaculty ? 'FACULTY GATEWAY' : 'STUDENT PORTAL'}
          </span>
        </div>

        {/* CENTER: Clean Navigation Tabs */}
        <nav className="dbs-nav-tabs" aria-label="Portal Navigation">
          {isFaculty ? (
            <>
              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'faculty-attendance' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('faculty-attendance')}
              >
                <CheckCircle2 size={16} className="tab-icon" />
                <span>Attendance Marker</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'defaulters' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('defaulters')}
              >
                <FileText size={16} className="tab-icon" />
                <span>Defaulters List</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'faculty-assignments' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('faculty-assignments')}
              >
                <BookOpen size={16} className="tab-icon" />
                <span>Course Assignments &amp; LMS</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'od-approvals' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('od-approvals')}
              >
                <Award size={16} className="tab-icon" />
                <span>OD Approvals</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'finance-admin' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('finance-admin')}
              >
                <Receipt size={16} className="tab-icon" />
                <span>Finance &amp; Fees</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'campus-notices' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('campus-notices')}
              >
                <Bell size={16} className="tab-icon" />
                <span>Notice Manager</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'student-records' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('student-records')}
              >
                <Users size={16} className="tab-icon" />
                <span>Mentorship &amp; Records</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'support-desk' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('support-desk')}
              >
                <LifeBuoy size={16} className="tab-icon" />
                <span>Helpdesk Queues</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('dashboard')}
              >
                <CheckCircle2 size={16} className="tab-icon" />
                <span>Attendance &amp; Home</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'timetable' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('timetable')}
              >
                <Calendar size={16} className="tab-icon" />
                <span>Smart Timetable</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'grades' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('grades')}
              >
                <Award size={16} className="tab-icon" />
                <span>Grades &amp; SGPA</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'fees' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('fees')}
              >
                <Receipt size={16} className="tab-icon" />
                <span>Fee Receipts</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'leaves' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('leaves')}
              >
                <FileText size={16} className="tab-icon" />
                <span>OD &amp; Leaves</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'lms' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('lms')}
              >
                <BookOpen size={16} className="tab-icon" />
                <span>LMS &amp; Tasks</span>
              </button>

              <button
                type="button"
                className={`dbs-tab-btn ${activeTab === 'gatepass' ? 'tab-active' : ''}`}
                onClick={() => onTabChange('gatepass')}
              >
                <QrCode size={16} className="tab-icon" />
                <span>Hostel Gate Pass</span>
              </button>
            </>
          )}
        </nav>

        {/* RIGHT: Notifications & Profile Pill */}
        <div className="dbs-navbar-actions">
          {/* AI Helper Pill */}
          <div className="dbs-ai-chip" title="DBS Smart Campus Intelligence active">
            <Sparkles size={13} className="ai-sparkle" />
            <span>AI Copilot</span>
          </div>

          {/* Notifications */}
          <button 
            type="button" 
            className="dbs-icon-btn" 
            aria-label={`Communications & Alerts (${liveUnreadCount} unread)`}
            title="Communications & Alerts"
            onClick={() => setShowNotifications(true)}
          >
            <Bell size={18} />
            {liveUnreadCount > 0 && <span className="dbs-notif-dot">{liveUnreadCount > 99 ? '99+' : liveUnreadCount}</span>}
          </button>

          {/* User Profile Pill */}
          <div className="dbs-user-pill">
            <div className="dbs-avatar-circle">
              {initials}
            </div>
            <div className="dbs-user-details">
              <span className="dbs-user-name">{studentName}</span>
              <span className="dbs-user-roll">{studentRoll}</span>
            </div>
          </div>

          {/* Log Out Button */}
          {onLogout && (
            <button 
              type="button" 
              className="dbs-logout-btn" 
              onClick={onLogout}
              title="Sign out of student portal"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        .dbs-navbar {
          background: #ffffff;
          border-bottom: 1.5px solid #e2e8f0;
          box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.04);
          position: sticky;
          top: 0;
          z-index: 50;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .dbs-navbar-inner {
          max-width: 1320px;
          margin: 0 auto;
          height: 64px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Brand & Logo */
        .dbs-navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .dbs-nav-logo {
          height: 34px;
          width: auto;
          cursor: pointer;
          object-fit: contain;
          transition: opacity 0.15s ease;
        }

        .dbs-nav-logo:hover {
          opacity: 0.9;
        }

        .dbs-nav-portal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #562b63;
          background: rgba(86, 43, 99, 0.08);
          border: 1px solid rgba(86, 43, 99, 0.12);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .dbs-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
          box-shadow: 0 0 6px #059669;
        }

        /* Navigation Tabs */
        .dbs-nav-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .dbs-nav-tabs::-webkit-scrollbar {
          display: none;
        }

        .dbs-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.83rem;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s ease;
        }

        .dbs-tab-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .dbs-tab-btn.tab-active {
          color: #562b63;
          background: rgba(86, 43, 99, 0.08);
          font-weight: 700;
        }

        .tab-icon {
          flex-shrink: 0;
          opacity: 0.85;
        }

        .dbs-tab-btn.tab-active .tab-icon {
          opacity: 1;
          color: #562b63;
        }

        /* Right Actions */
        .dbs-navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .dbs-ai-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #7f2672;
          background: linear-gradient(135deg, rgba(86, 43, 99, 0.08) 0%, rgba(217, 70, 239, 0.12) 100%);
          border: 1px solid rgba(127, 38, 114, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .ai-sparkle {
          color: #d946ef;
        }

        .dbs-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;
        }

        .dbs-icon-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .dbs-notif-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #ffffff;
        }

        /* Profile Pill */
        .dbs-user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
        }

        .dbs-avatar-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #562b63;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dbs-user-details {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
          text-align: left;
        }

        .dbs-user-name {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0f172a;
        }

        .dbs-user-roll {
          font-size: 0.68rem;
          color: #64748b;
          font-family: ui-monospace, monospace;
        }

        .dbs-logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dbs-logout-btn:hover {
          color: #dc2626;
          border-color: #fee2e2;
          background: #fef2f2;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .dbs-user-details {
            display: none;
          }
          .dbs-ai-chip {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .dbs-navbar-inner {
            padding: 0 12px;
            height: 56px;
          }
          .dbs-nav-portal-badge {
            display: none;
          }
          .dbs-tab-btn span {
            display: none;
          }
          .dbs-tab-btn {
            padding: 8px;
          }
          .dbs-logout-btn span {
            display: none;
          }
          .dbs-logout-btn {
            padding: 0 8px;
          }
        }
      `}</style>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigate={(tab) => {
          onTabChange(tab);
        }}
        onUnreadCountChange={(cnt) => setLiveUnreadCount(cnt)}
      />
    </header>
  );
};
