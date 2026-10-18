import { useState } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Award
} from 'lucide-react';
import { MOCK_ASSIGNMENTS, type AssignmentItem } from '../data/mockData';

export const LMSAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(MOCK_ASSIGNMENTS);
  const [submittedToast, setSubmittedToast] = useState<string | null>(null);

  const handleSimulatedSubmit = (id: string, title: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, status: 'submitted' };
    }));

    setSubmittedToast(`Solution PDF for "${title}" successfully uploaded and timestamped!`);
    setTimeout(() => setSubmittedToast(null), 4000);
  };

  return (
    <div className="lms-container animate-fade-in">
      {submittedToast && (
        <div className="toast-notification">
          <CheckCircle2 size={18} className="text-success" />
          <span>{submittedToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="lms-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Academics & Learning Management (LMS)</h2>
          <p className="page-desc">
            Assignments, syllabus repositories, and lecture slides with deadline countdowns.
          </p>
        </div>

        <div className="lms-stat-pill">
          <Award size={16} className="text-accent" />
          <span>Semester 5 Credits: <strong>24.0</strong></span>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="section-title-wrap">
        <h3 className="heading-display section-subheading">Active Assignments & Course Deliverables</h3>
      </div>

      <div className="assignments-grid">
        {assignments.map((item) => {
          const isPending = item.status === 'pending';
          const isSubmitted = item.status === 'submitted';
          const isGraded = item.status === 'graded';

          return (
            <div key={item.id} className="assignment-card glass-panel">
              <div className="asg-top">
                <span className="asg-subject">{item.subject}</span>
                {isPending && (
                  <span className="badge badge-warning">
                    <Clock size={12} /> Due: {item.dueDate}
                  </span>
                )}
                {isSubmitted && (
                  <span className="badge badge-info">
                    <CheckCircle2 size={12} /> Submitted for Grading
                  </span>
                )}
                {isGraded && (
                  <span className="badge badge-success">
                    <Award size={12} /> Score: {item.score} / {item.totalMarks}
                  </span>
                )}
              </div>

              <h4 className="asg-title">{item.title}</h4>

              <div className="asg-meta">
                <span>Maximum Marks: <strong>{item.totalMarks}</strong></span>
                <span>Cutoff Time: <strong>{item.dueTime}</strong></span>
              </div>

              <div className="asg-actions">
                <button className="btn btn-ghost">
                  <FileText size={15} /> Question Brief (PDF)
                </button>

                {isPending && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleSimulatedSubmit(item.id, item.title)}
                  >
                    <UploadCloud size={16} /> Submit Solution
                  </button>
                )}

                {isSubmitted && (
                  <span className="submitted-msg">
                    <CheckCircle2 size={15} className="text-success" /> Turn-in Verified
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Materials & Syllabus Repositories */}
      <div className="section-title-wrap" style={{ marginTop: '20px' }}>
        <h3 className="heading-display section-subheading">Course Materials & Lecture Handouts</h3>
      </div>

      <div className="materials-grid">
        <div className="material-card glass-panel">
          <BookOpen className="mat-icon text-accent" size={24} />
          <div className="mat-info">
            <h4 className="mat-title">CS302: Design & Analysis of Algorithms</h4>
            <p className="mat-sub">Module 1 to 4 Complete Slides, Lecture Notes & GATE Practice Problems</p>
          </div>
          <button className="btn btn-ghost mat-btn">
            <Download size={15} /> Download Pack (42 MB)
          </button>
        </div>

        <div className="material-card glass-panel">
          <BookOpen className="mat-icon text-accent" size={24} />
          <div className="mat-info">
            <h4 className="mat-title">CS304: Database Management Systems</h4>
            <p className="mat-sub">PostgreSQL Lab Schema, Query Optimization & Transaction Management Notes</p>
          </div>
          <button className="btn btn-ghost mat-btn">
            <Download size={15} /> Download Pack (28 MB)
          </button>
        </div>

        <div className="material-card glass-panel">
          <BookOpen className="mat-icon text-accent" size={24} />
          <div className="mat-info">
            <h4 className="mat-title">CS310: Cloud Computing & Microservices</h4>
            <p className="mat-sub">Docker, Kubernetes Architecture & AWS EC2 Deployment Guides</p>
          </div>
          <button className="btn btn-ghost mat-btn">
            <Download size={15} /> Download Pack (35 MB)
          </button>
        </div>
      </div>

      <style>{`
        .lms-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          background: #0f1c3d;
          border: 1px solid var(--emerald-500);
          color: white;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .lms-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .lms-stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          color: var(--amber-400);
        }

        .section-subheading {
          font-size: 1.2rem;
          color: var(--text-primary);
          margin-top: 10px;
        }

        .assignments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 18px;
        }

        .assignment-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        .asg-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .asg-subject {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--blue-400);
        }

        .asg-title {
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .asg-meta {
          display: flex;
          gap: 16px;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .asg-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }

        .submitted-msg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--emerald-400);
        }

        .materials-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .mat-info {
          flex: 1;
          min-width: 250px;
        }

        .mat-title {
          font-size: 0.95rem;
          font-weight: 700;
        }

        .mat-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .mat-btn {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};
