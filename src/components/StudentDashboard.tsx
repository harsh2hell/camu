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
} from 'lucide-react';
import { CURRENT_STUDENT } from '../data/mockData';
import type { UserSession } from '../api/auth';

interface StudentDashboardProps {
  onNavigateTab: (tab: string) => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigateTab,
  userSession,
  onLogout,
}) => {
  // Navigation active state for left slim rail
  const [activeNav, setActiveNav] = useState<'home' | 'chat' | 'academics' | 'analytics' | 'settings'>('home');

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

  // Keyboard shortcut listener for ⌘+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if (e.key === 'Escape') {
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

  // Upcoming Events / Exams matching the image items
  const upcomingEvents = [
    {
      id: 'evt-1',
      date: 'Monday 22nd Jun, 2025',
      title: 'Model test of 11th class',
      subtext: 'Engineering Mathematics & Logic Synthesis • Hall 302',
      tag: 'Internal Test',
    },
    {
      id: 'evt-2',
      date: 'Friday 15th Aug, 2025',
      title: 'Final project presentation',
      subtext: 'Capstone AI & Distributed Systems • Seminar Hall A',
      tag: 'Viva Voce',
    },
    {
      id: 'evt-3',
      date: 'Tuesday 16th Aug, 2025',
      title: 'Final exam for Introduction to Psychology',
      subtext: 'Behavioral Sciences Core • Main Academic Auditorium',
      tag: 'University Exam',
    },
    {
      id: 'evt-4',
      date: 'Friday 3rd Sep, 2025',
      title: 'Practical assessment in Chemistry',
      subtext: 'Physical Chemistry & Spectroscopy Lab • Room 108',
      tag: 'Practical Lab',
    },
    {
      id: 'evt-5',
      date: 'Wednesday 12th Oct, 2025',
      title: 'Group project presentation for History 101',
      subtext: 'Modern World Civilization & Ethics • Conference Suite 4',
      tag: 'Group Project',
    },
  ];

  // Top Teachers Data matching the image
  const topTeachers = [
    {
      id: 'teach-1',
      name: 'Alex John',
      title: 'Physics Teacher',
      dept: 'Department of Applied Physics',
      rating: '4.9/5.0',
      avatar: '/dbs_academic_guest_lecture.webp',
      studentsMentored: 142,
    },
    {
      id: 'teach-2',
      name: 'Maria Smith',
      title: 'Mathematics Tutor',
      dept: 'Department of Computing & Discrete Math',
      rating: '4.95/5.0',
      avatar: '/dbs_fresher.webp',
      studentsMentored: 198,
    },
  ];

  return (
    <div className="oak-dashboard-layout">
      {/* 1. LEFT SLIM ICON NAVIGATION RAIL */}
      <aside className="oak-sidebar-rail">
        <div className="oak-rail-top">
          {/* Top Logo / University Emblem */}
          <div className="oak-brand-mark" title="DBS Global University">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="12" r="6" fill="#c3e843" />
              <circle cx="12" cy="24" r="6" fill="#1b212d" />
              <circle cx="28" cy="24" r="6" fill="#c3e843" />
              <path d="M16 28L20 22L24 28H16Z" fill="#1b212d" />
            </svg>
          </div>

          {/* Navigation Icon List */}
          <nav className="oak-rail-nav">
            {/* Dashboard (Home) */}
            <button
              type="button"
              className={`oak-rail-btn ${activeNav === 'home' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveNav('home');
                onNavigateTab('dashboard');
              }}
              title="Dashboard"
            >
              <Home size={19} />
            </button>

            {/* Chat / Notices */}
            <button
              type="button"
              className={`oak-rail-btn ${activeNav === 'chat' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveNav('chat');
                onNavigateTab('notices');
              }}
              title="Campus Notices & Messages"
            >
              <MessageSquare size={19} />
            </button>

            {/* Academics / LMS */}
            <button
              type="button"
              className={`oak-rail-btn ${activeNav === 'academics' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveNav('academics');
                onNavigateTab('lms');
              }}
              title="Academics & Assignments"
            >
              <GraduationCap size={19} />
            </button>

            {/* Timetable / Schedule */}
            <button
              type="button"
              className={`oak-rail-btn ${activeNav === 'analytics' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveNav('analytics');
                onNavigateTab('timetable');
              }}
              title="Smart Timetable"
            >
              <BarChart2 size={19} />
            </button>
          </nav>
        </div>

        {/* Rail Bottom Settings */}
        <div className="oak-rail-bottom">
          <button
            type="button"
            className={`oak-rail-btn ${activeNav === 'settings' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveNav('settings');
              onNavigateTab('leaves');
            }}
            title="Leave / OD & Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="oak-main-wrapper">
        {/* TOP FLOATING HEADER BAR */}
        <header className="oak-top-header">
          {/* Centered Search Bar */}
          <div 
            className="oak-search-bar" 
            onClick={() => setShowSearchModal(true)}
            role="button"
            tabIndex={0}
          >
            <Search size={17} className="oak-search-icon" />
            <span className="oak-search-placeholder">Search here</span>
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
                        onNavigateTab('grades');
                        setShowProfileMenu(false);
                      }}
                    >
                      <GraduationCap size={14} />
                      <span>Academic Gradebook</span>
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

        {/* 3. HERO PANORAMIC CARD */}
        <section className="oak-hero-banner-card">
          <div 
            className="oak-hero-backdrop" 
            style={{ backgroundImage: `url('/university_hero_banner.jpg')` }}
          >
            <div className="oak-hero-gradient-overlay" />
            
            {/* University Title Heading */}
            <div className="oak-hero-header-text">
              <h1 className="oak-university-title">OAK University</h1>
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
                      subtitle: 'Faculty of Engineering & Computing',
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
                      subtitle: 'Dehradun Academic Campus',
                      metric: '60 Academic Members',
                      description: 'Including visiting industry fellows, adjunct research faculty, guest lecturers, and laboratory technical instructors.',
                    })}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>

              {/* Pastel Lime Card: Add New Members */}
              <div className="oak-lime-action-card">
                <h3 className="oak-lime-card-title">Add New Members</h3>
                <div className="oak-lime-buttons-row">
                  <button 
                    type="button" 
                    className="oak-lime-pill-btn"
                    onClick={() => setActiveActionModal('student')}
                  >
                    <Plus size={14} />
                    <span>Add Student</span>
                  </button>
                  <button 
                    type="button" 
                    className="oak-lime-pill-btn"
                    onClick={() => setActiveActionModal('teacher')}
                  >
                    <Plus size={14} />
                    <span>Add Teacher</span>
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
              <h3 className="oak-detail-title">University Academic Calendar</h3>
              <button type="button" className="oak-modal-close-btn" onClick={() => setShowCalendarModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="oak-notif-items">
              <div className="oak-notif-item">
                <span className="oak-notif-time">June 2026</span>
                <h4 className="oak-notif-heading">Continuous Assessment 1 (CA-1)</h4>
                <p className="oak-notif-body">All undergraduate examinations begin on 22nd June 2026 across departmental halls.</p>
              </div>
              <div className="oak-notif-item">
                <span className="oak-notif-time">August 2026</span>
                <h4 className="oak-notif-heading">Annual University Research Conclave</h4>
                <p className="oak-notif-body">Faculty and student paper presentations in the Himalayan Academic Amphitheatre.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CSS STYLING */}
      <style>{`
        /* 1. LAYOUT ARCHITECTURE */
        .oak-dashboard-layout {
          display: flex;
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

        .oak-rail-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* MAIN CONTENT AREA */
        .oak-main-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px 28px 40px 28px;
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
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
          .oak-sidebar-rail {
            display: none;
          }
          .oak-content-grid {
            grid-template-columns: 1fr;
          }
          .oak-col-events {
            grid-column: span 1;
          }
          .oak-hero-floating-row {
            flex-wrap: wrap;
          }
          .oak-lime-action-card {
            margin-left: 0;
            width: 100%;
          }
          .oak-search-bar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
