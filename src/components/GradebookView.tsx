import { useState } from 'react';
import { 
  Award, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  Info
} from 'lucide-react';
import { MOCK_EXAM_GRADES, CURRENT_STUDENT, type SubjectGrade } from '../data/mockData';

export const GradebookView: React.FC = () => {
  const [grades] = useState<SubjectGrade[]>(MOCK_EXAM_GRADES);

  // Compute SGPA = Sum(credits * gradePoint) / Sum(credits)
  const totalCredits = grades.reduce((acc, curr) => acc + curr.credits, 0);
  const totalWeightedPoints = grades.reduce((acc, curr) => acc + (curr.credits * curr.gradePoint), 0);
  const projectedSgpa = (totalWeightedPoints / totalCredits).toFixed(2);

  return (
    <div className="gradebook-container animate-fade-in">
      {/* Header */}
      <div className="gradebook-header glass-panel">
        <div>
          <h2 className="heading-display page-title">Examinations & Continuous Internal Assessment</h2>
          <p className="page-desc">
            Continuous Evaluation: Sessional 1, Mid-Term, Sessional 2, and SGPA predictor for Semester 5.
          </p>
        </div>

        <button 
          className="btn btn-accent"
          onClick={() => alert('Generating Semester 5 Unofficial Grade Transcript (PDF)...')}
        >
          <Download size={16} /> Download Grade Transcript (PDF)
        </button>
      </div>

      {/* SGPA & CGPA Cards */}
      <div className="grade-kpis">
        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Cumulative CGPA (Sem 1 - 4)</span>
            <span className="badge badge-success"><TrendingUp size={12} /> Verified</span>
          </div>
          <div className="grade-kpi-val heading-display text-accent">
            {CURRENT_STUDENT.cgpa} <span className="kpi-denom">/ 10.0</span>
          </div>
          <div className="grade-kpi-sub">Total Earned Credits: <strong>96.0</strong></div>
        </div>

        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Projected Sem 5 SGPA</span>
            <span className="badge badge-info"><Award size={12} /> Live Continuous Eval</span>
          </div>
          <div className="grade-kpi-val heading-display text-success">
            {projectedSgpa} <span className="kpi-denom">/ 10.0</span>
          </div>
          <div className="grade-kpi-sub">Current Sem Registered Credits: <strong>{totalCredits}.0</strong></div>
        </div>

        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Academic Standing</span>
            <span className="badge badge-success"><CheckCircle2 size={12} /> Dean's List</span>
          </div>
          <div className="grade-kpi-val heading-display" style={{ fontSize: '1.4rem' }}>
            FIRST CLASS WITH DISTINCTION
          </div>
          <div className="grade-kpi-sub">0 Active Backlogs &bull; Eligible for Placements</div>
        </div>
      </div>

      {/* Internal Assessment Table */}
      <div className="glass-panel grade-table-card">
        <div className="table-header-row">
          <div>
            <h3 className="heading-display table-title">Continuous Internal Evaluation (70% Weightage)</h3>
            <p className="table-sub">End-Term examinations will cover the remaining 30% written theory paper.</p>
          </div>
          <span className="badge badge-warning">
            <Info size={12} /> Pass Criterion: Min 40% in Internal & End-Term
          </span>
        </div>

        <div className="table-responsive">
          <table className="grade-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Credits</th>
                <th>Sessional 1 (20)</th>
                <th>Mid-Term (30)</th>
                <th>Sessional 2 (20)</th>
                <th>Total Internal (70)</th>
                <th>Predicted Grade</th>
                <th>Grade Pt</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(row => (
                <tr key={row.code}>
                  <td>
                    <div className="course-code-cell">{row.code}</div>
                    <div className="course-title-cell">{row.title}</div>
                  </td>
                  <td><strong>{row.credits}</strong></td>
                  <td>{row.ia1} / 20</td>
                  <td><strong>{row.midTerm}</strong> / 30</td>
                  <td>{row.ia2} / 20</td>
                  <td>
                    <span className="total-internal-pill text-success">
                      {row.totalInternal} / 70
                    </span>
                  </td>
                  <td>
                    <span className="grade-badge">
                      {row.predictedGrade}
                    </span>
                  </td>
                  <td>
                    <strong>{row.gradePoint}.0</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .gradebook-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .gradebook-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .grade-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .grade-kpi-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
        }

        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .grade-kpi-label {
          font-size: 0.78rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
        }

        .grade-kpi-val {
          font-size: 2.2rem;
          font-weight: 800;
        }

        .grade-kpi-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .grade-table-card {
          padding: 24px;
        }

        .table-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .table-title {
          font-size: 1.25rem;
        }

        .table-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .grade-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .grade-table th {
          text-align: left;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.35);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .grade-table td {
          padding: 14px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .grade-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .course-code-cell {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--blue-400);
        }

        .course-title-cell {
          font-weight: 600;
          color: var(--text-primary);
        }

        .total-internal-pill {
          font-weight: 800;
        }

        .grade-badge {
          background: rgba(245, 158, 11, 0.15);
          color: var(--amber-400);
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
        }
      `}</style>
    </div>
  );
};
