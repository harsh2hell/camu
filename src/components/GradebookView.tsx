import React, { useState, useEffect } from 'react';
import { 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Info,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Calendar,
  Building,
  GraduationCap
} from 'lucide-react';
import { getMyAcademicRecords, type AcademicRecordsDTO } from '../api/profile';

export const GradebookView: React.FC = () => {
  const [data, setData] = useState<AcademicRecordsDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMyAcademicRecords();
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve authoritative academic records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  if (isLoading) {
    return (
      <div className="dbs-loading-card animate-fade-in">
        <RefreshCw size={28} className="animate-spin text-accent" />
        <p>Loading authoritative academic records from database...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dbs-error-card animate-fade-in">
        <AlertCircle size={32} className="text-danger" />
        <p>{error}</p>
        <button type="button" className="dbs-reset-btn mt-3" onClick={fetchRecords}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="gradebook-container animate-fade-in">
      {/* Header */}
      <div className="gradebook-header glass-panel">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="heading-display page-title">Academic Records &amp; Course Enrollments</h2>
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> Database Verified
            </span>
          </div>
          <p className="page-desc">
            Official semester registrations, enrolled courses, earned credits, and verified cumulative performance for {data.student.fullName} ({data.student.rollNumber}).
          </p>
        </div>

        <button 
          type="button"
          className="btn btn-secondary flex items-center gap-2"
          onClick={fetchRecords}
          title="Refresh academic records"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Program & Semester Meta Banner */}
      <div className="glass-panel academic-meta-banner">
        <div className="meta-item">
          <GraduationCap size={16} className="text-accent" />
          <div>
            <span className="meta-label">Program &amp; Department</span>
            <strong className="meta-val">{data.program.name} &bull; {data.department.name}</strong>
          </div>
        </div>

        <div className="meta-item">
          <Calendar size={16} className="text-accent" />
          <div>
            <span className="meta-label">Enrolled Batch &amp; Section</span>
            <strong className="meta-val">{data.batch.batchName} &bull; {data.section.name}</strong>
          </div>
        </div>

        <div className="meta-item">
          <Building size={16} className="text-accent" />
          <div>
            <span className="meta-label">Registration Number</span>
            <strong className="meta-val font-mono">{data.student.registrationNo}</strong>
          </div>
        </div>
      </div>

      {/* SGPA & CGPA Cards */}
      <div className="grade-kpis">
        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Cumulative CGPA</span>
            <span className="badge badge-success"><TrendingUp size={12} /> Official Ledger</span>
          </div>
          <div className="grade-kpi-val heading-display text-accent">
            {data.currentCgpa.toFixed(2)} <span className="kpi-denom">/ 10.00</span>
          </div>
          <div className="grade-kpi-sub">Calculated up to Semester {data.currentSemester}</div>
        </div>

        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Current Enrolled Credits</span>
            <span className="badge badge-info"><Award size={12} /> Semester {data.currentSemester}</span>
          </div>
          <div className="grade-kpi-val heading-display text-success">
            {data.totalEnrolledCredits.toFixed(1)} <span className="kpi-denom">Credits</span>
          </div>
          <div className="grade-kpi-sub">Across <strong>{data.enrolledCourses.length}</strong> registered course offerings</div>
        </div>

        <div className="glass-panel grade-kpi-card">
          <div className="kpi-top">
            <span className="grade-kpi-label">Academic Standing</span>
            <span className="badge badge-success"><CheckCircle2 size={12} /> Verified</span>
          </div>
          <div className="grade-kpi-val heading-display" style={{ fontSize: '1.25rem' }}>
            {data.academicStanding}
          </div>
          <div className="grade-kpi-sub">Good Institutional Standing &bull; Eligible for Course Progression</div>
        </div>
      </div>

      {/* Enrolled Courses & Examination Components Table */}
      <div className="glass-panel grade-table-card">
        <div className="table-header-row">
          <div>
            <h3 className="heading-display table-title">Registered Courses &amp; Continuous Assessments</h3>
            <p className="table-sub">
              Course enrollments registered in Semester {data.currentSemester}. Published evaluation components reflect authoritative grades recorded in the examination database.
            </p>
          </div>
          <span className="badge badge-neutral">
            <BookOpen size={12} /> {data.enrolledCourses.length} Courses Enrolled
          </span>
        </div>

        <div className="table-responsive">
          <table className="grade-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Credits</th>
                <th>L - T - P</th>
                <th>Instructor</th>
                <th>Academic Term</th>
                <th>Published Assessments</th>
              </tr>
            </thead>
            <tbody>
              {data.enrolledCourses.map((c) => (
                <tr key={c.courseOfferingId}>
                  <td>
                    <span className="course-code-badge">{c.courseCode}</span>
                  </td>
                  <td>
                    <div className="course-title-cell font-semibold">{c.courseTitle}</div>
                  </td>
                  <td>
                    <strong>{c.credits}.0</strong>
                  </td>
                  <td>
                    <span className="ltp-pill">{c.lectureHours} - {c.tutorialHours} - {c.practicalHours}</span>
                  </td>
                  <td>
                    <div className="instructor-cell">
                      <span>{c.primaryFaculty.fullName}</span>
                      <span className="instructor-email">{c.primaryFaculty.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="term-text">Sem {c.semester} ({c.academicYear})</span>
                  </td>
                  <td>
                    {c.hasGradesEntered && c.grades.length > 0 ? (
                      <div className="assessments-list">
                        {c.grades.map((g) => (
                          <div key={g.componentId} className="assessment-chip">
                            <span className="chip-name">{g.componentName}:</span>
                            <span className="chip-score font-bold">{g.obtainedMarks} / {g.maxMarks}</span>
                            <span className="chip-weight">({g.weightagePercent}%)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="status-pending-pill">
                        Continuous Eval in Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Disclosures & Academic Policy Card */}
      <div className="glass-panel policy-disclosure-card">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div className="disclosure-text">
            <h4>Institutional Records Disclosure</h4>
            <p>{data.systemDisclosures.notice}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Source: <strong>{data.systemDisclosures.authoritativeSource}</strong>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .gradebook-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: inherit;
        }

        .gradebook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.04);
        }

        .page-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .page-desc {
          font-size: 0.88rem;
          color: #64748b;
          margin-top: 4px;
        }

        .academic-meta-banner {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          padding: 16px 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .meta-label {
          display: block;
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .meta-val {
          font-size: 0.88rem;
          color: #1e293b;
        }

        .grade-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }

        .grade-kpi-card {
          padding: 20px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.04);
        }

        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .grade-kpi-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        .grade-kpi-val {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 8px;
        }

        .kpi-denom {
          font-size: 1.1rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .grade-kpi-sub {
          font-size: 0.82rem;
          color: #64748b;
        }

        .grade-table-card {
          padding: 24px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.04);
        }

        .table-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
          gap: 16px;
        }

        .table-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .table-sub {
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 4px;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .grade-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }

        .grade-table th {
          text-align: left;
          padding: 12px;
          background: #f8fafc;
          border-bottom: 1.5px solid #e2e8f0;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .grade-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .course-code-badge {
          display: inline-block;
          font-family: monospace;
          font-weight: 700;
          font-size: 0.85rem;
          background: #f1f5f9;
          color: #334155;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .ltp-pill {
          font-size: 0.78rem;
          color: #64748b;
          background: #f8fafc;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }

        .instructor-cell {
          display: flex;
          flex-direction: column;
        }

        .instructor-email {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .term-text {
          font-size: 0.82rem;
          color: #64748b;
        }

        .status-pending-pill {
          display: inline-block;
          font-size: 0.76rem;
          font-weight: 600;
          color: #d97706;
          background: #fef3c7;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .assessments-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .assessment-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          background: #f0fdf4;
          color: #166534;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #bbf7d0;
        }

        .policy-disclosure-card {
          padding: 16px 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .disclosure-text h4 {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .disclosure-text p {
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.4;
        }

        .badge-info {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .badge-neutral {
          background: #f1f5f9;
          color: #475569;
        }
      `}</style>
    </div>
  );
};
