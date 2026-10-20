import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  User,
  Heart,
  Home,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  History,
  Save,
  BookOpen,
  X
} from 'lucide-react';
import {
  getMyProfile,
  updateMyProfile,
  getProfileAuditTrail,
  type StudentProfileDTO,
  type ProfileAuditLogDTO,
  type UpdateProfileInput,
} from '../api/profile';

export const StudentProfileView: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState<UpdateProfileInput>({
    phone: '',
    personalEmail: '',
    bloodGroup: '',
    emergencyContact: '',
    guardianName: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Audit history modal
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<ProfileAuditLogDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMyProfile();
      setProfile(res.data);
      setFormData({
        phone: res.data.phone || '',
        personalEmail: res.data.personalEmail || '',
        bloodGroup: res.data.bloodGroup || '',
        emergencyContact: res.data.emergencyContact || '',
        guardianName: res.data.guardianName || '',
        addressLine: res.data.addressLine || '',
        city: res.data.city || '',
        state: res.data.state || '',
        pincode: res.data.pincode || '',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve official student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field: keyof UpdateProfileInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setValidationErrors({});
      setSuccessMessage(null);
      setError(null);

      // Clean empty strings to null
      const payload: UpdateProfileInput = {
        phone: formData.phone?.trim() || null,
        personalEmail: formData.personalEmail?.trim() || null,
        bloodGroup: (formData.bloodGroup as any) || null,
        emergencyContact: formData.emergencyContact?.trim() || null,
        guardianName: formData.guardianName?.trim() || null,
        addressLine: formData.addressLine?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        pincode: formData.pincode?.trim() || null,
      };

      const res = await updateMyProfile(payload);
      setProfile(res.data);
      setSuccessMessage('Contact details and emergency information updated successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      if (err?.status === 422 && err?.details) {
        const fieldErrors: Record<string, string> = {};
        for (const d of err.details) {
          fieldErrors[d.field] = d.message;
        }
        setValidationErrors(fieldErrors);
      } else {
        setError(err?.message || 'Failed to update profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAuditModal = async () => {
    if (!profile) return;
    try {
      setShowAuditModal(true);
      setIsLoadingAudit(true);
      const res = await getProfileAuditTrail();
      setAuditLogs(res.data);
    } catch (err: any) {
      console.warn('Failed to load profile audit trail:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dbs-loading-card animate-fade-in">
        <RefreshCw size={28} className="animate-spin text-accent" />
        <p>Loading authoritative university profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="dbs-error-card animate-fade-in">
        <AlertCircle size={32} className="text-danger" />
        <p>{error}</p>
        <button type="button" className="dbs-reset-btn mt-3" onClick={fetchProfile}>
          Retry
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="dbs-profile-container animate-fade-in">
      {/* Official University Identity Banner */}
      <div className="dbs-profile-header-card glass-panel">
        <div className="dbs-profile-header-inner">
          <div className="dbs-avatar-col">
            <div className="dbs-avatar-ring">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="dbs-avatar-large"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="dbs-avatar-fallback">
                  {profile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="dbs-verified-tag">
              <ShieldCheck size={13} className="text-emerald" />
              <span>Biometric Verified</span>
            </div>
          </div>

          <div className="dbs-profile-info-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="dbs-student-fullname">{profile.fullName}</h1>
                <div className="dbs-student-subrow">
                  <span className="dbs-badge badge-neutral">Roll: {profile.rollNumber}</span>
                  <span className="dbs-badge badge-neutral">Reg No: {profile.registrationNo}</span>
                  <span className="dbs-badge badge-accent">{profile.program.name}</span>
                  <span className="dbs-badge badge-success">Semester {profile.currentSemester}</span>
                </div>
              </div>

              <button
                type="button"
                className="dbs-btn-secondary"
                onClick={handleOpenAuditModal}
                title="View append-only audit trail"
              >
                <History size={15} />
                <span>Audit History</span>
              </button>
            </div>

            <div className="dbs-quick-stats-strip">
              <div className="dbs-stat-cell">
                <span className="stat-label">Academic Department</span>
                <strong className="stat-val">{profile.department.name}</strong>
              </div>
              <div className="dbs-stat-cell">
                <span className="stat-label">Batch &amp; Section</span>
                <strong className="stat-val">{profile.batch.batchName} &bull; {profile.section.name}</strong>
              </div>
              <div className="dbs-stat-cell">
                <span className="stat-label">Authoritative CGPA</span>
                <strong className="stat-val text-accent">{profile.currentCgpa.toFixed(2)} / 10.00</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="dbs-alert dbs-alert-success animate-fade-in">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="dbs-alert dbs-alert-danger animate-fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="dbs-profile-grid">
        {/* LEFT COLUMN: Institutional Protected Data & Mentor */}
        <div className="dbs-profile-col">
          {/* Protected Institutional Data Card */}
          <div className="dbs-card glass-panel">
            <div className="dbs-card-header">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-accent" />
                <h3 className="dbs-card-title">Protected Institutional Attributes</h3>
              </div>
              <span className="dbs-tag tag-immutable">Read-Only</span>
            </div>

            <p className="dbs-field-note mb-3">
              Official academic attributes are centrally verified and cannot be modified by students. Contact the Registrar’s Office for official corrections.
            </p>

            <div className="dbs-kv-list">
              <div className="dbs-kv-row">
                <span className="kv-key">Full Name</span>
                <span className="kv-val font-semibold">{profile.fullName}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Institutional Email</span>
                <span className="kv-val font-mono">{profile.email}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">University Roll No</span>
                <span className="kv-val font-mono">{profile.rollNumber}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Registration Number</span>
                <span className="kv-val font-mono">{profile.registrationNo}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Degree &amp; Program</span>
                <span className="kv-val">{profile.program.name} ({profile.program.code})</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Academic Department</span>
                <span className="kv-val">{profile.department.name}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Enrolled Batch</span>
                <span className="kv-val">{profile.batch.batchName} ({profile.batch.startYear} - {profile.batch.endYear})</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Assigned Section</span>
                <span className="kv-val">{profile.section.name}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Current Semester</span>
                <span className="kv-val">Semester {profile.currentSemester}</span>
              </div>
              <div className="dbs-kv-row">
                <span className="kv-key">Cumulative CGPA</span>
                <span className="kv-val font-semibold text-accent">{profile.currentCgpa.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Assigned Faculty Advisor / Mentor */}
          <div className="dbs-card glass-panel mt-4">
            <div className="dbs-card-header">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                <h3 className="dbs-card-title">Assigned Faculty Mentor</h3>
              </div>
              <span className="dbs-tag tag-verified">Academic Advisor</span>
            </div>

            {profile.mentor ? (
              <div className="dbs-mentor-box">
                <div className="mentor-avatar-circle">
                  {profile.mentor.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="mentor-details">
                  <h4 className="mentor-name">{profile.mentor.fullName}</h4>
                  <span className="mentor-desig">{profile.mentor.designation || 'Faculty Mentor'}</span>
                  <div className="mentor-contact-links">
                    <a href={`mailto:${profile.mentor.email}`} className="mentor-link">
                      <Mail size={13} /> {profile.mentor.email}
                    </a>
                    {profile.mentor.phone && (
                      <span className="mentor-link">
                        <Phone size={13} /> {profile.mentor.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="dbs-empty-text">No faculty mentor currently assigned. Please contact the Head of Department.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Editable Contact & Emergency Information */}
        <div className="dbs-profile-col">
          <div className="dbs-card glass-panel">
            <div className="dbs-card-header">
              <div className="flex items-center gap-2">
                <User size={16} className="text-accent" />
                <h3 className="dbs-card-title">Editable Contact &amp; Emergency Details</h3>
              </div>
              <span className="dbs-tag tag-editable">Self-Service</span>
            </div>

            <p className="dbs-field-note mb-4">
              Students are authorized to maintain their active telephone, personal correspondence email, blood group, and emergency contact details.
            </p>

            <form onSubmit={handleSaveProfile} className="dbs-form-stack">
              {/* Phone & Personal Email */}
              <div className="dbs-form-row">
                <div className="dbs-form-group">
                  <label htmlFor="student-phone" className="dbs-label">
                    <Phone size={13} /> Contact Mobile Number
                  </label>
                  <input
                    id="student-phone"
                    type="tel"
                    className={`dbs-input ${validationErrors.phone ? 'is-invalid' : ''}`}
                    placeholder="+91 9876543210"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                  {validationErrors.phone && (
                    <span className="dbs-error-hint">{validationErrors.phone}</span>
                  )}
                </div>

                <div className="dbs-form-group">
                  <label htmlFor="student-personal-email" className="dbs-label">
                    <Mail size={13} /> Personal Email (Alternate)
                  </label>
                  <input
                    id="student-personal-email"
                    type="email"
                    className={`dbs-input ${validationErrors.personalEmail ? 'is-invalid' : ''}`}
                    placeholder="student.personal@gmail.com"
                    value={formData.personalEmail || ''}
                    onChange={(e) => handleInputChange('personalEmail', e.target.value)}
                  />
                  {validationErrors.personalEmail && (
                    <span className="dbs-error-hint">{validationErrors.personalEmail}</span>
                  )}
                </div>
              </div>

              {/* Emergency Contact & Blood Group */}
              <div className="dbs-form-row">
                <div className="dbs-form-group">
                  <label htmlFor="student-emergency" className="dbs-label">
                    <Phone size={13} /> Emergency Contact Phone
                  </label>
                  <input
                    id="student-emergency"
                    type="tel"
                    className={`dbs-input ${validationErrors.emergencyContact ? 'is-invalid' : ''}`}
                    placeholder="+91 9876500000"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  />
                  {validationErrors.emergencyContact && (
                    <span className="dbs-error-hint">{validationErrors.emergencyContact}</span>
                  )}
                </div>

                <div className="dbs-form-group">
                  <label htmlFor="student-blood-group" className="dbs-label">
                    <Heart size={13} /> Blood Group
                  </label>
                  <select
                    id="student-blood-group"
                    className={`dbs-input ${validationErrors.bloodGroup ? 'is-invalid' : ''}`}
                    value={formData.bloodGroup || ''}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  {validationErrors.bloodGroup && (
                    <span className="dbs-error-hint">{validationErrors.bloodGroup}</span>
                  )}
                </div>
              </div>

              {/* Guardian Name */}
              <div className="dbs-form-group">
                <label htmlFor="student-guardian" className="dbs-label">
                  <User size={13} /> Parent / Guardian Full Name
                </label>
                <input
                  id="student-guardian"
                  type="text"
                  className={`dbs-input ${validationErrors.guardianName ? 'is-invalid' : ''}`}
                  placeholder="Mr. / Mrs. Guardian Name"
                  value={formData.guardianName || ''}
                  onChange={(e) => handleInputChange('guardianName', e.target.value)}
                />
                {validationErrors.guardianName && (
                  <span className="dbs-error-hint">{validationErrors.guardianName}</span>
                )}
              </div>

              {/* Address Details */}
              <div className="dbs-form-group">
                <label htmlFor="student-address" className="dbs-label">
                  <Home size={13} /> Correspondence Address Line
                </label>
                <input
                  id="student-address"
                  type="text"
                  className={`dbs-input ${validationErrors.addressLine ? 'is-invalid' : ''}`}
                  placeholder="Flat / House No., Street, Area"
                  value={formData.addressLine || ''}
                  onChange={(e) => handleInputChange('addressLine', e.target.value)}
                />
                {validationErrors.addressLine && (
                  <span className="dbs-error-hint">{validationErrors.addressLine}</span>
                )}
              </div>

              <div className="dbs-form-row">
                <div className="dbs-form-group">
                  <label htmlFor="student-city" className="dbs-label">City</label>
                  <input
                    id="student-city"
                    type="text"
                    className="dbs-input"
                    placeholder="Dehradun"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>

                <div className="dbs-form-group">
                  <label htmlFor="student-state" className="dbs-label">State</label>
                  <input
                    id="student-state"
                    type="text"
                    className="dbs-input"
                    placeholder="Uttarakhand"
                    value={formData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </div>

                <div className="dbs-form-group">
                  <label htmlFor="student-pincode" className="dbs-label">PIN Code</label>
                  <input
                    id="student-pincode"
                    type="text"
                    className={`dbs-input ${validationErrors.pincode ? 'is-invalid' : ''}`}
                    placeholder="248007"
                    value={formData.pincode || ''}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                  />
                  {validationErrors.pincode && (
                    <span className="dbs-error-hint">{validationErrors.pincode}</span>
                  )}
                </div>
              </div>

              <div className="dbs-form-actions mt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="dbs-btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Audit History Modal */}
      {showAuditModal && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <History size={18} className="text-accent" />
                <h3 className="modal-title">Student Profile Modification Audit Trail</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAuditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="dbs-field-note mb-3">
                All profile edits are permanently recorded with cryptographically verified session credentials and cannot be deleted or altered.
              </p>

              {isLoadingAudit ? (
                <div className="p-4 text-center">
                  <RefreshCw size={24} className="animate-spin text-accent mx-auto" />
                  <p className="mt-2 text-sm text-neutral-500">Retrieving audit history...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-6 text-sm text-neutral-500">
                  No profile modifications recorded. Profile is in original institutional state.
                </p>
              ) : (
                <div className="audit-timeline">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="audit-timeline-item">
                      <div className="audit-item-header">
                        <span className="audit-action-badge">{log.action}</span>
                        <span className="audit-time">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="audit-item-body">
                        <span className="audit-performer">
                          Updated by: <strong>{log.performedBy.fullName}</strong> ({log.performedBy.role})
                        </span>
                        <div className="audit-diff-box mt-2">
                          <strong>Changed fields:</strong> {Object.keys(log.changedFields).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dbs-profile-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          font-family: inherit;
        }

        .dbs-profile-header-card {
          padding: 24px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.05);
          margin-bottom: 24px;
        }

        .dbs-profile-header-inner {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }

        .dbs-avatar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .dbs-avatar-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid #562b63;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .dbs-avatar-large {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .dbs-avatar-fallback {
          font-size: 1.8rem;
          font-weight: 700;
          color: #562b63;
        }

        .dbs-verified-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #059669;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .dbs-profile-info-col {
          flex: 1;
          min-width: 280px;
        }

        .dbs-student-fullname {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .dbs-student-subrow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .dbs-quick-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
        }

        .dbs-stat-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stat-val {
          font-size: 0.95rem;
          color: #1e293b;
        }

        .dbs-profile-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .dbs-profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .dbs-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.04);
        }

        .dbs-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .dbs-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .dbs-field-note {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.4;
        }

        .dbs-kv-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dbs-kv-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 0.88rem;
        }

        .kv-key {
          color: #64748b;
        }

        .kv-val {
          color: #1e293b;
          text-align: right;
        }

        .dbs-mentor-box {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .mentor-avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #562b63;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .mentor-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .mentor-desig {
          font-size: 0.8rem;
          color: #64748b;
        }

        .mentor-contact-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 6px;
          font-size: 0.78rem;
        }

        .mentor-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #562b63;
          text-decoration: none;
        }

        /* Form elements */
        .dbs-form-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dbs-form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .dbs-form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dbs-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dbs-input {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.88rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .dbs-input:focus {
          border-color: #562b63;
          box-shadow: 0 0 0 2px rgba(86, 43, 99, 0.12);
        }

        .dbs-input.is-invalid {
          border-color: #ef4444;
        }

        .dbs-error-hint {
          font-size: 0.72rem;
          color: #ef4444;
          font-weight: 500;
        }

        .dbs-btn-primary {
          background: #562b63;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.88rem;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .dbs-btn-primary:hover:not(:disabled) {
          background: #431f4e;
        }

        .dbs-btn-secondary {
          background: #f1f5f9;
          color: #334155;
          font-weight: 600;
          font-size: 0.82rem;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .dbs-btn-secondary:hover {
          background: #e2e8f0;
        }

        .dbs-tag {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .tag-immutable {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .tag-editable {
          background: #e0e7ff;
          color: #4338ca;
        }

        .tag-verified {
          background: #f0fdf4;
          color: #166534;
        }

        .dbs-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .badge-neutral {
          background: #f1f5f9;
          color: #334155;
        }

        .badge-accent {
          background: #f3e8ff;
          color: #6b21a8;
        }

        .badge-success {
          background: #dcfce7;
          color: #15803d;
        }

        .dbs-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .dbs-alert-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .dbs-alert-danger {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        /* Audit Timeline */
        .audit-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        .audit-timeline-item {
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .audit-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          margin-bottom: 6px;
        }

        .audit-action-badge {
          font-weight: 700;
          color: #562b63;
          background: #f3e8ff;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .audit-time {
          color: #64748b;
        }

        .audit-performer {
          font-size: 0.82rem;
          color: #334155;
        }

        .audit-diff-box {
          font-size: 0.78rem;
          color: #475569;
          background: #ffffff;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
};
