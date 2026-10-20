import React, { useState, useEffect } from 'react';
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
  Layers,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { type TimetableClass } from '../data/mockData';
import { timetableApi } from '../api/timetable';
import type { WeeklyScheduleDTO, TimetableSlotDTO } from '../../server/src/types/timetable';

// Dynamic weekly schedule state populated via /api/timetable/student

function mapSlotToClass(slot: TimetableSlotDTO): TimetableClass {
  return {
    id: slot.id,
    time: slot.timeRange,
    subjectCode: slot.courseCode,
    subjectTitle: slot.courseTitle,
    faculty: slot.facultyName,
    room: slot.roomNumber,
    isLab: slot.isLab,
    note: slot.note ?? undefined,
    status: slot.status || 'upcoming',
  };
}

export const SmartTimetable: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<Record<string, TimetableClass[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cohortInfo, setCohortInfo] = useState<string>('B.Tech CSE (Section A)');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const fetchSchedule = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await timetableApi.getStudentSchedule();
      if ('schedule' in data && data.schedule) {
        const weeklyDto = data as WeeklyScheduleDTO;
        const converted: Record<string, TimetableClass[]> = {};
        for (const d of days) {
          const slotsForDay = weeklyDto.schedule[d] || [];
          converted[d] = slotsForDay.map(mapSlotToClass);
        }
        setScheduleData(converted);
        if (weeklyDto.academicYear) {
          setCohortInfo(`B.Tech CSE &bull; Year ${weeklyDto.academicYear} (Sem ${weeklyDto.semester || 3})`);
        }
      }
    } catch (err: any) {
      console.warn('Live timetable fetch failed:', err);
      setErrorMsg(err.message || 'Unable to load real-time schedule from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const currentSchedule = scheduleData[selectedDay] || [];

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
            <span dangerouslySetInnerHTML={{ __html: `Interactive Dynamic Timetable &bull; ${cohortInfo}` }} />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8' }}>
              <Loader2 size={14} className="animate-spin" />
              <span>Syncing Live DB...</span>
            </div>
          )}

          {selectedDay === 'Monday' && currentSchedule.length > 0 && (
            <div className="live-now-indicator">
              <span className="live-dot-pulse"></span>
              <span>Current Active: <strong>{currentSchedule[0]?.subjectTitle || 'Algorithms'}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Error state alert with retry */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          margin: '0 0 16px 0',
          color: '#f87171',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={fetchSchedule}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && currentSchedule.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          color: 'var(--text-muted)'
        }}>
          <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h4 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: '15px' }}>No Sessions Scheduled</h4>
          <p style={{ margin: 0, fontSize: '13px' }}>There are no scheduled lectures or practical labs for {selectedDay}.</p>
        </div>
      )}

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
