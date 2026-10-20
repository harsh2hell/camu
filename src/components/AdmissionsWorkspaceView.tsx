import React, { useState, useEffect } from 'react';
import { 
  admissionsApi, 
  type AdmissionApplication 
} from '../api/admissions';
import { academicApi, type Program } from '../api/academic';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  FileText, 
  AlertCircle,
  Plus,
  RefreshCw,
  Send,
  GraduationCap
} from 'lucide-react';

export const AdmissionsWorkspaceView: React.FC = () => {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Application Form State
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    programId: '',
    academicYear: '2026-27',
    highSchoolPercentage: 85,
    intermediatePercentage: 88,
    entranceExamScore: 120,
  });

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await admissionsApi.getApplications({ search, status: statusFilter || undefined });
      setApplications(res.data || []);
      if (selectedApp) {
        const updated = (res.data || []).find((a: AdmissionApplication) => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch applications' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await academicApi.getPrograms();
      setPrograms(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchPrograms();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleAddNote = async () => {
    if (!selectedApp || !newNote.trim()) return;
    setActionLoading(true);
    try {
      const res = await admissionsApi.addReviewNote(selectedApp.id, newNote.trim());
      setSelectedApp(res.data);
      setNewNote('');
      setStatusMessage({ type: 'success', text: 'Review note added successfully' });
      fetchApplications();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add note' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await admissionsApi.updateStatus(selectedApp.id, newStatus, `Status updated to ${newStatus}`);
      setSelectedApp(res.data);
      setStatusMessage({ type: 'success', text: `Application status updated to ${newStatus}` });
      fetchApplications();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update status' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnrollApplicant = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`Confirm enrollment of ${selectedApp.applicantName} into ${selectedApp.program.name}? This will generate their authoritative student profile and semester fee invoice.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await admissionsApi.enrollApplicant(selectedApp.id);
      setStatusMessage({ 
        type: 'success', 
        text: `Applicant successfully enrolled! Student ID: ${res.data.studentUser?.id}, Roll: ${res.data.studentProfile?.rollNumber}` 
      });
      fetchApplications();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Enrollment conversion failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programId) {
      setStatusMessage({ type: 'error', text: 'Please select an academic program' });
      return;
    }
    setActionLoading(true);
    try {
      await admissionsApi.createApplication(formData);
      setStatusMessage({ type: 'success', text: 'New admission application submitted successfully!' });
      setShowCreateModal(false);
      setFormData({
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        programId: '',
        academicYear: '2026-27',
        highSchoolPercentage: 85,
        intermediatePercentage: 88,
        entranceExamScore: 120,
      });
      fetchApplications();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Application submission failed' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">University Admissions &amp; Enrollment Workspace</h1>
          <p className="workspace-subtitle">Authorized DBS Global University Admissions &amp; Applicant Management</p>
        </div>
        <div className="workspace-actions">
          <button 
            type="button" 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>New Application</span>
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={fetchApplications}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`alert-banner ${statusMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="alert-close">&times;</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filter-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by applicant name, email, or application number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        <div className="status-filter-wrapper">
          <Filter size={16} />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="DOCUMENTS_PENDING">DOCUMENTS PENDING</option>
            <option value="OFFER_MADE">OFFER MADE</option>
            <option value="OFFER_ACCEPTED">OFFER ACCEPTED</option>
            <option value="ENROLLED">ENROLLED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Main Grid: List and Detail Pane */}
      <div className="workspace-grid">
        {/* Left Column: Applications List */}
        <div className="list-column">
          <div className="card-header">
            <Users size={18} />
            <h2>Applicants ({applications.length})</h2>
          </div>

          <div className="applicant-list">
            {loading ? (
              <div className="loading-state">Loading applicants...</div>
            ) : applications.length === 0 ? (
              <div className="empty-state">No admission applications found matching criteria.</div>
            ) : (
              applications.map((app) => (
                <div 
                  key={app.id} 
                  className={`applicant-card ${selectedApp?.id === app.id ? 'applicant-card-active' : ''}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="applicant-header">
                    <span className="applicant-app-no">{app.applicationNumber}</span>
                    <span className={`status-pill status-${app.status.toLowerCase()}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="applicant-name">{app.applicantName}</h3>
                  <div className="applicant-details">
                    <span>{app.program?.name}</span> &bull; <span>{app.academicYear}</span>
                  </div>
                  <div className="applicant-meta">
                    <span>{app.applicantEmail}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detail View */}
        <div className="detail-column">
          {selectedApp ? (
            <div className="detail-card">
              <div className="detail-header">
                <div>
                  <span className="detail-app-no">{selectedApp.applicationNumber}</span>
                  <h2 className="detail-name">{selectedApp.applicantName}</h2>
                  <p className="detail-program">{selectedApp.program?.name} &bull; {selectedApp.academicYear}</p>
                </div>
                <div>
                  <span className={`status-pill status-lg status-${selectedApp.status.toLowerCase()}`}>
                    {selectedApp.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="action-toolbar">
                {selectedApp.status === 'SUBMITTED' && (
                  <button 
                    className="btn-action" 
                    onClick={() => handleStatusChange('UNDER_REVIEW')}
                    disabled={actionLoading}
                  >
                    <Clock size={15} />
                    <span>Begin Review</span>
                  </button>
                )}
                {selectedApp.status === 'UNDER_REVIEW' && (
                  <>
                    <button 
                      className="btn-action btn-success" 
                      onClick={() => handleStatusChange('OFFER_MADE')}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={15} />
                      <span>Issue Admission Offer</span>
                    </button>
                    <button 
                      className="btn-action btn-warning" 
                      onClick={() => handleStatusChange('DOCUMENTS_PENDING')}
                      disabled={actionLoading}
                    >
                      <FileText size={15} />
                      <span>Request Documents</span>
                    </button>
                  </>
                )}
                {selectedApp.status === 'OFFER_MADE' && (
                  <button 
                    className="btn-action btn-success" 
                    onClick={() => handleStatusChange('OFFER_ACCEPTED')}
                    disabled={actionLoading}
                  >
                    <UserCheck size={15} />
                    <span>Record Offer Acceptance</span>
                  </button>
                )}
                {selectedApp.status === 'OFFER_ACCEPTED' && (
                  <button 
                    className="btn-action btn-enroll" 
                    onClick={handleEnrollApplicant}
                    disabled={actionLoading}
                  >
                    <GraduationCap size={16} />
                    <span>Convert to Enrolled Student</span>
                  </button>
                )}
                {selectedApp.status === 'ENROLLED' && (
                  <div className="enrollment-confirmed-badge">
                    <CheckCircle size={16} />
                    <span>Officially Enrolled in DBS University Record</span>
                  </div>
                )}
              </div>

              {/* Academic & Contact Info */}
              <div className="info-grid">
                <div className="info-block">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{selectedApp.applicantEmail}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{selectedApp.applicantPhone}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">10th Grade Percentage</span>
                  <span className="info-value">{selectedApp.highSchoolPercentage ? `${selectedApp.highSchoolPercentage}%` : 'N/A'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">12th Grade Percentage</span>
                  <span className="info-value">{selectedApp.intermediatePercentage ? `${selectedApp.intermediatePercentage}%` : 'N/A'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Entrance Exam Score</span>
                  <span className="info-value">{selectedApp.entranceExamScore ?? 'N/A'}</span>
                </div>
                <div className="info-block">
                  <span className="info-label">Application Date</span>
                  <span className="info-value">{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Review Notes Section */}
              <div className="notes-section">
                <h3>Admissions Review Notes</h3>
                <div className="notes-list">
                  {selectedApp.reviewNotes && selectedApp.reviewNotes.length > 0 ? (
                    selectedApp.reviewNotes.map((note, idx) => (
                      <div key={idx} className="note-item">
                        <span className="note-text">{note}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">No review notes recorded yet.</div>
                  )}
                </div>

                <div className="add-note-box">
                  <input 
                    type="text" 
                    placeholder="Enter review note or verification observation..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="note-input"
                  />
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleAddNote}
                    disabled={actionLoading || !newNote.trim()}
                  >
                    <Send size={15} />
                    <span>Add Note</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-detail-card">
              <UserCheck size={48} className="empty-icon" />
              <h3>No Applicant Selected</h3>
              <p>Select an applicant from the list on the left to inspect documents, add review notes, or process enrollment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Application Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Student Admission Application</h2>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateApplication} className="modal-form">
              <div className="form-group">
                <label>Applicant Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.applicantName} 
                  onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                  placeholder="e.g. Vikramaditya Sharma"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Applicant Email</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.applicantEmail} 
                    onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                    placeholder="applicant@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.applicantPhone} 
                    onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Academic Program</label>
                <select 
                  required 
                  value={formData.programId} 
                  onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                >
                  <option value="">Select Academic Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>10th Grade Percentage</label>
                  <input 
                    type="number" 
                    min="40" 
                    max="100" 
                    value={formData.highSchoolPercentage} 
                    onChange={(e) => setFormData({ ...formData, highSchoolPercentage: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>12th Grade Percentage</label>
                  <input 
                    type="number" 
                    min="40" 
                    max="100" 
                    value={formData.intermediatePercentage} 
                    onChange={(e) => setFormData({ ...formData, intermediatePercentage: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
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
        }
        .btn-primary {
          background: #562b63;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary:hover {
          background: #442150;
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
        .btn-secondary:hover {
          background: #f1f5f9;
        }
        .filter-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        .search-form {
          display: flex;
          gap: 8px;
          flex: 1;
        }
        .search-input-wrapper {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px 8px 38px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .status-filter-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
        }
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
          background: #fff;
        }
        .workspace-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 20px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 12px;
        }
        .card-header h2 {
          font-size: 1.1rem;
          margin: 0;
          color: #1e293b;
        }
        .applicant-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 720px;
          overflow-y: auto;
        }
        .applicant-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }
        .applicant-card:hover {
          border-color: #562b63;
          box-shadow: 0 2px 6px rgba(86, 43, 99, 0.08);
        }
        .applicant-card-active {
          border-color: #562b63;
          background: #fdfafc;
          border-left: 4px solid #562b63;
        }
        .applicant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .applicant-app-no {
          font-family: monospace;
          font-size: 0.78rem;
          color: #64748b;
        }
        .applicant-name {
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .applicant-details {
          font-size: 0.82rem;
          color: #475569;
          margin-bottom: 4px;
        }
        .applicant-meta {
          font-size: 0.78rem;
          color: #94a3b8;
        }
        .status-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-lg {
          padding: 4px 12px;
          font-size: 0.8rem;
        }
        .status-submitted { background: #e0f2fe; color: #0369a1; }
        .status-under_review { background: #fef3c7; color: #b45309; }
        .status-documents_pending { background: #ffedd5; color: #c2410c; }
        .status-offer_made { background: #ede9fe; color: #6d28d9; }
        .status-offer_accepted { background: #dcfce7; color: #15803d; }
        .status-enrolled { background: #059669; color: #fff; }
        .status-rejected { background: #fee2e2; color: #b91c1c; }
        .detail-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
        }
        .empty-detail-card {
          background: #fff;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 60px 24px;
          text-align: center;
          color: #64748b;
        }
        .empty-icon {
          color: #cbd5e1;
          margin-bottom: 12px;
        }
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }
        .detail-app-no {
          font-family: monospace;
          font-size: 0.85rem;
          color: #64748b;
        }
        .detail-name {
          font-size: 1.4rem;
          font-weight: 700;
          color: #0f172a;
          margin: 4px 0;
        }
        .detail-program {
          font-size: 0.92rem;
          color: #475569;
          margin: 0;
        }
        .action-toolbar {
          display: flex;
          gap: 10px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .btn-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
        }
        .btn-success { background: #10b981; color: #fff; border: none; }
        .btn-warning { background: #f59e0b; color: #fff; border: none; }
        .btn-enroll { background: #562b63; color: #fff; border: none; font-weight: 700; }
        .enrollment-confirmed-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #059669;
          font-weight: 600;
          background: #ecfdf5;
          padding: 8px 16px;
          border-radius: 6px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .info-block {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
        }
        .info-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }
        .notes-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        .notes-section h3 {
          font-size: 1.05rem;
          margin: 0 0 12px 0;
          color: #1e293b;
        }
        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .note-item {
          background: #f8fafc;
          border-left: 3px solid #562b63;
          padding: 10px 14px;
          border-radius: 0 6px 6px 0;
          font-size: 0.88rem;
          color: #334155;
        }
        .add-note-box {
          display: flex;
          gap: 8px;
        }
        .note-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .alert-success { background: #dcfce7; color: #166534; }
        .alert-error { background: #fee2e2; color: #991b1b; }
        .alert-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 10px;
          width: 520px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modal-header h2 {
          font-size: 1.2rem;
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-group label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
        }
        .form-group input, .form-group select {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
