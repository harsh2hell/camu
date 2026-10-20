import React, { useState, useEffect } from 'react';
import { 
  departmentApi, 
  type DepartmentOverview, 
  type DepartmentComplianceReport 
} from '../api/department';
import { academicApi, type Department } from '../api/academic';
import { 
  Building2, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Layers,
  GraduationCap
} from 'lucide-react';

export const DepartmentLeadershipView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [overview, setOverview] = useState<DepartmentOverview | null>(null);
  const [complianceReport, setComplianceReport] = useState<DepartmentComplianceReport | null>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'defaulters' | 'faculty' | 'allocations'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize departments
  useEffect(() => {
    academicApi.getDepartments()
      .then((res) => {
        const depts = res.data || [];
        setDepartments(depts);
        if (depts.length > 0 && !selectedDeptId) {
          setSelectedDeptId(depts[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const fetchDepartmentData = async (deptId: string) => {
    if (!deptId) return;
    setLoading(true);
    setError(null);
    try {
      const [overRes, compRes, facRes, allocRes] = await Promise.all([
        departmentApi.getOverview(deptId),
        departmentApi.getComplianceReport(deptId, 75),
        departmentApi.getFaculty(deptId),
        departmentApi.getCourseAllocations(deptId),
      ]);
      setOverview(overRes.data);
      setComplianceReport(compRes.data);
      setFacultyList(facRes.data || []);
      setAllocations(allocRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load department leadership data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentData(selectedDeptId);
    }
  }, [selectedDeptId]);

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">Department Leadership &amp; Governance Portal</h1>
          <p className="workspace-subtitle">Authorized HOD &amp; Dean Academic Supervision &amp; Defaulter Oversight</p>
        </div>
        <div className="workspace-actions">
          <div className="dept-select-wrapper">
            <Building2 size={16} />
            <select 
              value={selectedDeptId} 
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="dept-select"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => fetchDepartmentData(selectedDeptId)} 
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-wrapper bg-blue-100 text-blue-700">
              <Users size={22} />
            </div>
            <div>
              <span className="kpi-label">Faculty Members</span>
              <span className="kpi-val">{overview.stats.facultyCount}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper bg-purple-100 text-purple-700">
              <GraduationCap size={22} />
            </div>
            <div>
              <span className="kpi-label">Enrolled Students</span>
              <span className="kpi-val">{overview.stats.studentsCount}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper bg-amber-100 text-amber-700">
              <BookOpen size={22} />
            </div>
            <div>
              <span className="kpi-label">Active Courses</span>
              <span className="kpi-val">{overview.stats.coursesCount}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-wrapper bg-emerald-100 text-emerald-700">
              <CheckCircle size={22} />
            </div>
            <div>
              <span className="kpi-label">Department Compliance Rate</span>
              <span className="kpi-val">
                {complianceReport ? `${complianceReport.overallComplianceRate}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="nav-subtabs">
        <button 
          className={`subtab-btn ${activeTab === 'overview' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Building2 size={16} />
          <span>Department Summary</span>
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'defaulters' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('defaulters')}
        >
          <AlertTriangle size={16} />
          <span>Attendance Defaulters ({complianceReport?.defaulterCount ?? 0})</span>
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'faculty' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('faculty')}
        >
          <Users size={16} />
          <span>Faculty Directory ({facultyList.length})</span>
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'allocations' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('allocations')}
        >
          <Layers size={16} />
          <span>Course Allocations ({allocations.length})</span>
        </button>
      </div>

      {/* Summary View */}
      {activeTab === 'overview' && overview && (
        <div className="overview-container">
          <div className="info-card">
            <h2>Department Details</h2>
            <div className="info-row">
              <span className="label">Department Name:</span>
              <span className="val">{overview.department.name}</span>
            </div>
            <div className="info-row">
              <span className="label">Department Code:</span>
              <span className="val font-mono">{overview.department.code}</span>
            </div>
            <div className="info-row">
              <span className="label">Active Course Offerings:</span>
              <span className="val">{overview.stats.activeOfferingsCount} sections</span>
            </div>
            <div className="info-row">
              <span className="label">Coursework Assignments:</span>
              <span className="val">{overview.stats.assignmentsCount} active submissions</span>
            </div>
          </div>
        </div>
      )}

      {/* Defaulters View */}
      {activeTab === 'defaulters' && complianceReport && (
        <div className="table-card">
          <div className="defaulter-header">
            <div>
              <h3>Institutional Attendance Compliance Threshold: &lt; {complianceReport.threshold}%</h3>
              <p>Students listed below have breached official DGU attendance requirements across department courses.</p>
            </div>
            <span className="defaulter-badge">{complianceReport.defaulterCount} Defaulters Identified</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Course</th>
                <th>Sessions Attended</th>
                <th>Attendance %</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {complianceReport.defaulters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No attendance defaulters detected in this department. All students meet compliance thresholds.
                  </td>
                </tr>
              ) : (
                complianceReport.defaulters.map((d, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-slate-800">{d.fullName}</td>
                    <td className="font-mono text-slate-600">{d.rollNumber}</td>
                    <td>
                      <span className="font-bold text-burgundy">{d.courseCode}</span> &bull; {d.courseTitle}
                    </td>
                    <td>{d.attendedSessions} / {d.totalSessions}</td>
                    <td>
                      <span className={`pct-badge ${d.attendancePercentage < 50 ? 'pct-critical' : 'pct-warning'}`}>
                        {d.attendancePercentage}%
                      </span>
                    </td>
                    <td>
                      <span className={`risk-tag risk-${d.status.toLowerCase()}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Faculty Directory View */}
      {activeTab === 'faculty' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Faculty Name</th>
                <th>Designation</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {facultyList.map((f) => (
                <tr key={f.id}>
                  <td className="font-mono font-bold text-burgundy">{f.employeeCode}</td>
                  <td className="font-medium text-slate-800">{f.user?.fullName}</td>
                  <td>{f.designation}</td>
                  <td>{f.user?.email}</td>
                  <td>{f.user?.phone || 'N/A'}</td>
                  <td>
                    <span className={`status-pill ${f.user?.isActive ? 'status-active' : 'status-inactive'}`}>
                      {f.user?.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Course Allocations View */}
      {activeTab === 'allocations' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Section</th>
                <th>Allocated Faculty</th>
                <th>Term</th>
                <th>Timetable Slots</th>
                <th>Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="font-bold text-burgundy">{a.course?.code}</div>
                    <div className="text-xs text-slate-600">{a.course?.title}</div>
                  </td>
                  <td>{a.section?.name}</td>
                  <td className="font-medium text-slate-800">{a.primaryFaculty?.fullName}</td>
                  <td>{a.academicYear} &bull; Sem {a.semester}</td>
                  <td>{a.timetableSlots?.length ?? 0} weekly slots</td>
                  <td><span className="badge-count">{a._count?.enrollments ?? 0} students</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .workspace-container {
          padding: 24px;
          max-width: 1380px;
          margin: 0 auto;
        }
        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }
        .workspace-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .workspace-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .workspace-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .dept-select-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 10px;
        }
        .dept-select {
          border: none;
          outline: none;
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
          background: transparent;
        }
        .btn-secondary {
          background: #fff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .kpi-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-label {
          display: block;
          font-size: 0.78rem;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .kpi-val {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
        }
        .nav-subtabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        .subtab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }
        .subtab-active {
          color: #562b63;
          border-bottom-color: #562b63;
        }
        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .defaulter-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .defaulter-header h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          color: #0f172a;
        }
        .defaulter-header p {
          margin: 0;
          font-size: 0.82rem;
          color: #64748b;
        }
        .defaulter-badge {
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 0.82rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .data-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pct-badge {
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.82rem;
        }
        .pct-critical { background: #fee2e2; color: #b91c1c; }
        .pct-warning { background: #fef3c7; color: #b45309; }
        .risk-tag {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .risk-critical { background: #b91c1c; color: #fff; }
        .risk-warning { background: #f59e0b; color: #fff; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
        .text-burgundy { color: #562b63; }
        .badge-count {
          background: #ede9fe;
          color: #6d28d9;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .status-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .status-active { background: #dcfce7; color: #15803d; }
        .status-inactive { background: #fee2e2; color: #b91c1c; }
        .info-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
          max-width: 600px;
        }
        .info-card h2 {
          font-size: 1.15rem;
          margin: 0 0 16px 0;
          color: #1e293b;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
        }
        .info-row .label { color: #64748b; }
        .info-row .val { font-weight: 600; color: #1e293b; }
      `}</style>
    </div>
  );
};
