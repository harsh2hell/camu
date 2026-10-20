import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  Bell,
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  Settings,
  Plus,
  Home,
  MessageSquare,
  GraduationCap,
  BarChart2,
  Trophy,
  Users,
  Clock,
  X,
  FileText,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Sliders,
  Menu,
  CheckCircle2,
  BookOpen,
  Award,
  Layers,
  Sparkles,
  CreditCard,
  Building,
  HeartHandshake,
  CheckSquare,
  User,
  CalendarCheck,
  Download,
  AlertCircle,
  FileCheck,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Mail,
  Loader2,
} from 'lucide-react';
import { CURRENT_STUDENT } from '../data/mockData';
import type { UserSession } from '../api/auth';
import { attendanceApi } from '../api/attendance';
import { calendarApi } from '../api/calendar';
import type { CalendarEventDTO } from '../../server/src/types/calendar';
import type { OverallAttendanceSummary } from '../../server/src/utils/attendanceCalculator';

import { SmartTimetable } from './SmartTimetable';
import { GradebookView } from './GradebookView';
import { FeeReceiptsView } from './FeeReceiptsView';
import { HostelGatePassView } from './HostelGatePassView';
import { LeaveODManager } from './LeaveODManager';
import { LMSAssignments } from './LMSAssignments';
import { NoticeBoardView } from './NoticeBoardView';
import { StudentProfileView } from './StudentProfileView';

interface StudentDashboardProps {
  activeTab?: string;
  onNavigateTab: (tab: string) => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  activeTab = 'dashboard',
  onNavigateTab,
  userSession,
  onLogout,
}) => {
  // Mobile sidemenu drawer state
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Dropdown states
  const [growthTimeframe, setGrowthTimeframe] = useState<'Monthly' | 'Weekly' | 'Semester'>('Monthly');
  const [showGrowthDropdown, setShowGrowthDropdown] = useState(false);
  
  const [attendanceTimeframe, setAttendanceTimeframe] = useState<'Monthly' | 'Weekly' | 'Quarterly'>('Monthly');
  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);

  // Top Teachers tab toggle
  const [teacherTab, setTeacherTab] = useState<'All Time' | 'This year'>('This year');

  // Profile menu dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Spotlight / Search Modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications Modal
  const [showNotifications, setShowNotifications] = useState(false);

  // Calendar Modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Member / Action Modal
  const [activeActionModal, setActiveActionModal] = useState<'student' | 'teacher' | 'event' | null>(null);

  // Card details modal (for ↗ arrows)
  const [selectedCardDetail, setSelectedCardDetail] = useState<{
    title: string;
    subtitle: string;
    metric: string;
    description: string;
  } | null>(null);

  // Hovered attendance bar for tooltip
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // 3-dots action menu dropdown per item
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Floating Bar Submenu Category State & Camu Modals
  const [activeFloatingCategory, setActiveFloatingCategory] = useState<string | null>(null);
  const [floatingBarTop, setFloatingBarTop] = useState<number>(100);
  const [activeCamuModal, setActiveCamuModal] = useState<
    'profile' | 'attendance' | 'exams' | 'counselling' | 'transcripts' | 'clearance' | 'feedback' | 'activities' | 'messages' | 'enrollment' | 'institution' | 'settings' | null
  >(null);
  const [liveAttendanceSummary, setLiveAttendanceSummary] = useState<OverallAttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const fetchAttendanceSummary = async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const summary = await attendanceApi.getMySummary();
      setLiveAttendanceSummary(summary);
    } catch (err: any) {
      console.warn('Attendance summary fetch failed:', err);
      setAttendanceError(err.message || 'Unable to retrieve live attendance records.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  // Academic Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDTO[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const fetchCalendarEvents = async () => {
    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const res = await calendarApi.getEvents();
      if (res && res.events) {
        setCalendarEvents(res.events);
      }
    } catch (err: any) {
      console.warn('Academic calendar fetch failed:', err);
      setCalendarError(err.message || 'Unable to retrieve university calendar events.');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (showCalendarModal) {
      fetchCalendarEvents();
    }
  }, [showCalendarModal]);

  const [camuToastText, setCamuToastText] = useState<string | null>(null);

  const showCamuToast = (msg: string) => {
    setCamuToastText(msg);
    setTimeout(() => setCamuToastText(null), 3600);
  };

  const handleCategoryClick = (catId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const topPos = rect.top - 10;
    if (activeFloatingCategory === catId) {
      setActiveFloatingCategory(null);
    } else {
      setActiveFloatingCategory(catId);
      setFloatingBarTop(topPos);
    }
  };

  // Curated Navigation Categories grouping all 23+ Camu functions
  const navCategories = [
    {
      id: 'academics',
      label: 'Academics & Learning',
      shortLabel: 'LMS & Courses',
      icon: <GraduationCap size={19} />,
      items: [
        {
          id: 'lms',
          title: 'Assignments & LMS Deliverables',
          sub: 'Problem sets, submission deadlines & lab briefs',
          icon: <FileText size={16} />,
          badge: '2 Due Soon',
          badgeColor: 'badge-amber',
          onClick: () => onNavigateTab('lms'),
        },
        {
          id: 'timetable',
          title: 'Smart Timetable & Schedules',
          sub: 'Interactive room allocations & lecture statuses',
          icon: <Clock size={16} />,
          badge: 'Live Session',
          badgeColor: 'badge-blue',
          onClick: () => onNavigateTab('timetable'),
        },
        {
          id: 'grades',
          title: 'Assessments & Gradebook',
          sub: 'Continuous assessments, SGPA & term credits',
          icon: <Trophy size={16} />,
          badge: '8.64 CGPA',
          badgeColor: 'badge-emerald',
          onClick: () => onNavigateTab('grades'),
        },
        {
          id: 'exams',
          title: 'Exam Schedules & Datesheets',
          sub: 'Mid-term, End-term datesheets & re-evaluation',
          icon: <CheckSquare size={16} />,
          badge: 'Odd Sem',
          badgeColor: 'badge-purple',
          onClick: () => setActiveCamuModal('exams'),
        },
      ],
    },
    {
      id: 'attendance',
      label: 'Attendance & Campus Passes',
      shortLabel: 'Passes & Biometrics',
      icon: <CalendarCheck size={19} />,
      items: [
        {
          id: 'attendance',
          title: 'Attendance Analytics & Biometrics',
          sub: '75% mandatory criteria tracker & eligibility',
          icon: <BarChart2 size={16} />,
          badge: liveAttendanceSummary ? `${liveAttendanceSummary.overallPercentage}% ${liveAttendanceSummary.isExamEligible ? 'Safe' : 'Debarred'}` : '86.4% Safe',
          badgeColor: liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? 'badge-rose' : 'badge-emerald',
          onClick: () => setActiveCamuModal('attendance'),
        },
        {
          id: 'leaves',
          title: 'Leave & On-Duty (OD) Pass',
          sub: 'Medical leave, sports OD & hackathon permissions',
          icon: <CalendarIcon size={16} />,
          badge: '1 Pending',
          badgeColor: 'badge-amber',
          onClick: () => onNavigateTab('leaves'),
        },
        {
          id: 'gatepass',
          title: 'Hostel Digital Gate Pass',
          sub: 'Warden verification, digital QR pass & outings',
          icon: <KeyRound size={16} />,
          badge: 'Active QR',
          badgeColor: 'badge-blue',
          onClick: () => onNavigateTab('gatepass'),
        },
        {
          id: 'activities',
          title: 'Student Activities & Clubs',
          sub: 'ACM Student Chapter, campus clubs & sports',
          icon: <Users size={16} />,
          badge: '3 Clubs',
          badgeColor: 'badge-purple',
          onClick: () => setActiveCamuModal('activities'),
        },
      ],
    },
    {
      id: 'communication',
      label: 'Noticeboard & Communication',
      shortLabel: 'Notices & Messages',
      icon: <MessageSquare size={19} />,
      items: [
        {
          id: 'notices',
          title: 'University Noticeboard & Circulars',
          sub: 'Registrar, Dean Academics & exam circulars',
          icon: <Bell size={16} />,
          badge: 'Pinned Circular',
          badgeColor: 'badge-blue',
          onClick: () => onNavigateTab('notices'),
        },
        {
          id: 'messages',
          title: 'Official Department Messages',
          sub: 'Direct faculty notices, alerts & announcements',
          icon: <Mail size={16} />,
          badge: '4 Unread',
          badgeColor: 'badge-amber',
          onClick: () => setActiveCamuModal('messages'),
        },
        {
          id: 'counselling',
          title: 'Student Counselling & Mentorship',
          sub: 'Book 1-on-1 slot with advisor or wellness guide',
          icon: <HeartHandshake size={16} />,
          badge: 'Available',
          badgeColor: 'badge-emerald',
          onClick: () => setActiveCamuModal('counselling'),
        },
        {
          id: 'feedback',
          title: 'CAMU Feedback & Grievance Cell',
          sub: 'Service requests, curriculum suggestions & helpdesk',
          icon: <AlertCircle size={16} />,
          badge: 'CAMU Desk',
          badgeColor: 'badge-slate',
          onClick: () => setActiveCamuModal('feedback'),
        },
      ],
    },
    {
      id: 'services',
      label: 'Services, Billing & Records',
      shortLabel: 'Finance & Records',
      icon: <Layers size={19} />,
      items: [
        {
          id: 'fees',
          title: 'Billing & Fee Receipts',
          sub: 'Semester tuition dues, online fee clearance & receipts',
          icon: <CreditCard size={16} />,
          badge: '₹0 Dues',
          badgeColor: 'badge-emerald',
          onClick: () => onNavigateTab('fees'),
        },
        {
          id: 'transcripts',
          title: 'Official Transcripts & Grade Sheets',
          sub: 'Semester marksheets, bonafide & document vault',
          icon: <FileCheck size={16} />,
          badge: 'Verified',
          badgeColor: 'badge-blue',
          onClick: () => setActiveCamuModal('transcripts'),
        },
        {
          id: 'clearance',
          title: 'Institutional Clearance (No-Dues)',
          sub: 'Library, labs, sports & accounts no-dues clearance',
          icon: <ShieldCheck size={16} />,
          badge: '100% Cleared',
          badgeColor: 'badge-emerald',
          onClick: () => setActiveCamuModal('clearance'),
        },
        {
          id: 'enrollment',
          title: 'Course Enrollment & Electives',
          sub: 'Semester course registration & elective tracks',
          icon: <BookOpen size={16} />,
          badge: '24.0 Credits',
          badgeColor: 'badge-amber',
          onClick: () => setActiveCamuModal('enrollment'),
        },
      ],
    },
    {
      id: 'profile',
      label: 'My Institution & Profile',
      shortLabel: 'My Camu ID',
      icon: <Settings size={19} />,
      items: [
        {
          id: 'camu_profile',
          title: 'My Camu Student Profile',
          sub: 'Student details, mentor, department & academic standing',
          icon: <User size={16} />,
          badge: 'Active',
          badgeColor: 'badge-emerald',
          onClick: () => onNavigateTab('profile'),
        },
        {
          id: 'institution',
          title: 'My Institution (DBS Global University)',
          sub: 'Campus contacts, academic policies & accreditation',
          icon: <Building size={16} />,
          badge: 'Dehradun',
          badgeColor: 'badge-blue',
          onClick: () => setActiveCamuModal('institution'),
        },
        {
          id: 'settings',
          title: 'Security & Portal Preferences',
          sub: 'Password change, biometric 2FA & alerts',
          icon: <Sliders size={16} />,
          badge: 'Security',
          badgeColor: 'badge-slate',
          onClick: () => setActiveCamuModal('settings'),
        },
        {
          id: 'logout',
          title: 'Sign Out of Session',
          sub: 'Safely terminate student session and lock portal',
          icon: <LogOut size={16} />,
          badge: 'Logout',
          badgeColor: 'badge-rose',
          onClick: () => {
            if (onLogout) onLogout();
          },
        },
      ],
    },
  ];

  const currentCategory = navCategories.find(c => c.id === activeFloatingCategory);

  // Keyboard shortcut listener for ⌘+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowMobileDrawer(false);
        setActiveFloatingCategory(null);
        setActiveCamuModal(null);
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowCalendarModal(false);
        setActiveActionModal(null);
        setSelectedCardDetail(null);
        setActiveMenuId(null);
        setShowGrowthDropdown(false);
        setShowAttendanceDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Attendance Monthly Chart Data matching the image (Apr to Dec)
  const monthlyAttendanceData = [
    { month: 'Apr', count: 2400, percent: 86, heightPx: 145 },
    { month: 'May', count: 1850, percent: 79, heightPx: 115 },
    { month: 'Jun', count: 2100, percent: 84, heightPx: 130 },
    { month: 'Jul', count: 2950, percent: 98, heightPx: 180, isHatched: true }, // Highlighted tall patterned bar
    { month: 'Aug', count: 1500, percent: 72, heightPx: 95 },
    { month: 'Sep', count: 2650, percent: 91, heightPx: 160 },
    { month: 'Oct', count: 2750, percent: 93, heightPx: 168 },
    { month: 'Nov', count: 2920, percent: 97, heightPx: 178 },
    { month: 'Dec', count: 2800, percent: 95, heightPx: 170 },
  ];

  // Upcoming Events / Exams matching DBS Global University academic schedule
  const upcomingEvents = [
    {
      id: 'evt-1',
      date: 'Monday 22nd Jun, 2026',
      title: 'DBS Mid-Term Examination (CS302)',
      subtext: 'Database Management Systems & Relational Theory • Hall 302',
      tag: 'Mid-Term Exam',
    },
    {
      id: 'evt-2',
      date: 'Friday 15th Aug, 2026',
      title: 'Capstone AI Project Presentation',
      subtext: 'Distributed Systems & Machine Learning Lab • Seminar Hall A',
      tag: 'Viva Voce',
    },
    {
      id: 'evt-3',
      date: 'Tuesday 16th Aug, 2026',
      title: 'Operating Systems End-Term (CS304)',
      subtext: 'Concurrency & Systems Programming • Main Academic Auditorium',
      tag: 'University Exam',
    },
    {
      id: 'evt-4',
      date: 'Thursday 28th Aug, 2026',
      title: 'DBS Tech Innovators Conclave 2026',
      subtext: 'DGU Incubation & Innovation Cell • Campus Amphitheatre',
      tag: 'Campus Conclave',
    },
    {
      id: 'evt-5',
      date: 'Wednesday 12th Oct, 2026',
      title: 'Computer Networks Practical Assessment (CS308)',
      subtext: 'Cloud Computing & Network Protocols Lab • Room 204',
      tag: 'Practical Lab',
    },
  ];

  // Top Teachers Data for DBS Faculty
  const topTeachers = [
    {
      id: 'teach-1',
      name: 'Dr. Rajesh Sharma',
      title: 'Head of Computer Science & AI',
      dept: 'Department of Computing & Advanced Systems',
      rating: '4.95/5.0',
      avatar: '/dbs_academic_guest_lecture.webp',
      studentsMentored: 184,
    },
    {
      id: 'teach-2',
      name: 'Prof. Maria Smith',
      title: 'Associate Professor',
      dept: 'Distributed Systems & Database Architecture',
      rating: '4.92/5.0',
      avatar: '/dbs_fresher.webp',
      studentsMentored: 212,
    },
  ];

  return (
    <div className="oak-dashboard-layout">
      {/* 1. LEFT SLIM ICON NAVIGATION RAIL */}
      <aside className="oak-sidebar-rail">
        <div className="oak-rail-top">
          {/* Top Logo / University Emblem */}
          <div 
            className="oak-brand-mark" 
            title="DBS Global University"
            onClick={() => {
              onNavigateTab('dashboard');
              setActiveFloatingCategory(null);
            }}
          >
            <img 
              src="/dbs_logo_transparent.png" 
              alt="DBS Global University" 
              className="oak-brand-logo-img" 
            />
          </div>

          {/* Navigation Icon List */}
          <nav className="oak-rail-nav">
            {/* 1. Dashboard (Home) */}
            <button
              type="button"
              className={`oak-rail-btn ${activeTab === 'dashboard' && !activeFloatingCategory ? 'is-active' : ''}`}
              onClick={() => {
                onNavigateTab('dashboard');
                setActiveFloatingCategory(null);
              }}
              title="Dashboard Overview"
            >
              <Home size={19} />
            </button>

            {/* 2. Academics & LMS */}
            <button
              type="button"
              className={`oak-rail-btn ${['lms', 'timetable', 'grades'].includes(activeTab) ? 'is-active' : ''} ${activeFloatingCategory === 'academics' ? 'has-floating-open' : ''}`}
              onClick={(e) => handleCategoryClick('academics', e)}
              title="Academics & Learning"
            >
              <GraduationCap size={19} />
            </button>

            {/* 3. Attendance & Campus Passes */}
            <button
              type="button"
              className={`oak-rail-btn ${['leaves', 'gatepass'].includes(activeTab) ? 'is-active' : ''} ${activeFloatingCategory === 'attendance' ? 'has-floating-open' : ''}`}
              onClick={(e) => handleCategoryClick('attendance', e)}
              title="Attendance & Campus Passes"
            >
              <CalendarCheck size={19} />
            </button>

            {/* 4. Noticeboard & Communication */}
            <button
              type="button"
              className={`oak-rail-btn ${activeTab === 'notices' ? 'is-active' : ''} ${activeFloatingCategory === 'communication' ? 'has-floating-open' : ''}`}
              onClick={(e) => handleCategoryClick('communication', e)}
              title="Noticeboard & Messages"
            >
              <MessageSquare size={19} />
            </button>

            {/* 5. Services, Billing & Records */}
            <button
              type="button"
              className={`oak-rail-btn ${activeTab === 'fees' ? 'is-active' : ''} ${activeFloatingCategory === 'services' ? 'has-floating-open' : ''}`}
              onClick={(e) => handleCategoryClick('services', e)}
              title="Services, Billing & Records"
            >
              <Layers size={19} />
            </button>
          </nav>
        </div>

        {/* Rail Bottom Settings / Profile */}
        <div className="oak-rail-bottom">
          <button
            type="button"
            className={`oak-rail-btn ${activeFloatingCategory === 'profile' ? 'has-floating-open is-active' : ''}`}
            onClick={(e) => handleCategoryClick('profile', e)}
            title="My Institution & Profile"
          >
            <Settings size={19} />
          </button>
        </div>
      </aside>

      {/* 1.5. FLOATING BAR SUBMENU */}
      {activeFloatingCategory && currentCategory && (
        <>
          {/* Backdrop to dismiss when clicking outside */}
          <div 
            className="oak-floating-submenu-backdrop" 
            onClick={() => setActiveFloatingCategory(null)}
          />

          <div 
            className="oak-floating-submenu-bar animate-fade-in"
            style={{ 
              top: `${Math.max(20, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 460, floatingBarTop))}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointer toward active rail button */}
            <div className="oak-floating-bar-pointer" />

            <div className="oak-floating-bar-header">
              <div className="oak-floating-bar-title-wrap">
                <span className="oak-floating-category-badge">
                  {currentCategory.shortLabel}
                </span>
                <h4 className="oak-floating-bar-title">{currentCategory.label}</h4>
              </div>
              <button 
                type="button" 
                className="oak-floating-bar-close-btn"
                onClick={() => setActiveFloatingCategory(null)}
                aria-label="Close Submenu"
              >
                <X size={15} />
              </button>
            </div>

            <div className="oak-floating-bar-items">
              {currentCategory.items.map((item) => (
                <div
                  key={item.id}
                  className="oak-floating-item-card"
                  onClick={() => {
                    item.onClick();
                    setActiveFloatingCategory(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="oak-floating-item-icon-wrap">
                    {item.icon}
                  </div>
                  <div className="oak-floating-item-text">
                    <div className="oak-floating-item-top">
                      <span className="oak-floating-item-title">{item.title}</span>
                      {item.badge && (
                        <span className={`oak-floating-item-badge ${item.badgeColor || ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="oak-floating-item-sub">{item.sub}</span>
                  </div>
                  <ChevronRight size={14} className="oak-floating-item-arrow" />
                </div>
              ))}
            </div>

            <div className="oak-floating-bar-footer">
              <span className="oak-floating-camu-stamp">
                <Sparkles size={12} className="text-blue" />
                <span>MyCamu &bull; DBS Global University</span>
              </span>
            </div>
          </div>
        </>
      )}

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="oak-main-wrapper">
        {/* TOP FLOATING HEADER BAR */}
        <header className="oak-top-header">
          {/* Mobile Sidemenu Hamburger Button */}
          <button
            type="button"
            className="oak-mobile-hamburger-btn"
            onClick={() => setShowMobileDrawer(true)}
            aria-label="Open Sidemenu Drawer"
          >
            <Menu size={18} />
          </button>

          {/* Centered Search Bar */}
          <div 
            className="oak-search-bar" 
            onClick={() => setShowSearchModal(true)}
            role="button"
            tabIndex={0}
          >
            <Search size={17} className="oak-search-icon" />
            <span className="oak-search-placeholder">Search courses, teachers, exams, timetable...</span>
            <div className="oak-kbd-badge">⌘+K</div>
          </div>

          {/* Right Action Icons */}
          <div className="oak-header-actions">
            {/* Calendar Button */}
            <button 
              type="button" 
              className="oak-header-pill-btn" 
              onClick={() => setShowCalendarModal(true)}
              title="Academic Calendar"
            >
              <CalendarIcon size={17} />
            </button>

            {/* Notifications Bell */}
            <button 
              type="button" 
              className="oak-header-pill-btn has-badge" 
              onClick={() => setShowNotifications(true)}
              title="Notifications"
            >
              <Bell size={17} />
              <span className="oak-notif-dot" />
            </button>

            {/* Student Profile Pill */}
            <div className="oak-profile-wrap">
              <div 
                className="oak-profile-avatar-pill" 
                title={`${userSession?.name || CURRENT_STUDENT.name} (${CURRENT_STUDENT.rollNo})`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img
                  src={CURRENT_STUDENT.avatarUrl || '/dbs_fresher.webp'}
                  alt="Student Profile"
                  className="oak-avatar-img"
                />
              </div>

              {showProfileMenu && (
                <div className="oak-profile-dropdown">
                  <div className="oak-profile-dropdown-header">
                    <strong>{userSession?.name || CURRENT_STUDENT.name}</strong>
                    <span>{CURRENT_STUDENT.rollNo} • {CURRENT_STUDENT.program}</span>
                  </div>
                  <div className="oak-profile-dropdown-body">
                    <button 
                      type="button" 
                      onClick={() => {
                        onNavigateTab('profile');
                        setShowProfileMenu(false);
                      }}
                    >
                      <User size={14} />
                      <span>My Student Profile</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        onNavigateTab('grades');
                        setShowProfileMenu(false);
                      }}
                    >
                      <GraduationCap size={14} />
                      <span>Academic Gradebook</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        onNavigateTab('fees');
                        setShowProfileMenu(false);
                      }}
                    >
                      <FileText size={14} />
                      <span>Fee Receipts & Clearance</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        onNavigateTab('gatepass');
                        setShowProfileMenu(false);
                      }}
                    >
                      <ShieldCheck size={14} />
                      <span>Hostel Digital Gatepass</span>
                    </button>
                    {onLogout && (
                      <button 
                        type="button" 
                        className="oak-logout-item"
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <>
            {/* 3. HERO PANORAMIC CARD */}
            <section className="oak-hero-banner-card">
              <div 
                className="oak-hero-backdrop" 
                style={{ backgroundImage: `url('/dbs_panoramic_campus.jpg')` }}
              >
                <div className="oak-hero-gradient-overlay" />
                
                {/* University Title Heading */}
                <div className="oak-hero-header-text">
                  <h1 className="oak-university-title">DBS Global University</h1>
                  <p className="oak-university-subline">Dehradun Himalayan Campus &bull; School of Technology &amp; Computing</p>
                </div>

                {/* Floating Widgets inside the Hero Banner */}
                <div className="oak-hero-floating-row">
                  {/* Stat Card 1: Students */}
                  <div className="oak-stat-glass-card">
                    <div className="oak-stat-top">
                      <div className="oak-stat-label-wrap">
                        <Trophy size={14} className="oak-stat-icon" />
                        <span className="oak-stat-label">Students</span>
                      </div>
                      <button 
                        type="button" 
                        className="oak-dots-btn"
                        onClick={() => setActiveMenuId(activeMenuId === 'students' ? null : 'students')}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeMenuId === 'students' && (
                        <div className="oak-menu-popover">
                          <button onClick={() => onNavigateTab('dashboard')}>View Active Students</button>
                          <button onClick={() => onNavigateTab('fees')}>Batch Analytics</button>
                        </div>
                      )}
                    </div>
                    <div className="oak-stat-bottom">
                      <span className="oak-stat-number">2,635</span>
                      <button 
                        type="button" 
                        className="oak-stat-arrow-btn"
                        onClick={() => setSelectedCardDetail({
                          title: 'Active Students Enrollment',
                          subtitle: 'DBS Global University Directory',
                          metric: '2,635 Students',
                          description: 'Total verified undergraduates and postgraduates registered for Academic Session 2026-27 across Computer Science, Business Analytics, and Mechanical Engineering.',
                        })}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Stat Card 2: Teachers */}
                  <div className="oak-stat-glass-card">
                    <div className="oak-stat-top">
                      <div className="oak-stat-label-wrap">
                        <GraduationCap size={14} className="oak-stat-icon" />
                        <span className="oak-stat-label">Teachers</span>
                      </div>
                      <button 
                        type="button" 
                        className="oak-dots-btn"
                        onClick={() => setActiveMenuId(activeMenuId === 'teachers' ? null : 'teachers')}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeMenuId === 'teachers' && (
                        <div className="oak-menu-popover">
                          <button onClick={() => setTeacherTab('This year')}>Top Mentors</button>
                          <button onClick={() => onNavigateTab('timetable')}>Faculty Schedule</button>
                        </div>
                      )}
                    </div>
                    <div className="oak-stat-bottom">
                      <span className="oak-stat-number">29</span>
                      <button 
                        type="button" 
                        className="oak-stat-arrow-btn"
                        onClick={() => setSelectedCardDetail({
                          title: 'Core Department Professorship',
                          subtitle: 'DBS Faculty of Engineering & Computing',
                          metric: '29 Full-time Professors',
                          description: 'Senior professors and PhD advisors dedicated to undergraduate coursework, research thesis supervision, and practical laboratory guidance.',
                        })}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Stat Card 3: Faculty */}
                  <div className="oak-stat-glass-card">
                    <div className="oak-stat-top">
                      <div className="oak-stat-label-wrap">
                        <Users size={14} className="oak-stat-icon" />
                        <span className="oak-stat-label">Faculty</span>
                      </div>
                      <button 
                        type="button" 
                        className="oak-dots-btn"
                        onClick={() => setActiveMenuId(activeMenuId === 'faculty' ? null : 'faculty')}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeMenuId === 'faculty' && (
                        <div className="oak-menu-popover">
                          <button onClick={() => onNavigateTab('lms')}>Department Courses</button>
                          <button onClick={() => onNavigateTab('leaves')}>Academic Approvals</button>
                        </div>
                      )}
                    </div>
                    <div className="oak-stat-bottom">
                      <span className="oak-stat-number">60</span>
                      <button 
                        type="button" 
                        className="oak-stat-arrow-btn"
                        onClick={() => setSelectedCardDetail({
                          title: 'Visiting Scholars & Academic Faculty',
                          subtitle: 'DBS Dehradun Academic Campus',
                          metric: '60 Academic Members',
                          description: 'Including visiting industry fellows, adjunct research faculty, guest lecturers, and laboratory technical instructors.',
                        })}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Pastel Lime Card: Quick DBS Services */}
                  <div className="oak-lime-action-card">
                    <h3 className="oak-lime-card-title">Quick Student Services</h3>
                    <div className="oak-lime-buttons-row">
                      <button 
                        type="button" 
                        className="oak-lime-pill-btn"
                        onClick={() => onNavigateTab('gatepass')}
                        title="Apply Hostel Digital Gatepass"
                      >
                        <Plus size={14} />
                        <span>Apply Gatepass</span>
                      </button>
                      <button 
                        type="button" 
                        className="oak-lime-pill-btn"
                        onClick={() => onNavigateTab('leaves')}
                        title="Request On-Duty (OD) / Leave"
                      >
                        <Plus size={14} />
                        <span>Request OD</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

        {/* 4. THREE-COLUMN DASHBOARD GRID */}
        <div className="oak-content-grid">
          {/* COLUMN 1 (LEFT): Growth & 12 Days Left */}
          <div className="oak-col-growth">
            {/* Growth Card */}
            <div className="oak-white-card oak-growth-card">
              <div className="oak-card-header-row">
                <h2 className="oak-card-title">Growth</h2>
                <div className="oak-dropdown-container">
                  <button 
                    type="button" 
                    className="oak-timeframe-pill"
                    onClick={() => setShowGrowthDropdown(!showGrowthDropdown)}
                  >
                    <span>{growthTimeframe}</span>
                    <ChevronDown size={13} />
                  </button>
                  {showGrowthDropdown && (
                    <div className="oak-dropdown-menu">
                      {(['Monthly', 'Weekly', 'Semester'] as const).map((opt) => (
                        <div 
                          key={opt}
                          className={`oak-dropdown-item ${growthTimeframe === opt ? 'selected' : ''}`}
                          onClick={() => {
                            setGrowthTimeframe(opt);
                            setShowGrowthDropdown(false);
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Circular Gauge Ring */}
              <div className="oak-circular-gauge-wrapper">
                <div className="oak-svg-gauge-box">
                  <svg className="oak-gauge-svg" viewBox="0 0 160 160">
                    {/* Background Circle Track */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#edf2f7"
                      strokeWidth="12"
                    />
                    {/* Ticked Segmented Arc for Growth */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#d0e85d"
                      strokeWidth="12"
                      strokeDasharray="377"
                      strokeDashoffset="143"
                      strokeLinecap="round"
                      transform="rotate(-90 80 80)"
                    />
                  </svg>
                  <div className="oak-gauge-center-text">
                    <span className="oak-gauge-number">62%</span>
                  </div>
                </div>

                <div className="oak-growth-footer">
                  <span className="oak-growth-label">Academy growth</span>
                  {/* Floating Dark Action Circle Button */}
                  <button 
                    type="button" 
                    className="oak-dark-circle-btn" 
                    title="Configure Metric"
                    onClick={() => setSelectedCardDetail({
                      title: 'Academy Growth Index',
                      subtitle: 'Current Term Performance Evaluation',
                      metric: '62% Progress Score',
                      description: 'Comprehensive academic metric combining continuous attendance, LMS assignments grading, and laboratory assessments.',
                    })}
                  >
                    <Sliders size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 12 Days left Card */}
            <div className="oak-white-card oak-days-left-card">
              <h3 className="oak-days-title">12 Days left</h3>
              <p className="oak-days-desc">
                We are pleased to announce that we will be celebrating our 16th anniversary.
              </p>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): Attendance & Top Teachers / Success Rate */}
          <div className="oak-col-attendance">
            {/* Students Attendance Bar Chart Card */}
            <div className="oak-white-card oak-attendance-chart-card">
              <div className="oak-card-header-row">
                <h2 className="oak-card-title">Students Attendance</h2>
                <div className="oak-dropdown-container">
                  <button 
                    type="button" 
                    className="oak-timeframe-pill"
                    onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
                  >
                    <span>{attendanceTimeframe}</span>
                    <ChevronDown size={13} />
                  </button>
                  {showAttendanceDropdown && (
                    <div className="oak-dropdown-menu">
                      {(['Monthly', 'Weekly', 'Quarterly'] as const).map((opt) => (
                        <div 
                          key={opt}
                          className={`oak-dropdown-item ${attendanceTimeframe === opt ? 'selected' : ''}`}
                          onClick={() => {
                            setAttendanceTimeframe(opt);
                            setShowAttendanceDropdown(false);
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bar Chart Area */}
              <div className="oak-chart-body">
                {/* Y-Axis scale */}
                <div className="oak-chart-yaxis">
                  <span>3000</span>
                  <span>1500</span>
                  <span>1000</span>
                  <span>100</span>
                  <span>0</span>
                </div>

                {/* Bars Container */}
                <div className="oak-bars-track">
                  {monthlyAttendanceData.map((item, idx) => (
                    <div 
                      key={item.month} 
                      className="oak-bar-column"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Hover Tooltip */}
                      {hoveredBar === idx && (
                        <div className="oak-bar-tooltip">
                          <strong>{item.count} students</strong>
                          <span>{item.percent}% attendance</span>
                        </div>
                      )}

                      <div className="oak-bar-pillar-wrap">
                        <div 
                          className={`oak-bar-pillar ${item.isHatched ? 'is-hatched' : ''}`}
                          style={{ height: `${item.heightPx}px` }}
                        />
                      </div>
                      <span className="oak-bar-month-label">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row in Center Column: Top Teachers & Success Rate */}
            <div className="oak-center-bottom-row">
              {/* Top Teachers Card (Dark) */}
              <div className="oak-dark-card oak-teachers-card">
                <div className="oak-card-header-row">
                  <h3 className="oak-dark-card-title">Top Teachers</h3>
                  <div className="oak-teachers-toggle-pill">
                    <button 
                      type="button" 
                      className={`oak-toggle-tab ${teacherTab === 'All Time' ? 'active' : ''}`}
                      onClick={() => setTeacherTab('All Time')}
                    >
                      All Time
                    </button>
                    <button 
                      type="button" 
                      className={`oak-toggle-tab ${teacherTab === 'This year' ? 'active' : ''}`}
                      onClick={() => setTeacherTab('This year')}
                    >
                      This year
                    </button>
                  </div>
                </div>

                <div className="oak-teachers-list">
                  {topTeachers.map((teach) => (
                    <div key={teach.id} className="oak-teacher-row">
                      <div className="oak-teacher-avatar-box">
                        <img src={teach.avatar} alt={teach.name} className="oak-teacher-avatar" />
                      </div>
                      <div className="oak-teacher-info">
                        <h4 className="oak-teacher-name">{teach.name}</h4>
                        <span className="oak-teacher-dept">{teach.title}</span>
                      </div>
                      <button 
                        type="button" 
                        className="oak-teacher-arrow-btn"
                        onClick={() => setSelectedCardDetail({
                          title: teach.name,
                          subtitle: teach.title,
                          metric: `Student Rating: ${teach.rating}`,
                          description: `${teach.dept} • Mentoring ${teach.studentsMentored} students across undergraduate lecture halls and laboratories.`,
                        })}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Rate Card */}
              <div className="oak-white-card oak-success-card">
                <div className="oak-card-header-row">
                  <h3 className="oak-card-title">Success Rate</h3>
                  <button 
                    type="button" 
                    className="oak-dark-pill-icon-btn"
                    title="Performance Trends"
                    onClick={() => setSelectedCardDetail({
                      title: 'Success Rate Analytics',
                      subtitle: 'Annual Examination Passing Benchmark',
                      metric: '94.6% Distinction Rate',
                      description: 'Undergraduate student passing rate across semester examinations, practical lab assessments, and seminar presentations.',
                    })}
                  >
                    <TrendingUp size={13} />
                  </button>
                </div>

                {/* Semicircular Sunburst Fan Arc */}
                <div className="oak-radial-sunburst-box">
                  <svg className="oak-sunburst-svg" viewBox="0 0 160 100">
                    <path
                      d="M 20 85 A 60 60 0 0 1 140 85"
                      fill="none"
                      stroke="#f3e696"
                      strokeWidth="14"
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 28 85 A 52 52 0 0 1 132 85"
                      fill="none"
                      stroke="#facb3e"
                      strokeWidth="8"
                      strokeDasharray="7 5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="oak-sunburst-caption">
                    <span className="oak-sunburst-score">94.6%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3 (RIGHT): Upcoming Events/Exams */}
          <div className="oak-col-events">
            <div className="oak-white-card oak-events-card">
              <div className="oak-card-header-row align-start">
                <div>
                  <h2 className="oak-card-title">Upcoming Events/Exams</h2>
                  <p className="oak-card-subline">Scheduled of our upcoming events and tests!</p>
                </div>
                <button 
                  type="button" 
                  className="oak-dark-view-all-btn"
                  onClick={() => setActiveActionModal('event')}
                >
                  View All
                </button>
              </div>

              {/* Events Rows */}
              <div className="oak-events-list">
                {upcomingEvents.map((evt) => (
                  <div key={evt.id} className="oak-event-row">
                    <div className="oak-event-meta">
                      <span className="oak-event-date">{evt.date}</span>
                      <h4 className="oak-event-title">{evt.title}</h4>
                    </div>
                    <div className="oak-event-action-wrap">
                      <button 
                        type="button" 
                        className="oak-event-dots-btn"
                        onClick={() => setActiveMenuId(activeMenuId === evt.id ? null : evt.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === evt.id && (
                        <div className="oak-event-popover">
                          <button onClick={() => {
                            setSelectedCardDetail({
                              title: evt.title,
                              subtitle: evt.date,
                              metric: evt.tag,
                              description: evt.subtext,
                            });
                            setActiveMenuId(null);
                          }}>
                            View Details
                          </button>
                          <button onClick={() => {
                            onNavigateTab('timetable');
                            setActiveMenuId(null);
                          }}>
                            Add to Timetable
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    ) : (
      <div className="oak-subview-panel animate-fade-in">
        <div className="oak-subview-header-bar">
          <button
            type="button"
            className="oak-subview-back-pill"
            onClick={() => onNavigateTab('dashboard')}
          >
            &larr; Back to Dashboard
          </button>
          <div className="oak-subview-title-tag">
            <span>DBS Global University</span>
            <span className="oak-subview-sep">&bull;</span>
            <span className="oak-subview-current-label">
              {activeTab === 'timetable' && 'Smart Timetable & Schedules'}
              {activeTab === 'grades' && 'Academic Gradebook & SGPA'}
              {activeTab === 'fees' && 'Fee Receipts & Online Clearance'}
              {activeTab === 'gatepass' && 'Hostel Digital Gatepass'}
              {activeTab === 'leaves' && 'Leave & On-Duty (OD) Management'}
              {activeTab === 'lms' && 'LMS Course Assignments'}
              {activeTab === 'notices' && 'Campus Notice Board'}
              {activeTab === 'profile' && 'Student Profile & Academic Records'}
            </span>
          </div>
        </div>

        <div className="oak-subview-body">
          {activeTab === 'timetable' && <SmartTimetable />}
          {activeTab === 'grades' && <GradebookView />}
          {activeTab === 'fees' && <FeeReceiptsView />}
          {activeTab === 'gatepass' && <HostelGatePassView />}
          {activeTab === 'leaves' && <LeaveODManager />}
          {activeTab === 'lms' && <LMSAssignments />}
          {activeTab === 'notices' && <NoticeBoardView />}
          {activeTab === 'profile' && <StudentProfileView />}
        </div>
      </div>
    )}
  </div>

      {/* 5. SPOTLIGHT / SEARCH MODAL (⌘+K) */}
      {showSearchModal && (
        <div className="oak-modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="oak-search-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-modal-search-input-wrap">
              <Search size={18} className="oak-modal-search-icon" />
              <input
                type="text"
                autoFocus
                placeholder="Search courses, teachers, exams, timetable, or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="oak-modal-search-input"
              />
              <button 
                type="button" 
                className="oak-modal-close-btn"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="oak-search-results-list">
              <div className="oak-search-section-label">Quick Navigation</div>
              <div className="oak-search-item" onClick={() => { onNavigateTab('timetable'); setShowSearchModal(false); }}>
                <Clock size={16} />
                <span>Smart Timetable & Daily Schedule</span>
                <span className="oak-search-pill">Tab</span>
              </div>
              <div className="oak-search-item" onClick={() => { onNavigateTab('grades'); setShowSearchModal(false); }}>
                <GraduationCap size={16} />
                <span>Gradebook & CGPA Tracker</span>
                <span className="oak-search-pill">Tab</span>
              </div>
              <div className="oak-search-item" onClick={() => { onNavigateTab('leaves'); setShowSearchModal(false); }}>
                <ShieldCheck size={16} />
                <span>Apply On-Duty (OD) & Leave Pass</span>
                <span className="oak-search-pill">Service</span>
              </div>
              <div className="oak-search-item" onClick={() => { onNavigateTab('lms'); setShowSearchModal(false); }}>
                <FileText size={16} />
                <span>LMS Course Assignments & Deadlines</span>
                <span className="oak-search-pill">LMS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DETAILS MODAL (triggered by ↗ buttons) */}
      {selectedCardDetail && (
        <div className="oak-modal-overlay" onClick={() => setSelectedCardDetail(null)}>
          <div className="oak-detail-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-detail-modal-header">
              <div>
                <span className="oak-detail-badge">{selectedCardDetail.subtitle}</span>
                <h3 className="oak-detail-title">{selectedCardDetail.title}</h3>
              </div>
              <button 
                type="button" 
                className="oak-modal-close-btn"
                onClick={() => setSelectedCardDetail(null)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="oak-detail-metric-highlight">
              {selectedCardDetail.metric}
            </div>

            <p className="oak-detail-desc">
              {selectedCardDetail.description}
            </p>

            <div className="oak-detail-actions">
              <button 
                type="button" 
                className="oak-detail-primary-btn"
                onClick={() => setSelectedCardDetail(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK ACTION MODAL (Add Student / Add Teacher / View All) */}
      {activeActionModal && (
        <div className="oak-modal-overlay" onClick={() => setActiveActionModal(null)}>
          <div className="oak-action-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-detail-modal-header">
              <h3 className="oak-detail-title">
                {activeActionModal === 'student' && 'Add New Student'}
                {activeActionModal === 'teacher' && 'Add New Teacher / Mentor'}
                {activeActionModal === 'event' && 'All Academic Events & Schedules'}
              </h3>
              <button 
                type="button" 
                className="oak-modal-close-btn"
                onClick={() => setActiveActionModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            {activeActionModal === 'event' ? (
              <div className="oak-modal-events-list">
                {upcomingEvents.map((evt) => (
                  <div key={evt.id} className="oak-modal-event-item">
                    <span className="oak-event-date">{evt.date}</span>
                    <h4 className="oak-event-title">{evt.title}</h4>
                    <p className="oak-event-subtext">{evt.subtext}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="oak-modal-form-content">
                <p className="oak-detail-desc">
                  {activeActionModal === 'student' 
                    ? 'Register a new undergraduate or postgraduate student to DBS Global University portal with institutional email and biometric enrollment.' 
                    : 'Invite academic faculty, professors, or visiting scholars to access the DBS Global University academic management gateway.'}
                </p>
                <div className="oak-modal-input-field">
                  <label>Full Name</label>
                  <input type="text" placeholder={activeActionModal === 'student' ? 'e.g. Rahul Sharma' : 'e.g. Dr. Rajesh Sharma'} />
                </div>
                <div className="oak-modal-input-field">
                  <label>Institutional Email</label>
                  <input type="email" placeholder={activeActionModal === 'student' ? 'student@dgu.ac.in' : 'faculty@dgu.ac.in'} />
                </div>
                <div className="oak-detail-actions">
                  <button 
                    type="button" 
                    className="oak-detail-primary-btn"
                    onClick={() => setActiveActionModal(null)}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. NOTIFICATIONS POPUP */}
      {showNotifications && (
        <div className="oak-modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="oak-notif-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-detail-modal-header">
              <h3 className="oak-detail-title">Academic Notifications</h3>
              <button type="button" className="oak-modal-close-btn" onClick={() => setShowNotifications(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="oak-notif-items">
              <div className="oak-notif-item">
                <span className="oak-notif-time">10 mins ago</span>
                <h4 className="oak-notif-heading">Timetable Room Relocation</h4>
                <p className="oak-notif-body">Operating Systems Lab scheduled at 2:00 PM has been moved to Turing Lab 4.</p>
              </div>
              <div className="oak-notif-item">
                <span className="oak-notif-time">2 hours ago</span>
                <h4 className="oak-notif-heading">OD Application Approved</h4>
                <p className="oak-notif-body">Your On-Duty request for National Hackathon 2026 has been approved by HoD.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. CALENDAR POPUP */}
      {showCalendarModal && (
        <div className="oak-modal-overlay" onClick={() => setShowCalendarModal(false)}>
          <div className="oak-notif-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="oak-detail-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="oak-detail-title">University Academic Calendar</h3>
                {isLoadingCalendar && <Loader2 size={15} className="animate-spin text-blue" />}
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setShowCalendarModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="oak-notif-items">
              {calendarError && (
                <div style={{ padding: '12px', color: '#f87171', fontSize: '13px' }}>
                  <span>{calendarError}</span>
                </div>
              )}

              {calendarEvents.length > 0 ? (
                calendarEvents.map((evt) => (
                  <div key={evt.id} className="oak-notif-item">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="oak-notif-time">{evt.monthYear}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background:
                          evt.category === 'EXAM' ? 'rgba(239, 68, 68, 0.15)' :
                          evt.category === 'HOLIDAY' ? 'rgba(16, 185, 129, 0.15)' :
                          evt.category === 'DEADLINE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color:
                          evt.category === 'EXAM' ? '#f87171' :
                          evt.category === 'HOLIDAY' ? '#34d399' :
                          evt.category === 'DEADLINE' ? '#fbbf24' : '#38bdf8',
                      }}>
                        {evt.category}
                      </span>
                    </div>
                    <h4 className="oak-notif-heading">{evt.title}</h4>
                    <p className="oak-notif-body">{evt.description}</p>
                  </div>
                ))
              ) : (
                !isLoadingCalendar && (
                  <div className="oak-notif-item">
                    <span className="oak-notif-time">Academic Year 2026-27</span>
                    <h4 className="oak-notif-heading">No Upcoming University Events</h4>
                    <p className="oak-notif-body">Check back later for revised examination schedules and academic notices.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. MOBILE SIDEMENU DRAWER */}
      {showMobileDrawer && (
        <div 
          className="oak-mobile-drawer-overlay animate-fade-in"
          onClick={() => setShowMobileDrawer(false)}
        >
          <div 
            className="oak-mobile-drawer animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="oak-drawer-header">
              <div className="oak-drawer-brand">
                <img 
                  src="/dbs_logo_transparent.png" 
                  alt="DBS Global University" 
                  className="oak-drawer-logo"
                />
                <div className="oak-drawer-title-wrap">
                  <h3 className="oak-drawer-title">DBS Global University</h3>
                  <span className="oak-drawer-subtitle">Dehradun Academic Portal</span>
                </div>
              </div>
              <button
                type="button"
                className="oak-drawer-close-btn"
                onClick={() => setShowMobileDrawer(false)}
                aria-label="Close Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Student Mini Profile Card */}
            <div className="oak-drawer-user-pill">
              <img 
                src={CURRENT_STUDENT.avatarUrl || '/dbs_fresher.webp'} 
                alt={userSession?.name || CURRENT_STUDENT.name} 
                className="oak-drawer-avatar"
              />
              <div className="oak-drawer-user-info">
                <strong>{userSession?.name || CURRENT_STUDENT.name}</strong>
                <span>{CURRENT_STUDENT.rollNo} &bull; {CURRENT_STUDENT.program}</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="oak-drawer-nav">
              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'dashboard' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('dashboard');
                  setShowMobileDrawer(false);
                }}
              >
                <Home size={18} />
                <span>Dashboard Overview</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'notices' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('notices');
                  setShowMobileDrawer(false);
                }}
              >
                <MessageSquare size={18} />
                <span>Campus Notices &amp; Messages</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'lms' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('lms');
                  setShowMobileDrawer(false);
                }}
              >
                <GraduationCap size={18} />
                <span>Academics &amp; LMS Assignments</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'timetable' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('timetable');
                  setShowMobileDrawer(false);
                }}
              >
                <BarChart2 size={18} />
                <span>Smart Timetable &amp; Schedule</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'grades' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('grades');
                  setShowMobileDrawer(false);
                }}
              >
                <Trophy size={18} />
                <span>Academic Gradebook &amp; SGPA</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'fees' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('fees');
                  setShowMobileDrawer(false);
                }}
              >
                <FileText size={18} />
                <span>Fee Receipts &amp; Dues</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'gatepass' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('gatepass');
                  setShowMobileDrawer(false);
                }}
              >
                <ShieldCheck size={18} />
                <span>Hostel Digital Gatepass</span>
              </button>

              <button
                type="button"
                className={`oak-drawer-nav-item ${activeTab === 'leaves' ? 'is-active' : ''}`}
                onClick={() => {
                  onNavigateTab('leaves');
                  setShowMobileDrawer(false);
                }}
              >
                <Settings size={18} />
                <span>Leave &amp; On-Duty (OD) Pass</span>
              </button>
            </nav>

            {/* Drawer Footer with Logout */}
            <div className="oak-drawer-footer">
              {onLogout && (
                <button
                  type="button"
                  className="oak-drawer-logout-btn"
                  onClick={() => {
                    setShowMobileDrawer(false);
                    onLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out of Session</span>
                </button>
              )}
              <div className="oak-drawer-security-tag">
                <ShieldCheck size={13} className="text-emerald" />
                <span>Biometric 256-bit Encrypted Session</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. MOBILE STICKY BOTTOM NAV BAR */}
      <nav className="oak-mobile-bottom-bar" aria-label="Mobile Navigation Bar">
        <button
          type="button"
          className={`oak-bottom-bar-item ${activeTab === 'dashboard' ? 'is-active' : ''}`}
          onClick={() => onNavigateTab('dashboard')}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`oak-bottom-bar-item ${activeTab === 'notices' ? 'is-active' : ''}`}
          onClick={() => onNavigateTab('notices')}
        >
          <MessageSquare size={19} />
          <span>Notices</span>
        </button>

        <button
          type="button"
          className={`oak-bottom-bar-item ${activeTab === 'lms' ? 'is-active' : ''}`}
          onClick={() => onNavigateTab('lms')}
        >
          <GraduationCap size={19} />
          <span>LMS</span>
        </button>

        <button
          type="button"
          className={`oak-bottom-bar-item ${activeTab === 'timetable' ? 'is-active' : ''}`}
          onClick={() => onNavigateTab('timetable')}
        >
          <BarChart2 size={19} />
          <span>Schedule</span>
        </button>

        <button
          type="button"
          className="oak-bottom-bar-item"
          onClick={() => setShowMobileDrawer(true)}
        >
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 12. CAMU TOAST NOTIFICATION */}
      {/* ======================================================== */}
      {camuToastText && (
        <div className="oak-camu-toast-pill animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald" />
          <span>{camuToastText}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. CAMU SERVICE MODALS */}
      {/* ======================================================== */}

      {/* Modal 1: Authentic Camu Student Profile (from Screenshot 1) */}
      {activeCamuModal === 'profile' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-profile-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div className="oak-camu-brand-row">
                <img src="/dbs_logo_transparent.png" alt="DBS Global University" className="camu-logo-mark" />
                <div>
                  <h3 className="camu-modal-title">DBS Global University &bull; Student Profile</h3>
                  <span className="camu-modal-sub">MyCamu Academic Record &bull; Session 2026-2027</span>
                </div>
              </div>
              <button 
                type="button" 
                className="oak-modal-close-btn"
                onClick={() => setActiveCamuModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Announcement Banner matching Screenshot 1 */}
            <div className="camu-announcement-banner">
              <div className="camu-banner-left">
                <Bell size={18} className="camu-banner-icon" />
                <div>
                  <strong>Result Published: MBA Summer Term 2026</strong>
                  <p>Students having any result related issues should raise their grievances through Service Requests in CAMU.</p>
                </div>
              </div>
              <button 
                type="button" 
                className="camu-banner-btn"
                onClick={() => showCamuToast('Opening Examination Grievance Portal')}
              >
                View all
              </button>
            </div>

            {/* Profile Main Card */}
            <div className="camu-profile-main-card">
              <div className="camu-avatar-col">
                <img 
                  src="/harendra_avatar.png" 
                  alt="Harendra Pratap Singh" 
                  className="camu-avatar-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }} 
                />
                <span className="camu-verified-badge">
                  <ShieldCheck size={13} className="text-emerald" />
                  <span>Biometric Verified</span>
                </span>
              </div>

              <div className="camu-details-col">
                <div className="camu-name-row">
                  <h2 className="camu-student-name">Harendra Pratap Singh</h2>
                  <span className="camu-status-pill">Active</span>
                </div>

                <div className="camu-details-grid">
                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Admission No.</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">DBS25UG25234</strong>
                  </div>

                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Admission Year</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">2025-2026</strong>
                  </div>

                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Roll No.</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">0251BTCS097</strong>
                  </div>

                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Degree</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">Undergraduate</strong>
                  </div>

                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Department</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">Doon School of Advance Computing</strong>
                  </div>

                  <div className="camu-detail-row">
                    <span className="camu-detail-label">Semester</span>
                    <span className="camu-detail-colon">:</span>
                    <strong className="camu-detail-value">Third Semester | 2026-2027</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => {
                  setActiveCamuModal(null);
                  onNavigateTab('profile');
                }}
              >
                <User size={15} />
                <span>Open Full Profile & Records</span>
              </button>

              <button 
                type="button" 
                className="camu-btn-secondary"
                onClick={() => showCamuToast('Downloading DBS Student ID Card (PDF)...')}
              >
                <Download size={15} />
                <span>Download Digital ID Card</span>
              </button>

              <button 
                type="button" 
                className="camu-btn-secondary"
                onClick={() => showCamuToast('Generating Official Bonafide Certificate...')}
              >
                <FileCheck size={15} />
                <span>Generate Bonafide</span>
              </button>

              <button 
                type="button" 
                className="camu-btn-ghost"
                onClick={() => setActiveCamuModal('settings')}
              >
                <Sliders size={15} />
                <span>Preferences</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1b: Live Attendance Analytics & Biometric Audit */}
      {activeCamuModal === 'attendance' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Biometric &amp; Academic Sync</span>
                <h3 className="camu-modal-title">Attendance Analytics &amp; Examination Eligibility</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Attendance Eligibility & Overall KPI Banner */}
            <div className="camu-eligibility-box" style={{
              background: liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              borderColor: liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
            }}>
              {liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? (
                <AlertCircle size={22} className="text-danger" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    {liveAttendanceSummary ? `${liveAttendanceSummary.overallPercentage}% Overall Attendance` : '86.4% Overall Attendance'}
                  </strong>
                  <span className={`badge ${liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? 'badge-danger' : 'badge-emerald'}`}>
                    {liveAttendanceSummary && !liveAttendanceSummary.isExamEligible ? 'Debarment Risk (<75%)' : 'Exam Eligible (>=75%)'}
                  </span>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                  {liveAttendanceSummary && !liveAttendanceSummary.isExamEligible
                    ? 'Current attendance is below the mandatory UGC/AICTE 75% threshold. Hall ticket generation will be blocked unless shortfalls are rectified.'
                    : 'Congratulations! You meet the mandatory 75% university attendance threshold for Odd Semester Examinations.'}
                </p>
              </div>
            </div>

            {attendanceLoading && (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Synchronizing biometric class logs from database...</span>
              </div>
            )}

            {attendanceError && (
              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', color: 'var(--rose-400)', fontSize: '0.88rem', margin: '12px 0' }}>
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                <span>Notice: {attendanceError}</span>
              </div>
            )}

            {/* Subject Breakdown List */}
            <div className="camu-exam-schedule-list" style={{ marginTop: '16px' }}>
              {(liveAttendanceSummary?.subjects ?? []).map((sub) => (
                <div key={sub.code} className="camu-exam-row" style={{ alignItems: 'center' }}>
                  <div className="camu-exam-date" style={{ background: sub.status === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: sub.status === 'danger' ? 'var(--rose-400)' : 'var(--emerald-400)' }}>
                    <span className="exam-day" style={{ fontSize: '1.1rem' }}>{sub.percentage}%</span>
                    <span className="exam-mo" style={{ fontSize: '0.65rem' }}>{sub.status.toUpperCase()}</span>
                  </div>
                  <div className="camu-exam-info" style={{ flex: 1 }}>
                    <strong>{sub.code} &bull; {sub.title}</strong>
                    <span>Faculty: {sub.faculty} &bull; Attended: {sub.attended}/{sub.conducted} lectures {sub.onDuty > 0 ? `(${sub.onDuty} OD credited)` : ''}</span>
                    <span style={{ fontSize: '0.78rem', color: sub.status === 'danger' ? 'var(--rose-400)' : 'var(--text-muted)' }}>
                      {sub.percentage >= 75.0 
                        ? `Bunk capacity: Can safely miss ${sub.bunkCapacity} more class(es).` 
                        : `Shortfall recovery: Must attend ${sub.classesToRecover} consecutive class(es) to reach 75%.`}
                    </span>
                  </div>
                  <span className={`camu-exam-badge ${sub.status === 'danger' ? 'badge-danger' : 'badge-emerald'}`}>
                    {sub.percentage >= 75.0 ? 'Compliant' : 'Shortfall'}
                  </span>
                </div>
              ))}
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={fetchAttendanceSummary}
              >
                <Clock size={15} />
                <span>Refresh Biometrics</span>
              </button>

              <button 
                type="button" 
                className="camu-btn-secondary"
                onClick={() => {
                  setActiveCamuModal(null);
                  onNavigateTab('leaves');
                }}
              >
                <FileText size={15} />
                <span>Apply for On-Duty (OD)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Exam Schedules & Re-Evaluation */}
      {activeCamuModal === 'exams' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Controller of Examinations</span>
                <h3 className="camu-modal-title">Exam Schedules &amp; Re-Evaluation</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-eligibility-box">
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong>Hall Ticket Status: Released &amp; Authorized</strong>
                <p>Eligible for Odd Semester Examinations with 86.4% verified biometric attendance.</p>
              </div>
            </div>

            <div className="camu-exam-schedule-list">
              <div className="camu-exam-row">
                <div className="camu-exam-date">
                  <span className="exam-day">22</span>
                  <span className="exam-mo">OCT</span>
                </div>
                <div className="camu-exam-info">
                  <strong>CS302 &bull; Design &amp; Analysis of Algorithms</strong>
                  <span>10:00 AM - 11:30 AM &bull; Room LT-204 (Block 1)</span>
                </div>
                <span className="camu-exam-badge">Theory Exam</span>
              </div>

              <div className="camu-exam-row">
                <div className="camu-exam-date">
                  <span className="exam-day">26</span>
                  <span className="exam-mo">OCT</span>
                </div>
                <div className="camu-exam-info">
                  <strong>CS304 &bull; Database Management Systems</strong>
                  <span>02:00 PM - 03:30 PM &bull; Room LT-201 (Block 1)</span>
                </div>
                <span className="camu-exam-badge">Theory Exam</span>
              </div>

              <div className="camu-exam-row">
                <div className="camu-exam-date">
                  <span className="exam-day">30</span>
                  <span className="exam-mo">OCT</span>
                </div>
                <div className="camu-exam-info">
                  <strong>CS306 &bull; Computer Networks &amp; Security</strong>
                  <span>10:00 AM - 11:30 AM &bull; Main Academic Auditorium</span>
                </div>
                <span className="camu-exam-badge">Theory Exam</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Downloading Official Hall Ticket (PDF)...')}
              >
                <Download size={15} />
                <span>Download Hall Ticket (PDF)</span>
              </button>

              <button 
                type="button" 
                className="camu-btn-secondary"
                onClick={() => showCamuToast('Re-Evaluation portal open after result publication')}
              >
                <FileText size={15} />
                <span>Apply for Re-Evaluation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Student Counselling & Mentor Appointment */}
      {activeCamuModal === 'counselling' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Mentorship Program</span>
                <h3 className="camu-modal-title">Student Counselling &amp; Book Appointment</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-mentor-profile-card">
              <div className="mentor-avatar-badge">
                <User size={22} className="text-blue" />
              </div>
              <div className="mentor-info">
                <strong>Dr. Rajesh Sharma</strong>
                <span>Associate Professor &bull; Doon School of Advance Computing</span>
                <span className="mentor-email">rajesh.sharma@dgu.ac.in &bull; Cabin: Block 2, Rm 304</span>
              </div>
            </div>

            <div className="camu-form-group">
              <label>Select Appointment Slot</label>
              <div className="camu-slots-row">
                <button type="button" className="camu-slot-btn active">Today &bull; 03:30 PM</button>
                <button type="button" className="camu-slot-btn">Tomorrow &bull; 11:00 AM</button>
                <button type="button" className="camu-slot-btn">Friday &bull; 02:00 PM</button>
              </div>
            </div>

            <div className="camu-form-group">
              <label>Consultation Topic</label>
              <input type="text" defaultValue="Capstone Project & System Architecture Review" className="camu-input" />
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => {
                  showCamuToast('Mentorship appointment booked with Dr. Rajesh Sharma for Today 03:30 PM!');
                  setActiveCamuModal(null);
                }}
              >
                <CheckCircle2 size={15} />
                <span>Confirm Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Transcripts & Document Records */}
      {activeCamuModal === 'transcripts' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Institutional Vault</span>
                <h3 className="camu-modal-title">Official Transcripts &amp; Document Records</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-records-list">
              <div className="camu-record-card">
                <FileCheck size={20} className="text-blue" />
                <div className="camu-record-info">
                  <strong>Semester 1 Grade Card (SGPA: 8.42)</strong>
                  <span>Issued by Controller of Examinations &bull; Digital Signature Verified</span>
                </div>
                <button 
                  type="button" 
                  className="camu-record-dl"
                  onClick={() => showCamuToast('Downloading Semester 1 Transcript...')}
                >
                  <Download size={14} />
                </button>
              </div>

              <div className="camu-record-card">
                <FileCheck size={20} className="text-emerald" />
                <div className="camu-record-info">
                  <strong>Semester 2 Grade Card (SGPA: 8.78)</strong>
                  <span>Issued by Controller of Examinations &bull; Digital Signature Verified</span>
                </div>
                <button 
                  type="button" 
                  className="camu-record-dl"
                  onClick={() => showCamuToast('Downloading Semester 2 Transcript...')}
                >
                  <Download size={14} />
                </button>
              </div>

              <div className="camu-record-card">
                <ShieldCheck size={20} className="text-amber" />
                <div className="camu-record-info">
                  <strong>Anti-Ragging Undertaking &amp; Police Verification</strong>
                  <span>Reference: DGU/2025/REG/492 &bull; Active on Record</span>
                </div>
                <button 
                  type="button" 
                  className="camu-record-dl"
                  onClick={() => showCamuToast('Viewing Undertaking Copy...')}
                >
                  <FileText size={14} />
                </button>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Generating Consolidated Academic Transcript Pack...')}
              >
                <Download size={15} />
                <span>Download Consolidated Transcript (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Institutional Clearance (No-Dues) */}
      {activeCamuModal === 'clearance' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Registrar Office</span>
                <h3 className="camu-modal-title">Institutional Clearance &amp; No-Dues Status</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-eligibility-box">
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong>Overall Clearance: 100% Cleared</strong>
                <p>Eligible for Semester Promotion, Examination Hall Ticket and Laboratory Access.</p>
              </div>
            </div>

            <div className="camu-clearance-grid">
              <div className="clearance-item">
                <span className="clearance-name">Central University Library</span>
                <span className="clearance-badge ok">Cleared &bull; 0 Books Due</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Computing &amp; Network Labs</span>
                <span className="clearance-badge ok">Cleared &bull; Assets Verified</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Finance &amp; Accounts Department</span>
                <span className="clearance-badge ok">Cleared &bull; ₹0 Outstanding</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Hostel Warden &amp; Mess</span>
                <span className="clearance-badge ok">Cleared &bull; Room Verified</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Sports &amp; Gymkhana</span>
                <span className="clearance-badge ok">Cleared &bull; Equipment Returned</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Downloading Official Clearance Certificate (PDF)...')}
              >
                <Download size={15} />
                <span>Download Clearance Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Feedback & Grievance Cell */}
      {activeCamuModal === 'feedback' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">CAMU Service Desk</span>
                <h3 className="camu-modal-title">Student Feedback &amp; Grievance Cell</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-form-group">
              <label>Grievance / Request Category</label>
              <select className="camu-select">
                <option>Service Request - Academic / Coursework</option>
                <option>Examination &amp; Grading Grievance</option>
                <option>Campus Infrastructure &amp; Wi-Fi Facilities</option>
                <option>Hostel Accommodation &amp; Mess</option>
              </select>
            </div>

            <div className="camu-form-group">
              <label>Description &amp; Specific Details</label>
              <textarea 
                rows={4} 
                placeholder="Describe your query or grievance in detail for Registrar review..." 
                className="camu-textarea"
              />
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => {
                  showCamuToast('Service Request registered successfully! Ticket: #DGU-GRV-84920');
                  setActiveCamuModal(null);
                }}
              >
                <CheckCircle2 size={15} />
                <span>Submit Grievance to Registrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Student Activities & Clubs */}
      {activeCamuModal === 'activities' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Campus Life</span>
                <h3 className="camu-modal-title">Student Activities &amp; Clubs</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-records-list">
              <div className="camu-record-card">
                <Users size={20} className="text-blue" />
                <div className="camu-record-info">
                  <strong>ACM Student Chapter (DBS Global University)</strong>
                  <span>Technical Committee Lead &bull; Member Since Aug 2025</span>
                </div>
                <span className="camu-status-pill">Active</span>
              </div>

              <div className="camu-record-card">
                <Award size={20} className="text-amber" />
                <div className="camu-record-info">
                  <strong>DBS Annual Hackathon 2026</strong>
                  <span>Winner &bull; AI / Distributed Systems Track (Team NeuralFlow)</span>
                </div>
                <span className="camu-exam-badge">Awarded</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Opening Campus Clubs Registration Portal...')}
              >
                <Plus size={15} />
                <span>Join New Club</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Department Messages */}
      {activeCamuModal === 'messages' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Inbox &bull; 4 Unread</span>
                <h3 className="camu-modal-title">Department Announcements &amp; Messages</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-records-list">
              <div className="camu-record-card">
                <Mail size={18} className="text-blue" />
                <div className="camu-record-info">
                  <strong>Office of Controller of Examinations</strong>
                  <span>Odd Semester Mid-Term Examination Datesheet published on noticeboard.</span>
                </div>
              </div>

              <div className="camu-record-card">
                <Mail size={18} className="text-emerald" />
                <div className="camu-record-info">
                  <strong>Training &amp; Placement Cell</strong>
                  <span>TCS &amp; Deloitte Placement Drive registration closes on 25th October.</span>
                </div>
              </div>

              <div className="camu-record-card">
                <Mail size={18} className="text-amber" />
                <div className="camu-record-info">
                  <strong>Dr. Rajesh Sharma (Faculty Advisor)</strong>
                  <span>Algorithms problem set 4 solutions due on 22nd October 11:59 PM.</span>
                </div>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => {
                  showCamuToast('All messages marked as read');
                  setActiveCamuModal(null);
                }}
              >
                <CheckCircle2 size={15} />
                <span>Mark All as Read</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Course Enrollment */}
      {activeCamuModal === 'enrollment' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Academic Curriculum</span>
                <h3 className="camu-modal-title">Course Enrollment &amp; Electives</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-eligibility-box">
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong>Semester 3 Enrolled Credits: 24.0</strong>
                <p>Coursework approved by Dean Academics for B.Tech CSE (Section A).</p>
              </div>
            </div>

            <div className="camu-clearance-grid">
              <div className="clearance-item">
                <span className="clearance-name">CS302 &bull; Design &amp; Analysis of Algorithms</span>
                <span className="clearance-badge ok">4.0 Credits</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">CS304 &bull; Database Management Systems</span>
                <span className="clearance-badge ok">4.0 Credits</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">CS306 &bull; Computer Networks</span>
                <span className="clearance-badge ok">4.0 Credits</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">CS308 &bull; Operating Systems</span>
                <span className="clearance-badge ok">4.0 Credits</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">CS310 &bull; Cloud Computing &amp; DevOps</span>
                <span className="clearance-badge ok">4.0 Credits</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Downloading Registered Courses Slip (PDF)...')}
              >
                <Download size={15} />
                <span>Download Enrollment Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 10: My Institution */}
      {activeCamuModal === 'institution' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Institutional Profile</span>
                <h3 className="camu-modal-title">DBS Global University (DGU)</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-mentor-profile-card">
              <img src="/dbs_logo_transparent.png" alt="DBS Logo" className="camu-logo-mark" />
              <div className="mentor-info">
                <strong>DBS Global University</strong>
                <span>Mi-122, Kanswali Kothri, Selaqui, Dehradun, Uttarakhand 248011</span>
                <span className="mentor-email">support@dgu.ac.in &bull; +91 135 269 8900</span>
              </div>
            </div>

            <div className="camu-clearance-grid">
              <div className="clearance-item">
                <span className="clearance-name">Accreditation</span>
                <span className="clearance-badge ok">NAAC A+ &bull; UGC &bull; AICTE</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Institutional Domain</span>
                <span className="clearance-badge ok">@dgu.ac.in</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Official Portal</span>
                <span className="clearance-badge ok">student.camu.in / dgu.ac.in</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => showCamuToast('Opening DBS Campus Map & Directory...')}
              >
                <ExternalLink size={15} />
                <span>Campus Directory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 11: Settings */}
      {activeCamuModal === 'settings' && (
        <div className="oak-modal-overlay" onClick={() => setActiveCamuModal(null)}>
          <div className="oak-camu-service-modal-box animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="oak-camu-modal-header">
              <div>
                <span className="oak-floating-category-badge">Security &amp; Preferences</span>
                <h3 className="camu-modal-title">Portal Security &amp; Settings</h3>
              </div>
              <button type="button" className="oak-modal-close-btn" onClick={() => setActiveCamuModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="camu-clearance-grid">
              <div className="clearance-item">
                <span className="clearance-name">Two-Factor Authentication</span>
                <span className="clearance-badge ok">Active &bull; Biometric SMS</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Linked Student Email</span>
                <span className="clearance-badge ok">harendra.singh@dgu.ac.in</span>
              </div>
              <div className="clearance-item">
                <span className="clearance-name">Portal Session Timeout</span>
                <span className="clearance-badge ok">4 Hours of Inactivity</span>
              </div>
            </div>

            <div className="camu-profile-actions">
              <button 
                type="button" 
                className="camu-btn-primary"
                onClick={() => {
                  showCamuToast('Password reset link sent to harendra.singh@dgu.ac.in');
                  setActiveCamuModal(null);
                }}
              >
                <KeyRound size={15} />
                <span>Reset Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CSS STYLING */}
      <style>{`
        /* 1. LAYOUT ARCHITECTURE */
        .oak-dashboard-layout {
          display: flex;
          width: 100%;
          flex: 1;
          min-height: 100vh;
          background: #f4f5f8;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
          color: #111827;
        }

        /* LEFT SLIM ICON RAIL */
        .oak-sidebar-rail {
          width: 72px;
          background: #ffffff;
          border-right: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0 28px 0;
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
          z-index: 50;
        }

        .oak-rail-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          width: 100%;
        }

        .oak-brand-mark {
          cursor: pointer;
        }

        .oak-brand-logo-img {
          width: 36px;
          height: 36px;
          object-fit: contain;
          display: block;
        }

        .oak-rail-nav {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .oak-rail-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .oak-rail-btn:hover {
          color: #111827;
          background: #f1f3f5;
        }

        .oak-rail-btn.is-active {
          background: #e5f569;
          color: #111827;
          border-radius: 16px;
        }

        .oak-rail-btn.has-floating-open {
          background: #2563eb;
          color: #ffffff !important;
          border-radius: 16px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }

        .oak-rail-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* FLOATING BAR SUBMENU */
        .oak-floating-submenu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 120;
          background: rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(2px);
        }

        .oak-floating-submenu-bar {
          position: fixed;
          left: 80px;
          width: 350px;
          max-width: calc(100vw - 96px);
          max-height: calc(100vh - 48px);
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 24px;
          box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.04);
          z-index: 130;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: floatingBarSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes floatingBarSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .oak-floating-bar-pointer {
          position: absolute;
          left: -8px;
          top: 32px;
          width: 16px;
          height: 16px;
          background: #fafbfc;
          border-left: 1px solid rgba(0, 0, 0, 0.08);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          transform: rotate(45deg);
        }

        .oak-floating-bar-header {
          padding: 16px 20px 14px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafbfc;
        }

        .oak-floating-bar-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .oak-floating-category-badge {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #2563eb;
        }

        .oak-floating-bar-title {
          font-size: 0.96rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .oak-floating-bar-close-btn {
          border: none;
          background: #f1f5f9;
          color: #64748b;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .oak-floating-bar-items {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          max-height: 420px;
        }

        .oak-floating-item-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          cursor: pointer;
          background: transparent;
          transition: background 0.15s ease;
          border: 1px solid transparent;
        }

        .oak-floating-item-card:hover {
          background: #f8fafc;
          border-color: #f1f5f9;
        }

        .oak-floating-item-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .oak-floating-item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .oak-floating-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .oak-floating-item-title {
          font-size: 0.84rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .oak-floating-item-sub {
          font-size: 0.72rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .oak-floating-item-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .badge-amber {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .badge-blue {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .badge-emerald {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .badge-purple {
          background: #faf5ff;
          color: #7e22ce;
          border: 1px solid #e9d5ff;
        }
        .badge-rose {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }
        .badge-slate {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .oak-floating-item-arrow {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .oak-floating-bar-footer {
          padding: 10px 18px;
          background: #fafbfc;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .oak-floating-camu-stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
        }

        /* CAMU TOAST PILL */
        .oak-camu-toast-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.84rem;
          font-weight: 500;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }

        /* CAMU MODAL STYLES */
        .oak-camu-profile-modal-box {
          background: #ffffff;
          border-radius: 24px;
          width: 650px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .oak-camu-service-modal-box {
          background: #ffffff;
          border-radius: 24px;
          width: 580px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .oak-camu-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 14px;
        }

        .oak-camu-brand-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .camu-logo-mark {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .camu-modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .camu-modal-sub {
          font-size: 0.78rem;
          color: #64748b;
        }

        /* Announcement Banner */
        .camu-announcement-banner {
          background: #0f172a;
          color: #ffffff;
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .camu-banner-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .camu-banner-icon {
          color: #60a5fa;
          flex-shrink: 0;
        }

        .camu-banner-left strong {
          display: block;
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .camu-banner-left p {
          font-size: 0.76rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.35;
        }

        .camu-banner-btn {
          border: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Profile Main Card */
        .camu-profile-main-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          display: flex;
          gap: 22px;
          align-items: flex-start;
        }

        .camu-avatar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .camu-avatar-img {
          width: 95px;
          height: 105px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .camu-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 3px 8px;
          border-radius: 9999px;
          border: 1px solid #a7f3d0;
        }

        .camu-details-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .camu-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .camu-student-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .camu-status-pill {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .camu-details-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .camu-detail-row {
          display: flex;
          align-items: center;
          font-size: 0.84rem;
        }

        .camu-detail-label {
          width: 140px;
          color: #64748b;
          font-weight: 500;
        }

        .camu-detail-colon {
          margin-right: 12px;
          color: #94a3b8;
        }

        .camu-detail-value {
          color: #0f172a;
          font-weight: 700;
        }

        .camu-profile-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 8px;
        }

        .camu-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 10px 18px;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .camu-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 9999px;
          cursor: pointer;
        }

        .camu-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: 9999px;
          cursor: pointer;
        }

        /* Generic Camu Elements */
        .camu-eligibility-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .camu-eligibility-box strong {
          display: block;
          font-size: 0.85rem;
          color: #15803d;
        }

        .camu-eligibility-box p {
          font-size: 0.78rem;
          color: #4b5563;
          margin: 0;
        }

        .camu-exam-schedule-list, .camu-records-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .camu-exam-row, .camu-record-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .camu-exam-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          padding: 6px 12px;
          border-radius: 10px;
          color: #1d4ed8;
          font-weight: 800;
        }

        .exam-day { font-size: 1.1rem; line-height: 1; }
        .exam-mo { font-size: 0.65rem; text-transform: uppercase; }

        .camu-exam-info, .camu-record-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .camu-exam-info strong, .camu-record-info strong {
          font-size: 0.86rem;
          color: #0f172a;
        }

        .camu-exam-info span, .camu-record-info span {
          font-size: 0.76rem;
          color: #64748b;
        }

        .camu-exam-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .camu-record-dl {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .camu-mentor-profile-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .mentor-avatar-badge {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mentor-info strong {
          display: block;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .mentor-info span {
          display: block;
          font-size: 0.78rem;
          color: #64748b;
        }

        .mentor-email {
          color: #2563eb !important;
          font-weight: 500;
        }

        .camu-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .camu-form-group label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
        }

        .camu-slots-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .camu-slot-btn {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 9999px;
          cursor: pointer;
        }

        .camu-slot-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .camu-input, .camu-select, .camu-textarea {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.84rem;
          color: #0f172a;
          outline: none;
          font-family: inherit;
        }

        .camu-clearance-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .clearance-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .clearance-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #0f172a;
        }

        .clearance-badge.ok {
          font-size: 0.72rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        /* MAIN CONTENT AREA */
        .oak-main-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 18px 32px 40px 32px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        /* 2. TOP FLOATING HEADER */
        .oak-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 20px;
        }

        .oak-search-bar {
          display: flex;
          align-items: center;
          background: #ffffff;
          height: 42px;
          padding: 0 16px;
          border-radius: 9999px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.04);
          width: 440px;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .oak-search-bar:hover {
          border-color: #cbd5e1;
        }

        .oak-search-icon {
          color: #94a3b8;
          margin-right: 10px;
        }

        .oak-search-placeholder {
          color: #94a3b8;
          font-size: 0.88rem;
          flex: 1;
        }

        .oak-kbd-badge {
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .oak-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .oak-header-pill-btn {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #334155;
          cursor: pointer;
          position: relative;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: background 0.15s ease;
        }

        .oak-header-pill-btn:hover {
          background: #f8fafc;
        }

        .oak-notif-dot {
          position: absolute;
          top: 10px;
          right: 11px;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 9999px;
        }

        .oak-profile-avatar-pill {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .oak-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .oak-profile-wrap {
          position: relative;
        }

        .oak-profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          border: 1px solid #f1f5f9;
          width: 220px;
          overflow: hidden;
          z-index: 50;
        }

        .oak-profile-dropdown-header {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .oak-profile-dropdown-header strong {
          font-size: 0.88rem;
          color: #0f172a;
        }

        .oak-profile-dropdown-header span {
          font-size: 0.74rem;
          color: #64748b;
        }

        .oak-profile-dropdown-body {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .oak-profile-dropdown-body button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          text-align: left;
        }

        .oak-profile-dropdown-body button:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .oak-profile-dropdown-body button.oak-logout-item {
          color: #ef4444;
        }

        .oak-profile-dropdown-body button.oak-logout-item:hover {
          background: #fef2f2;
        }

        /* 3. HERO PANORAMIC CARD */
        .oak-hero-banner-card {
          width: 100%;
          margin-bottom: 22px;
        }

        .oak-hero-backdrop {
          position: relative;
          width: 100%;
          height: 290px;
          border-radius: 28px;
          background-size: cover;
          background-position: center 38%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 28px;
          box-sizing: border-box;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
        }

        .oak-hero-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.35) 0%, rgba(17, 24, 39, 0.05) 50%, rgba(17, 24, 39, 0.25) 100%);
          pointer-events: none;
        }

        .oak-hero-header-text {
          position: relative;
          z-index: 2;
        }

        .oak-university-title {
          font-size: 1.65rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }

        .oak-university-subline {
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.92);
          margin: 4px 0 0 0;
          font-weight: 500;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        }

        /* Overlaid floating row inside Hero */
        .oak-hero-floating-row {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-end;
          gap: 16px;
        }

        .oak-stat-glass-card {
          background: rgba(240, 243, 246, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 14px 18px;
          width: 165px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 105px;
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .oak-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .oak-stat-label-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #334155;
        }

        .oak-stat-icon {
          color: #1e293b;
        }

        .oak-stat-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
        }

        .oak-dots-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .oak-stat-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .oak-stat-number {
          font-size: 1.7rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .oak-stat-arrow-btn {
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .oak-stat-arrow-btn:hover {
          background: #f8fafc;
        }

        /* Pastel Lime Action Card */
        .oak-lime-action-card {
          margin-left: auto;
          background: #ebf875;
          border-radius: 22px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 105px;
          width: 250px;
          box-sizing: border-box;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .oak-lime-card-title {
          font-size: 0.96rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .oak-lime-buttons-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .oak-lime-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ffffff;
          border: none;
          padding: 7px 12px;
          border-radius: 9999px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #111827;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .oak-lime-pill-btn:hover {
          background: #f8fafc;
        }

        /* 4. THREE-COLUMN DASHBOARD GRID */
        .oak-content-grid {
          display: grid;
          grid-template-columns: 270px 1fr 370px;
          gap: 20px;
          align-items: start;
        }

        .oak-white-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 22px;
          box-sizing: border-box;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.03);
        }

        .oak-dark-card {
          background: #14171e;
          border-radius: 24px;
          padding: 20px;
          box-sizing: border-box;
          color: #ffffff;
        }

        .oak-card-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .oak-card-header-row.align-start {
          align-items: flex-start;
        }

        .oak-card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.015em;
        }

        .oak-card-subline {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 4px 0 0 0;
        }

        .oak-dropdown-container {
          position: relative;
        }

        .oak-timeframe-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 4px 11px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }

        .oak-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          z-index: 30;
          min-width: 110px;
        }

        .oak-dropdown-item {
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
        }

        .oak-dropdown-item:hover {
          background: #f8fafc;
        }

        .oak-dropdown-item.selected {
          font-weight: 700;
          color: #0f172a;
          background: #f1f5f9;
        }

        /* COLUMN 1: Growth & 12 Days Left */
        .oak-col-growth {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .oak-growth-card {
          padding-bottom: 18px;
        }

        .oak-circular-gauge-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .oak-svg-gauge-box {
          position: relative;
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0 12px 0;
        }

        .oak-gauge-svg {
          width: 100%;
          height: 100%;
        }

        .oak-gauge-center-text {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .oak-gauge-number {
          font-size: 2.15rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.03em;
        }

        .oak-growth-footer {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
        }

        .oak-growth-label {
          font-size: 0.86rem;
          font-weight: 600;
          color: #475569;
        }

        .oak-dark-circle-btn {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: #111827;
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .oak-days-left-card {
          background: #ffffff;
        }

        .oak-days-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .oak-days-desc {
          font-size: 0.84rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        /* COLUMN 2: Attendance & Bottom Row */
        .oak-col-attendance {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .oak-attendance-chart-card {
          padding-bottom: 24px;
        }

        .oak-chart-body {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          height: 220px;
          padding-top: 20px;
        }

        .oak-chart-yaxis {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 180px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
          padding-bottom: 24px;
          box-sizing: border-box;
        }

        .oak-bars-track {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }

        .oak-bar-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
        }

        .oak-bar-pillar-wrap {
          display: flex;
          align-items: flex-end;
          height: 180px;
        }

        .oak-bar-pillar {
          width: 26px;
          background: #ebf875;
          border-radius: 9999px;
          transition: height 0.3s ease, background 0.15s ease;
        }

        .oak-bar-pillar.is-hatched {
          background: repeating-linear-gradient(
            45deg,
            #e4f55f,
            #e4f55f 4px,
            #d6ea4f 4px,
            #d6ea4f 8px
          );
        }

        .oak-bar-pillar:hover {
          background: #d8ec46;
        }

        .oak-bar-month-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: #475569;
        }

        .oak-bar-tooltip {
          position: absolute;
          top: -38px;
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          white-space: nowrap;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          z-index: 10;
        }

        /* Center Bottom Row */
        .oak-center-bottom-row {
          display: grid;
          grid-template-columns: 1fr 180px;
          gap: 18px;
        }

        /* Top Teachers Card */
        .oak-dark-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .oak-teachers-toggle-pill {
          display: inline-flex;
          align-items: center;
          background: #232733;
          border-radius: 9999px;
          padding: 2px;
        }

        .oak-toggle-tab {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 9999px;
          cursor: pointer;
        }

        .oak-toggle-tab.active {
          background: #ebf875;
          color: #111827;
        }

        .oak-teachers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .oak-teacher-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
        }

        .oak-teacher-avatar-box {
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .oak-teacher-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .oak-teacher-info {
          flex: 1;
        }

        .oak-teacher-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .oak-teacher-dept {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        .oak-teacher-arrow-btn {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #232733;
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .oak-teacher-arrow-btn:hover {
          background: #333a4c;
        }

        /* Success Rate Card */
        .oak-dark-pill-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background: #111827;
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .oak-radial-sunburst-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
        }

        .oak-sunburst-svg {
          width: 130px;
          height: 70px;
        }

        .oak-sunburst-caption {
          margin-top: 6px;
        }

        .oak-sunburst-score {
          font-size: 1.25rem;
          font-weight: 800;
          color: #111827;
        }

        /* COLUMN 3: Upcoming Events / Exams */
        .oak-col-events {
          display: flex;
          flex-direction: column;
        }

        .oak-dark-view-all-btn {
          background: #111827;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 7px 16px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }

        .oak-dark-view-all-btn:hover {
          background: #232d3f;
        }

        .oak-events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 18px;
        }

        .oak-event-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          transition: background 0.15s ease, border-color 0.15s ease;
          position: relative;
        }

        .oak-event-row:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .oak-event-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .oak-event-date {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
        }

        .oak-event-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .oak-event-action-wrap {
          position: relative;
        }

        .oak-event-dots-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .oak-event-dots-btn:hover {
          color: #111827;
        }

        .oak-menu-popover,
        .oak-event-popover {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          z-index: 40;
          min-width: 140px;
        }

        .oak-menu-popover button,
        .oak-event-popover button {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 8px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .oak-menu-popover button:hover,
        .oak-event-popover button:hover {
          background: #f8fafc;
          color: #111827;
        }

        /* MODALS */
        .oak-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .oak-search-modal-box {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 580px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .oak-modal-search-input-wrap {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .oak-modal-search-icon {
          color: #94a3b8;
          margin-right: 12px;
        }

        .oak-modal-search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #111827;
        }

        .oak-modal-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .oak-search-results-list {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .oak-search-section-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .oak-search-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
        }

        .oak-search-item:hover {
          background: #f8fafc;
          color: #111827;
        }

        .oak-search-pill {
          margin-left: auto;
          font-size: 0.7rem;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          color: #64748b;
        }

        .oak-detail-modal-box,
        .oak-action-modal-box,
        .oak-notif-modal-box {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          padding: 24px 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .oak-detail-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .oak-detail-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .oak-detail-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 6px 0 0 0;
        }

        .oak-detail-metric-highlight {
          font-size: 1.8rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 12px;
        }

        .oak-detail-desc {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .oak-detail-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .oak-detail-primary-btn {
          background: #111827;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
        }

        .oak-modal-input-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .oak-modal-input-field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
        }

        .oak-modal-input-field input {
          height: 42px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
          outline: none;
        }

        .oak-modal-input-field input:focus {
          border-color: #0f172a;
        }

        .oak-notif-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .oak-notif-item {
          padding: 12px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
        }

        .oak-notif-time {
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .oak-notif-heading {
          font-size: 0.88rem;
          font-weight: 700;
          color: #111827;
          margin: 4px 0 2px 0;
        }

        .oak-notif-body {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .oak-modal-events-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 380px;
          overflow-y: auto;
        }

        .oak-modal-event-item {
          padding: 12px 14px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .oak-event-subtext {
          font-size: 0.78rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        /* SUBVIEW PANEL */
        .oak-subview-panel {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .oak-subview-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          padding: 12px 20px;
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        .oak-subview-back-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .oak-subview-back-pill:hover {
          background: #e2e8f0;
          color: #000000;
        }

        .oak-subview-title-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #64748b;
        }

        .oak-subview-sep {
          color: #cbd5e1;
        }

        .oak-subview-current-label {
          color: #0f172a;
          font-weight: 700;
        }

        .oak-subview-body {
          width: 100%;
        }

        /* 10. MOBILE SIDEMENU DRAWER STYLES */
        .oak-mobile-hamburger-btn {
          display: none;
        }

        .oak-mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 999;
          display: flex;
        }

        .oak-mobile-drawer {
          width: 86%;
          max-width: 320px;
          height: 100%;
          background: #ffffff;
          box-shadow: 10px 0 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .oak-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 18px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .oak-drawer-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .oak-drawer-logo {
          width: 36px;
          height: 36px;
          object-fit: contain;
        }

        .oak-drawer-title-wrap {
          display: flex;
          flex-direction: column;
        }

        .oak-drawer-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        .oak-drawer-subtitle {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 500;
        }

        .oak-drawer-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .oak-drawer-user-pill {
          margin: 14px 18px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .oak-drawer-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .oak-drawer-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .oak-drawer-user-info strong {
          font-size: 0.88rem;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .oak-drawer-user-info span {
          font-size: 0.72rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .oak-drawer-nav {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .oak-drawer-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 0.86rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .oak-drawer-nav-item.is-active {
          background: #e5f569;
          color: #0f172a;
          font-weight: 700;
        }

        .oak-drawer-footer {
          padding: 16px 18px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .oak-drawer-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px;
          border-radius: 12px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
        }

        .oak-drawer-security-tag {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
        }

        /* 11. MOBILE STICKY BOTTOM NAV BAR */
        .oak-mobile-bottom-bar {
          display: none;
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 1200px) {
          .oak-content-grid {
            grid-template-columns: 1fr 1fr;
          }
          .oak-col-events {
            grid-column: span 2;
          }
        }

        @media (max-width: 900px) {
          /* Hide desktop slim rail on mobile/tablet */
          .oak-sidebar-rail {
            display: none !important;
          }

          /* Show mobile hamburger trigger */
          .oak-mobile-hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            color: #0f172a;
            cursor: pointer;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          }

          /* Show sticky mobile bottom bar */
          .oak-mobile-bottom-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 62px;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid rgba(0, 0, 0, 0.08);
            align-items: center;
            justify-content: space-around;
            z-index: 80;
            padding: 0 8px;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
          }

          .oak-bottom-bar-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            background: transparent;
            border: none;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 500;
            padding: 6px 10px;
            border-radius: 12px;
            cursor: pointer;
            transition: color 0.15s ease;
          }

          .oak-bottom-bar-item.is-active {
            color: #0f172a;
            font-weight: 700;
          }

          .oak-bottom-bar-item.is-active svg {
            color: #562b63;
          }

          /* Main wrapper mobile padding with room for bottom bar */
          .oak-main-wrapper {
            padding: 12px 16px 84px 16px;
          }

          .oak-top-header {
            gap: 10px;
            margin-bottom: 16px;
          }

          .oak-search-bar {
            flex: 1;
            width: auto;
            min-width: 0;
            height: 38px;
          }

          .oak-kbd-badge {
            display: none;
          }

          .oak-header-actions {
            gap: 8px;
          }

          .oak-header-pill-btn {
            width: 38px;
            height: 38px;
          }

          .oak-profile-avatar-pill {
            width: 38px;
            height: 38px;
          }

          /* CARDS STACK SCROLLABLE ONE BY ONE FOR PHONE */
          .oak-content-grid {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 16px;
          }

          .oak-col-growth,
          .oak-col-center,
          .oak-col-events {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 16px;
          }

          .oak-center-bottom-row {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 16px;
          }

          .oak-white-card,
          .oak-dark-card {
            width: 100%;
            box-sizing: border-box;
            padding: 18px 16px;
            border-radius: 20px;
          }

          .oak-hero-backdrop {
            height: auto;
            min-height: auto;
            padding: 20px 16px;
            border-radius: 22px;
          }

          .oak-university-title {
            font-size: 1.4rem;
          }

          .oak-university-subline {
            font-size: 0.78rem;
          }

          .oak-hero-floating-row {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 12px;
            margin-top: 16px;
          }

          .oak-stat-glass-card {
            width: 100%;
            box-sizing: border-box;
            border-radius: 16px;
            padding: 12px 16px;
          }

          .oak-lime-action-card {
            width: 100%;
            margin-left: 0;
            box-sizing: border-box;
            border-radius: 16px;
            padding: 16px;
          }

          .oak-lime-buttons-row {
            display: flex;
            gap: 10px;
            width: 100%;
          }

          .oak-lime-pill-btn {
            flex: 1;
            justify-content: center;
            height: 38px;
            font-size: 0.8rem;
          }

          /* Attendance Bar Chart horizontal scrolling for phone */
          .oak-chart-body {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 8px;
          }

          .oak-bars-track {
            min-width: 320px;
            gap: 8px;
          }
        }

        @media (max-width: 640px) {
          .oak-main-wrapper {
            padding: 10px 12px 82px 12px;
          }

          .oak-hero-backdrop {
            padding: 16px 14px;
            border-radius: 18px;
          }

          .oak-university-title {
            font-size: 1.25rem;
          }

          .oak-university-subline {
            font-size: 0.74rem;
          }

          .oak-white-card,
          .oak-dark-card {
            padding: 16px 14px;
            border-radius: 18px;
          }

          .oak-search-placeholder {
            font-size: 0.78rem;
          }

          .oak-subview-header-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
          }
        }
      `}</style>
    </div>
  );
};
