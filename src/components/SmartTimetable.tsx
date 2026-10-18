import { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  User, 
  FlaskConical, 
  BookOpen, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { TODAY_CLASSES } from '../data/mockData';

export const SmartTimetable: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="timetable-container animate-fade-in">
      <div className="timetable-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Interactive Dynamic Timetable</h2>
          <p className="page-desc">
            Room allocations, lab sessions, and live lecture statuses for B.Tech CSE (Section A).
          </p>
        </div>

        {/* Day Selector */}
        <div className="day-selector">
          {days.map((day) => (
            <button
              key={day}
              className={`day-btn ${selectedDay === day ? 'day-active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Feed */}
      <div className="schedule-list">
        {TODAY_CLASSES.map((item) => {
          const isOngoing = item.status === 'ongoing';
          const isCompleted = item.status === 'completed';

          return (
            <div 
              key={item.id} 
              className={`schedule-card glass-panel ${isOngoing ? 'card-ongoing' : ''}`}
            >
              <div className="time-column">
                <div className="time-badge">
                  <Clock size={14} />
                  <span>{item.time}</span>
                </div>
                {isOngoing && (
                  <span className="live-status-pill">
                    <span className="live-dot"></span> NOW ACTIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="completed-pill">
                    <CheckCircle size={12} /> Conducted
                  </span>
                )}
              </div>

              <div className="lecture-main">
                <div className="lecture-top">
                  <span className="lecture-code">{item.subjectCode}</span>
                  {item.isLab ? (
                    <span className="badge badge-warning">
                      <FlaskConical size={12} /> Practical Lab
                    </span>
                  ) : (
                    <span className="badge badge-info">
                      <BookOpen size={12} /> Theory Lecture
                    </span>
                  )}
                </div>

                <h3 className="lecture-title">{item.subjectTitle}</h3>

                <div className="lecture-details">
                  <div className="detail-item">
                    <MapPin size={15} className="detail-icon" />
                    <span><strong>{item.room}</strong></span>
                  </div>
                  <div className="detail-item">
                    <User size={15} className="detail-icon" />
                    <span>{item.faculty}</span>
                  </div>
                </div>

                {item.note && (
                  <div className="lecture-note">
                    <AlertCircle size={14} />
                    <span>{item.note}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .timetable-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .timetable-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-title {
          font-size: 1.5rem;
          margin-bottom: 4px;
        }

        .page-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .day-selector {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          padding: 4px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          overflow-x: auto;
          max-width: 100%;
        }

        .day-btn {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .day-btn:hover {
          color: var(--text-primary);
        }

        .day-active {
          background: var(--blue-600);
          color: white !important;
          box-shadow: 0 2px 10px rgba(37, 99, 235, 0.4);
        }

        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .schedule-card {
          padding: 20px 24px;
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          align-items: center;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .card-ongoing {
          border-color: rgba(59, 130, 246, 0.6);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(11, 19, 41, 0.7));
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.25);
        }

        .time-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .time-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .live-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--blue-400);
          background: rgba(59, 130, 246, 0.2);
          padding: 3px 8px;
          border-radius: var(--radius-full);
          width: fit-content;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--blue-400);
          box-shadow: 0 0 8px var(--blue-400);
          animation: pulse 1.2s infinite;
        }

        .completed-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .lecture-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .lecture-code {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--amber-400);
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .lecture-title {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .lecture-details {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .detail-icon {
          color: var(--blue-400);
        }

        .lecture-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          font-size: 0.78rem;
          color: var(--amber-400);
          background: rgba(245, 158, 11, 0.1);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--amber-500);
        }

        @media (max-width: 768px) {
          .schedule-card {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};
