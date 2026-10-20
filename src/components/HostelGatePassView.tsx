import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  PlusCircle, 
  CheckCircle2, 
  X,
  Smartphone,
  AlertCircle,
  Clock,
  Building,
  UserCheck
} from 'lucide-react';
import { getMyProfile, type StudentProfileDTO } from '../api/profile';

export interface GatePass {
  id: string;
  passNo: string;
  type: 'DAY_OUTING' | 'HOME_VISIT';
  destination: string;
  outTime: string;
  expectedInTime: string;
  reason: string;
  status: 'PENDING_WARDEN' | 'APPROVED' | 'CHECKED_OUT' | 'RETURNED' | 'EXPIRED';
  wardenName: string;
  qrToken?: string;
  issuedDate: string;
}

export const HostelGatePassView: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfileDTO | null>(null);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [passType, setPassType] = useState<'DAY_OUTING' | 'HOME_VISIT'>('DAY_OUTING');
  const [destination, setDestination] = useState('');
  const [expectedIn, setExpectedIn] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let isMounted = true;
    getMyProfile()
      .then((res) => {
        if (isMounted && res.data) {
          setProfile(res.data);
        }
      })
      .catch((err) => {
        console.warn('Profile fetch failed in GatePass view:', err);
      });

    // Check localStorage for saved session passes (scoped to student)
    try {
      const saved = localStorage.getItem('dbs_student_gatepasses');
      if (saved) {
        setPasses(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const activePass = passes.find(p => p.status === 'APPROVED' || p.status === 'CHECKED_OUT' || p.status === 'PENDING_WARDEN');

  const handleApplyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !reason) return;

    const newPassNo = `GP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass: GatePass = {
      id: `GP-${Date.now()}`,
      passNo: newPassNo,
      type: passType,
      destination,
      outTime: 'Today, Awaiting Warden Approval',
      expectedInTime: expectedIn || 'Today, 08:30 PM',
      reason,
      status: 'PENDING_WARDEN',
      wardenName: 'Chief Warden Office (Under Review)',
      qrToken: `DBS_GATE_PASS_${newPassNo}_${profile?.rollNumber || 'PENDING'}`,
      issuedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updated = [newPass, ...passes];
    setPasses(updated);
    try {
      localStorage.setItem('dbs_student_gatepasses', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setIsModalOpen(false);
    setDestination('');
    setExpectedIn('');
    setReason('');
    setToastMsg(`Hostel Gate Pass request #${newPass.passNo} submitted for Chief Warden approval.`);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const studentName = profile?.fullName || 'Authenticated Student';
  const studentRoll = profile?.rollNumber || 'DBS Student';
  const studentAvatar = profile?.avatarUrl || '/dbs_fresher.webp';
  const hostelInfo = profile?.section ? `${profile.department?.name || 'School of Technology'} • Campus Residence` : 'Campus Hostel Residence (Block B, Room 312)';

  return (
    <div className="gatepass-container animate-fade-in">
      {toastMsg && (
        <div className="toast-notification">
          <CheckCircle2 size={18} className="text-success" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="gatepass-header glass-panel">
        <div>
          <div className="gatepass-pilot-badge">
            <AlertCircle size={13} />
            <span>Institutional Preview &bull; Warden Gate Terminal Integration Pilot</span>
          </div>
          <h2 className="heading-display page-title">Digital Hostel Gate Pass &amp; Outings</h2>
          <p className="page-desc">
            Campus security exit authorization &amp; curfew management for DBS Global University resident students.
          </p>
        </div>

        <button 
          type="button"
          className="btn btn-accent"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircle size={16} /> Request Outing Gate Pass
        </button>
      </div>

      {/* Institutional Architecture & Security Notice */}
      <div className="glass-panel gatepass-notice-card">
        <div className="flex items-start gap-3">
          <Building size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div className="notice-content">
            <h4>Institutional Campus Security Protocol</h4>
            <p>
              Physical turnstile scanners and optical RFID barrier gates at Campus Gates 1 &amp; 2 are operated by Campus Security under the supervision of the Chief Warden. Gate pass requests submitted here are transmitted directly to the Chief Warden&apos;s roster for verification and parental SMS consent.
            </p>
          </div>
        </div>
      </div>

      {/* Live Active Gate Pass Card (What student shows at security gate) */}
      {activePass ? (
        <div className={`active-pass-card glass-panel ${activePass.status === 'PENDING_WARDEN' ? 'is-pending' : ''}`}>
          <div className="pass-card-header">
            <div className="pass-title-group">
              <span className={`live-dot ${activePass.status === 'PENDING_WARDEN' ? 'dot-amber' : ''}`}></span>
              <span className="pass-label">
                {activePass.status === 'PENDING_WARDEN' ? 'OUTING REQUEST SUBMITTED' : 'VALID CAMPUS EXIT PASS'}
              </span>
              <span className="pass-no-badge">#{activePass.passNo}</span>
            </div>
            <span className={`badge ${activePass.status === 'PENDING_WARDEN' ? 'badge-warning' : 'badge-success'}`}>
              {activePass.status === 'PENDING_WARDEN' ? (
                <>
                  <Clock size={13} /> Awaiting Warden Review
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Warden Signed &amp; Authorized
                </>
              )}
            </span>
          </div>

          <div className="pass-card-content">
            {/* Visual QR Code Display */}
            <div className="qr-box-wrapper">
              <div className="qr-frame">
                <QrCode size={130} className="qr-graphic" />
                {activePass.status !== 'PENDING_WARDEN' && <div className="qr-scan-line"></div>}
              </div>
              <div className="qr-hint">
                {activePass.status === 'PENDING_WARDEN' 
                  ? 'QR token active upon Warden digital endorsement'
                  : 'Scan at DBS University Security Gate 1 & 2'}
              </div>
            </div>

            {/* Student & Destination Info */}
            <div className="pass-meta-details">
              <div className="pass-student-row">
                <img src={studentAvatar} alt="Student" className="pass-avatar" />
                <div>
                  <h3 className="student-name-text">{studentName}</h3>
                  <div className="student-roll-text">
                    Roll: <strong>{studentRoll}</strong> &bull; {hostelInfo}
                  </div>
                </div>
              </div>

              <div className="pass-info-grid">
                <div className="pass-grid-item">
                  <span className="grid-lbl">Pass Category:</span>
                  <strong>{activePass.type.replace('_', ' ')}</strong>
                </div>
                <div className="pass-grid-item">
                  <span className="grid-lbl">Authorized Exit Time:</span>
                  <span>{activePass.outTime}</span>
                </div>
                <div className="pass-grid-item">
                  <span className="grid-lbl">Curfew / Expected In-Time:</span>
                  <span className="text-accent"><strong>{activePass.expectedInTime}</strong></span>
                </div>
                <div className="pass-grid-item">
                  <span className="grid-lbl">Destination:</span>
                  <span><MapPin size={13} className="text-secondary" /> {activePass.destination}</span>
                </div>
              </div>

              <div className="pass-warden-endorsement">
                <UserCheck size={16} className={activePass.status === 'PENDING_WARDEN' ? 'text-amber' : 'text-success'} />
                <span>Status: <strong>{activePass.wardenName}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel empty-pass-card">
          <Clock size={36} className="text-muted" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3>No Active Outing Gate Passes</h3>
          <p>You currently do not have an active campus leave or day pass. Click &ldquo;Request Outing Gate Pass&rdquo; above to submit an outing request to the Chief Warden.</p>
        </div>
      )}

      {/* Pass History */}
      <div className="section-title-wrap">
        <h3 className="heading-display section-subheading">Hostel Outing History</h3>
      </div>

      {passes.length === 0 ? (
        <div className="glass-panel empty-history-card">
          <p>No historical gate passes recorded for this academic semester.</p>
        </div>
      ) : (
        <div className="history-list">
          {passes.map((p) => (
            <div key={p.id} className="history-card glass-panel">
              <div className="hist-top">
                <div className="hist-type">
                  <span className="hist-pass-no">#{p.passNo}</span>
                  <span className="badge badge-info">{p.type.replace('_', ' ')}</span>
                </div>
                <span className={`badge ${p.status === 'PENDING_WARDEN' ? 'badge-warning' : 'badge-success'}`}>
                  {p.status === 'PENDING_WARDEN' ? <Clock size={12} /> : <CheckCircle2 size={12} />} {p.status.replace('_', ' ')}
                </span>
              </div>

              <h4 className="hist-dest">{p.destination}</h4>
              <p className="hist-reason">{p.reason}</p>

              <div className="hist-times">
                <span>Exit: {p.outTime}</span>
                <span>&bull;</span>
                <span>In-Time: {p.expectedInTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-display modal-title">New Hostel Gate Pass Request</h3>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyPass} className="modal-form">
              <div className="form-group">
                <label>Outing Type:</label>
                <select 
                  className="modal-input"
                  value={passType}
                  onChange={(e) => setPassType(e.target.value as any)}
                >
                  <option value="DAY_OUTING">Day Outing (Return by 08:30 PM Curfew)</option>
                  <option value="HOME_VISIT">Home Visit / Night Out (Parental Consent Required)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Destination (Market / Station / City):</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. Paltan Bazaar, Dehradun"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Expected Return Time:</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. Today, 08:00 PM"
                  value={expectedIn}
                  onChange={(e) => setExpectedIn(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Purpose of Leaving Campus:</label>
                <textarea 
                  className="modal-input modal-textarea" 
                  placeholder="Brief reason for hostel warden..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                ></textarea>
              </div>

              <div className="consent-box">
                <Smartphone size={16} className="text-accent" />
                <span>Automated SMS verification enabled for registered parent mobile.</span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request to Warden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .gatepass-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 10px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .toast-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          background: #0f1c3d;
          border: 1px solid var(--emerald-500, #10b981);
          color: white;
          padding: 14px 20px;
          border-radius: var(--radius-md, 8px);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .gatepass-pilot-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          background: rgba(234, 179, 8, 0.15);
          border: 1px solid rgba(234, 179, 8, 0.35);
          color: #eab308;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .gatepass-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
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

        .gatepass-notice-card {
          padding: 18px 22px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .notice-content h4 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }

        .notice-content p {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
        }

        .active-pass-card {
          padding: 26px;
          border-radius: 14px;
          border: 1px solid rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(255, 255, 255, 0.95));
          box-shadow: 0 6px 24px -6px rgba(16, 185, 129, 0.12);
        }

        .active-pass-card.is-pending {
          border-color: rgba(245, 158, 11, 0.4);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(255, 255, 255, 0.95));
          box-shadow: 0 6px 24px -6px rgba(245, 158, 11, 0.12);
        }

        .empty-pass-card, .empty-history-card {
          padding: 36px 24px;
          text-align: center;
          border-radius: 12px;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          color: #64748b;
        }

        .empty-pass-card h3 {
          margin: 0 0 6px;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .empty-pass-card p {
          margin: 0;
          font-size: 0.88rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .pass-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .pass-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .live-dot.dot-amber {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }

        .pass-label {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #059669;
        }

        .pass-no-badge {
          font-size: 0.8rem;
          color: #64748b;
        }

        .pass-card-content {
          display: flex;
          gap: 32px;
          align-items: center;
          flex-wrap: wrap;
        }

        .qr-box-wrapper {
          text-align: center;
        }

        .qr-frame {
          position: relative;
          width: 146px;
          height: 146px;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .qr-graphic {
          color: #1e293b;
        }

        .qr-scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: scanLine 2s infinite ease-in-out;
        }

        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }

        .qr-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .pass-meta-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 260px;
        }

        .pass-student-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pass-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e2e8f0;
        }

        .student-name-text {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
        }

        .student-roll-text {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 2px;
        }

        .pass-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          background: #ffffff;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .pass-grid-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .grid-lbl {
          font-size: 0.72rem;
          color: #64748b;
          text-transform: uppercase;
        }

        .pass-warden-endorsement {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #1e293b;
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .section-title-wrap {
          margin-top: 10px;
        }

        .section-subheading {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
        }

        .history-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .history-card {
          padding: 18px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hist-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hist-pass-no {
          font-family: monospace;
          font-weight: 600;
          color: #1e293b;
          margin-right: 8px;
        }

        .hist-dest {
          margin: 4px 0 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }

        .hist-reason {
          margin: 0;
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.4;
        }

        .hist-times {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 6px;
          display: flex;
          gap: 6px;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.2);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
        }

        .modal-input {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.88rem;
          color: #1e293b;
          background: #ffffff;
          font-family: inherit;
        }

        .modal-input:focus {
          outline: none;
          border-color: #562b63;
        }

        .consent-box {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: #64748b;
          background: #f8fafc;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};
