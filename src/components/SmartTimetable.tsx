import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  User, 
  FlaskConical, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Navigation,
  Calendar,
  Layers
} from 'lucide-react';
import { TODAY_CLASSES, type TimetableClass } from '../data/mockData';

// Generate varied realistic schedule for other days
const WEEKLY_SCHEDULE: Record<string, TimetableClass[]> = {
  Monday: TODAY_CLASSES,
  Tuesday: [
    {
      id: 't1',
      time: '09:00 - 09:55 AM',
      subjectCode: 'CS308',
      subjectTitle: 'Operating Systems & Architecture',
      faculty: 'Prof. Meenakshi Joshi',
      room: 'LT-102 (Block 2)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 't2',
      time: '10:00 - 11:55 AM',
      subjectCode: 'CS306-L',
      subjectTitle: 'Computer Networks Practical Lab',
      faculty: 'Dr. Vivek Bhatt & Lab Staff',
      room: 'Cisco Networking Lab (Block 3)',
      isLab: true,
      status: 'upcoming',
      note: 'Packet Tracer simulation files will be checked at 10:15 AM',
    },
    {
      id: 't3',
      time: '01:30 - 02:25 PM',
      subjectCode: 'CS312',
      subjectTitle: 'Machine Learning Foundations',
      faculty: 'Dr. Sunita Negi',
      room: 'LT-201 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 't4',
      time: '02:30 - 03:25 PM',
      subjectCode: 'CS304',
      subjectTitle: 'Database Management Systems',
      faculty: 'Prof. Ananya Sen',
      room: 'LT-204 (Block 1)',
      isLab: false,
      status: 'upcoming',
    }
  ],
  Wednesday: [
    {
      id: 'w1',
      time: '09:00 - 09:55 AM',
      subjectCode: 'CS302',
      subjectTitle: 'Design & Analysis of Algorithms',
      faculty: 'Dr. Rajesh Sharma',
      room: 'LT-204 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'w2',
      time: '10:00 - 10:55 AM',
      subjectCode: 'CS310',
      subjectTitle: 'Cloud Computing & DevOps',
      faculty: 'Er. Kunal Rawat',
      room: 'Seminar Hall B',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'w3',
      time: '11:15 - 01:05 PM',
      subjectCode: 'CS304-L',
      subjectTitle: 'Database Systems Lab (PostgreSQL)',
      faculty: 'Prof. Ananya Sen & TA',
      room: 'Computing Lab 2 (Block 2)',
      isLab: true,
      status: 'upcoming',
      note: 'Submit Normalization 3NF query scripts before leaving',
    },
    {
      id: 'w4',
      time: '02:00 - 03:00 PM',
      subjectCode: 'ENG301',
      subjectTitle: 'Corporate Communication & Soft Skills',
      faculty: 'Ms. Ritu Saxena',
      room: 'Language Lab (Block 1)',
      isLab: false,
      status: 'upcoming',
    }
  ],
  Thursday: [
    {
      id: 'th1',
      time: '09:00 - 09:55 AM',
      subjectCode: 'CS306',
      subjectTitle: 'Computer Networks',
      faculty: 'Dr. Vivek Bhatt',
      room: 'LT-305 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'th2',
      time: '10:00 - 10:55 AM',
      subjectCode: 'CS312',
      subjectTitle: 'Machine Learning Foundations',
      faculty: 'Dr. Sunita Negi',
      room: 'LT-201 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'th3',
      time: '11:15 - 01:05 PM',
      subjectCode: 'CS310-L',
      subjectTitle: 'Cloud Computing & Microservices Lab',
      faculty: 'Er. Kunal Rawat',
      room: 'Cloud Center of Excellence (Block 2)',
      isLab: true,
      status: 'upcoming',
      note: 'Ensure Docker Desktop is configured on your lab workstation',
    }
  ],
  Friday: [
    {
      id: 'f1',
      time: '09:00 - 09:55 AM',
      subjectCode: 'CS308',
      subjectTitle: 'Operating Systems & Architecture',
      faculty: 'Prof. Meenakshi Joshi',
      room: 'LT-102 (Block 2)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'f2',
      time: '10:00 - 10:55 AM',
      subjectCode: 'CS302',
      subjectTitle: 'Design & Analysis of Algorithms',
      faculty: 'Dr. Rajesh Sharma',
      room: 'LT-204 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'f3',
      time: '11:15 - 12:10 PM',
      subjectCode: 'CS304',
      subjectTitle: 'Database Management Systems',
      faculty: 'Prof. Ananya Sen',
      room: 'LT-201 (Block 1)',
      isLab: false,
      status: 'upcoming',
    },
    {
      id: 'f4',
      time: '02:00 - 04:00 PM',
      subjectCode: 'PRJ301',
      subjectTitle: 'Capstone Project Mentoring Session',
      faculty: 'Department Faculty Committee',
      room: 'Auditorium 2 (Main Campus)',
      isLab: false,
      status: 'upcoming',
      note: 'Bring Sprint 2 architecture slides and GitHub repo links',
    }
  ],
  Saturday: [
    {
      id: 's1',
      time: '10:00 - 12:00 PM',
      subjectCode: 'ACM301',
      subjectTitle: 'Competitive Programming & DSA Workshop',
      faculty: 'ACM Student Chapter & Faculty Lead',
      room: 'Seminar Hall A',
      isLab: true,
      status: 'upcoming',
      note: 'Optional enrichment module on Graph DP & Tree Traversal',
    }
  ]
};

export const SmartTimetable: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentSchedule = WEEKLY_SCHEDULE[selectedDay] || TODAY_CLASSES;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoomClick = (room: string, title: string) => {
    showToast(`Navigating to ${room} for "${title}"`);
  };

  return (
    <div className="timetable-page-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="timetable-toast-pill">
          <Navigation size={16} className="toast-icon-emerald" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Header Card */}
      <div className="timetable-header-card">
        <div className="timetable-header-info">
          <div className="timetable-header-badge">
            <Sparkles size={13} className="text-blue" />
            <span>Interactive Dynamic Timetable &bull; B.Tech CSE (Section A)</span>
          </div>
          <h2 className="timetable-header-title">Weekly Lecture &amp; Lab Schedule</h2>
          <p className="timetable-header-desc">
            Room allocations, lab sessions, and live lecture statuses updated in real-time.
          </p>
        </div>

        {/* Day Selector Pill Track */}
        <div className="day-selector-track">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              className={`day-tab-btn ${selectedDay === day ? 'is-active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Info Summary Bar */}
      <div className="schedule-summary-bar">
        <div className="summary-left">
          <div className="summary-icon-pill">
            <Calendar size={14} className="text-blue" />
            <span>{selectedDay}&apos;s Schedule</span>
          </div>
          <span className="summary-stat">
            <strong>{currentSchedule.length} Sessions</strong> ({currentSchedule.filter(c => c.isLab).length} Labs &bull; {currentSchedule.filter(c => !c.isLab).length} Lectures)
          </span>
        </div>

        {selectedDay === 'Monday' && (
          <div className="live-now-indicator">
            <span className="live-dot-pulse"></span>
            <span>Current Active: <strong>Database Management Systems</strong> (LT-201)</span>
          </div>
        )}
      </div>

      {/* Schedule Feed */}
      <div className="schedule-list">
        {currentSchedule.map((item) => {
          const isOngoing = item.status === 'ongoing';
          const isCompleted = item.status === 'completed';

          return (
            <div 
              key={item.id} 
              className={`schedule-card-modern ${isOngoing ? 'card-ongoing' : ''}`}
            >
              {/* Left Column: Time & Live Status */}
              <div className="time-column">
                <div className="time-badge-wrap">
                  <Clock size={16} className={isOngoing ? 'text-blue' : 'text-muted'} />
                  <span className="time-text">{item.time}</span>
                </div>

                {isOngoing && (
                  <span className="live-status-pill">
                    <span className="live-dot"></span> NOW ACTIVE
                  </span>
                )}

                {isCompleted && (
                  <span className="completed-pill">
                    <CheckCircle2 size={13} className="text-muted" />
                    <span>Conducted</span>
                  </span>
                )}

                {!isOngoing && !isCompleted && (
                  <span className="upcoming-pill">
                    <span>Upcoming</span>
                  </span>
                )}
              </div>

              {/* Right Column: Lecture Content */}
              <div className="lecture-main">
                <div className="lecture-top-row">
                  <div className="lecture-tags">
                    <span className="lecture-code-pill">{item.subjectCode}</span>
                    {item.isLab ? (
                      <span className="class-type-pill pill-lab">
                        <FlaskConical size={12} />
                        <span>Practical Lab</span>
                      </span>
                    ) : (
                      <span className="class-type-pill pill-theory">
                        <BookOpen size={12} />
                        <span>Theory Lecture</span>
                      </span>
                    )}
                  </div>

                  <button 
                    type="button" 
                    className="location-pill-btn"
                    onClick={() => handleRoomClick(item.room, item.subjectTitle)}
                  >
                    <MapPin size={13} className="text-blue" />
                    <span>{item.room}</span>
                  </button>
                </div>

                <h3 className="lecture-title">{item.subjectTitle}</h3>

                <div className="lecture-meta-row">
                  <div className="meta-faculty-pill">
                    <User size={14} className="text-blue" />
                    <span>Instructor: <strong>{item.faculty}</strong></span>
                  </div>

                  <div className="meta-cohort-pill">
                    <Layers size={13} className="text-muted" />
                    <span>Cohort: B.Tech CSE (Year 3)</span>
                  </div>
                </div>

                {item.note && (
                  <div className="lecture-alert-box">
                    <AlertCircle size={15} className="alert-icon-amber" />
                    <span>{item.note}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .timetable-page-container {
          width: 100%;
          max-width: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
        }

        /* 1. TOAST NOTIFICATION */
        .timetable-toast-pill {
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

        .toast-icon-emerald {
          color: #10b981;
        }

        /* 2. HEADER CARD */
        .timetable-header-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px 28px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .timetable-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          padding: 4px 10px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }

        .timetable-header-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 6px 0;
        }

        .timetable-header-desc {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        /* Day Selector Track */
        .day-selector-track {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          padding: 5px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          gap: 3px;
          overflow-x: auto;
          max-width: 100%;
        }

        .day-tab-btn {
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 7px 16px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .day-tab-btn.is-active {
          background: #2563eb;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        /* 3. SUMMARY BAR */
        .schedule-summary-bar {
          background: #ffffff;
          border-radius: 20px;
          padding: 12px 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .summary-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-icon-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #1e40af;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .summary-stat {
          font-size: 0.82rem;
          color: #64748b;
        }

        .summary-stat strong {
          color: #0f172a;
        }

        .live-now-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: #1e40af;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          padding: 4px 12px;
          border-radius: 9999px;
        }

        .live-dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
          animation: pulse 1.4s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }

        /* 4. SCHEDULE LIST */
        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .schedule-card-modern {
          background: #ffffff;
          border-radius: 22px;
          padding: 22px 28px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.025);
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
          align-items: center;
        }

        /* Ongoing highlight - clean light gradient, NOT dark mud */
        .card-ongoing {
          background: linear-gradient(to right, #eff6ff 0%, #ffffff 35%);
          border: 1.5px solid #bfdbfe;
          border-left: 5px solid #2563eb;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08);
        }

        .time-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .time-badge-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .time-text {
          font-size: 1.02rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .live-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 9999px;
          width: fit-content;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2563eb;
        }

        .completed-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 9999px;
          width: fit-content;
        }

        .upcoming-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 10px;
          border-radius: 9999px;
          width: fit-content;
        }

        /* Lecture Content */
        .lecture-main {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lecture-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .lecture-tags {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lecture-code-pill {
          font-size: 0.74rem;
          font-weight: 800;
          color: #b45309;
          background: #fef3c7;
          border: 1px solid #fde68a;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .class-type-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .pill-theory {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          color: #1d4ed8;
        }

        .pill-lab {
          background: #faf5ff;
          border: 1px solid #e9d5ff;
          color: #7e22ce;
        }

        .location-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
        }

        .location-pill-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .lecture-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          margin: 0;
        }

        .lecture-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .meta-faculty-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #475569;
        }

        .meta-faculty-pill strong {
          color: #0f172a;
        }

        .meta-cohort-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .lecture-alert-box {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 0.8rem;
          color: #92400e;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-left: 3px solid #f59e0b;
          padding: 8px 14px;
          border-radius: 8px;
        }

        .alert-icon-amber {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .text-blue {
          color: #2563eb;
        }

        .text-muted {
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .timetable-header-card {
            padding: 20px;
          }
          .schedule-card-modern {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 20px;
          }
          .time-column {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 10px;
          }
          .lecture-top-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .location-pill-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
