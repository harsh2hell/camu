import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  GraduationCap
} from 'lucide-react';
import {
  getFacultyMentees,
  getStudentProfile,
  getStudentAcademicRecords,
  type StudentProfileDTO,
  type AcademicRecordsDTO,
} from '../api/profile';

export const FacultyStudentRecordsView: React.FC = () => {
  const [mentees, setMentees] = useState<StudentProfileDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileDTO | null>(null);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecordsDTO | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchMentees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getFacultyMentees();
      setMentees(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve assigned student mentees.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, []);

  const handleInspectStudent = async (student: StudentProfileDTO) => {
    try {
      setSelectedStudent(student);
      setIsLoadingDetail(true);
      setDetailError(null);
      setAcademicRecords(null);

      // Fetch fresh profile and academic records concurrently
      const [pRes, aRes] = await Promise.all([
        getStudentProfile(student.id),
        getStudentAcademicRecords(student.id),
      ]);
      setSelectedStudent(pRes.data);
      setAcademicRecords(aRes.data);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load student academic records.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredMentees = mentees.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.rollNumber.toLowerCase().includes(q) ||
      m.registrationNo.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.section.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="faculty-records-container animate-fade-in">
      {/* Header Banner */}
      <div className="faculty-records-header glass-panel">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="heading-display page-title">Faculty Mentorship &amp; Student Records</h2>
            <span className="badge badge-accent">
              <Users size={13} /> Assigned Mentees
            </span>
          </div>
          <p className="page-desc">
            Authorized departmental student advisory console. View assigned student profiles, contact details, registered courses, and academic performance.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary flex items-center gap-2"
          onClick={fetchMentees}
          title="Refresh mentee list"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="search-filter-card glass-panel">
        <div className="search-box">
          <Search size={16} className="text-neutral-400" />
          <input
            type="text"
            className="search-input"
            placeholder="Search mentee by name, roll number, registration number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="count-pill">
          {filteredMentees.length} {filteredMentees.length === 1 ? 'Student' : 'Students'}
        </span>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="dbs-loading-card">
          <RefreshCw size={28} className="animate-spin text-accent" />
          <p>Retrieving assigned mentees from database...</p>
        </div>
      ) : error ? (
        <div className="dbs-error-card">
          <AlertCircle size={32} className="text-danger" />
          <p>{error}</p>
          <button type="button" className="dbs-reset-btn mt-3" onClick={fetchMentees}>
            Retry
          </button>
        </div>
      ) : filteredMentees.length === 0 ? (
        <div className="dbs-empty-card">
          <Users size={40} className="dbs-empty-icon" />
          <h3>No student mentees found</h3>
          <p>
            {searchQuery
              ? 'No mentees match your search query.'
              : 'You do not have any students currently assigned for academic mentorship.'}
          </p>
        </div>
      ) : (
        <div className="mentees-grid">
          {filteredMentees.map((m) => (
            <div key={m.id} className="mentee-card glass-panel">
              <div className="mentee-card-top">
                <div className="mentee-avatar">
                  {m.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="mentee-main-meta">
                  <h3 className="mentee-name">{m.fullName}</h3>
                  <span className="mentee-roll font-mono">{m.rollNumber}</span>
                  <span className="mentee-prog">{m.program.name}</span>
                </div>
              </div>

              <div className="mentee-details-list">
                <div className="mentee-detail-row">
                  <span className="detail-label">Section &amp; Sem:</span>
                  <span className="detail-val">{m.section.name} &bull; Sem {m.currentSemester}</span>
                </div>
                <div className="mentee-detail-row">
                  <span className="detail-label">Current CGPA:</span>
                  <span className="detail-val font-semibold text-accent">{m.currentCgpa.toFixed(2)}</span>
                </div>
                <div className="mentee-detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-val text-truncate font-mono">{m.email}</span>
                </div>
                {m.phone && (
                  <div className="mentee-detail-row">
                    <span className="detail-label">Mobile:</span>
                    <span className="detail-val">{m.phone}</span>
                  </div>
                )}
              </div>

              <div className="mentee-card-footer">
                <button
                  type="button"
                  className="inspect-btn"
                  onClick={() => handleInspectStudent(m)}
                >
                  <Eye size={14} />
                  <span>View Academic Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Academic Details Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-accent" />
                <h3 className="modal-title">
                  {selectedStudent.fullName} &bull; Academic Profile
                </h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {isLoadingDetail ? (
                <div className="p-6 text-center">
                  <RefreshCw size={24} className="animate-spin text-accent mx-auto" />
                  <p className="mt-2 text-sm text-neutral-500">Loading academic records...</p>
                </div>
              ) : detailError ? (
                <div className="dbs-alert dbs-alert-danger">
                  <AlertCircle size={16} />
                  <span>{detailError}</span>
                </div>
              ) : (
                <div className="student-detail-stack">
                  {/* Student Summary Strip */}
                  <div className="detail-summary-strip">
                    <div className="summary-cell">
                      <span className="summary-lbl">Roll Number</span>
                      <strong className="summary-val font-mono">{selectedStudent.rollNumber}</strong>
                    </div>
                    <div className="summary-cell">
                      <span className="summary-lbl">Registration No</span>
                      <strong className="summary-val font-mono">{selectedStudent.registrationNo}</strong>
                    </div>
                    <div className="summary-cell">
                      <span className="summary-lbl">Current CGPA</span>
                      <strong className="summary-val text-accent">{selectedStudent.currentCgpa.toFixed(2)}</strong>
                    </div>
                    <div className="summary-cell">
                      <span className="summary-lbl">Semester &amp; Batch</span>
                      <strong className="summary-val">Sem {selectedStudent.currentSemester} &bull; {selectedStudent.batch.batchName}</strong>
                    </div>
                  </div>

                  {/* Contact & Emergency Info */}
                  <div className="contact-box mt-3">
                    <h4 className="box-title">Contact &amp; Emergency Details</h4>
                    <div className="contact-grid">
                      <div className="c-item">
                        <Mail size={13} className="text-neutral-400" />
                        <span>Institutional: <strong>{selectedStudent.email}</strong></span>
                      </div>
                      {selectedStudent.personalEmail && (
                        <div className="c-item">
                          <Mail size={13} className="text-neutral-400" />
                          <span>Personal: <strong>{selectedStudent.personalEmail}</strong></span>
                        </div>
                      )}
                      {selectedStudent.phone && (
                        <div className="c-item">
                          <Phone size={13} className="text-neutral-400" />
                          <span>Phone: <strong>{selectedStudent.phone}</strong></span>
                        </div>
                      )}
                      {selectedStudent.emergencyContact && (
                        <div className="c-item">
                          <Phone size={13} className="text-neutral-400" />
                          <span>Emergency Contact: <strong>{selectedStudent.emergencyContact}</strong></span>
                        </div>
                      )}
                      {selectedStudent.bloodGroup && (
                        <div className="c-item">
                          <ShieldCheck size={13} className="text-neutral-400" />
                          <span>Blood Group: <strong>{selectedStudent.bloodGroup}</strong></span>
                        </div>
                      )}
                      {selectedStudent.guardianName && (
                        <div className="c-item">
                          <Users size={13} className="text-neutral-400" />
                          <span>Guardian: <strong>{selectedStudent.guardianName}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registered Courses Table */}
                  {academicRecords && (
                    <div className="enrolled-courses-box mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="box-title">
                          Registered Course Offerings ({academicRecords.enrolledCourses.length})
                        </h4>
                        <span className="badge badge-info">
                          Total Credits: {academicRecords.totalEnrolledCredits}.0
                        </span>
                      </div>

                      <div className="table-responsive">
                        <table className="courses-table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Course Title</th>
                              <th>Credits</th>
                              <th>Instructor</th>
                              <th>Assessments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {academicRecords.enrolledCourses.map((c) => (
                              <tr key={c.courseOfferingId}>
                                <td className="font-mono font-bold text-sm">{c.courseCode}</td>
                                <td>{c.courseTitle}</td>
                                <td>{c.credits}.0</td>
                                <td className="text-sm">{c.primaryFaculty.fullName}</td>
                                <td>
                                  {c.hasGradesEntered ? (
                                    <span className="badge badge-success text-xs">Evaluated</span>
                                  ) : (
                                    <span className="badge badge-neutral text-xs">In Progress</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-records-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: inherit;
        }

        .faculty-records-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.04);
        }

        .search-filter-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          gap: 16px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .search-input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.88rem;
          color: #1e293b;
        }

        .clear-search-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .count-pill {
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .mentees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .mentee-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .mentee-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.08);
        }

        .mentee-card-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }

        .mentee-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #562b63;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.05rem;
          flex-shrink: 0;
        }

        .mentee-name {
          font-size: 0.98rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .mentee-roll {
          display: block;
          font-size: 0.78rem;
          color: #64748b;
        }

        .mentee-prog {
          display: block;
          font-size: 0.74rem;
          color: #562b63;
          font-weight: 600;
        }

        .mentee-details-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.82rem;
        }

        .mentee-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }

        .detail-label {
          color: #64748b;
        }

        .detail-val {
          color: #1e293b;
          font-weight: 500;
        }

        .text-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .mentee-card-footer {
          margin-top: 14px;
        }

        .inspect-btn {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #562b63;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .inspect-btn:hover {
          background: #f1f5f9;
        }

        /* Modal Details */
        .detail-summary-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .summary-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-lbl {
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
        }

        .summary-val {
          font-size: 0.88rem;
          color: #1e293b;
        }

        .contact-box, .enrolled-courses-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
        }

        .box-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 10px 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .c-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #334155;
        }

        .courses-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
        }

        .courses-table th {
          text-align: left;
          padding: 8px 10px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.74rem;
          color: #64748b;
          text-transform: uppercase;
        }

        .courses-table td {
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
        }
      `}</style>
    </div>
  );
};
