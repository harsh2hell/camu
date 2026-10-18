import { useState } from 'react';
import { 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  PlusCircle, 
  CheckCircle2, 
  X,
  Smartphone
} from 'lucide-react';
import { MOCK_GATE_PASSES, CURRENT_STUDENT, type GatePass } from '../data/mockData';

export const HostelGatePassView: React.FC = () => {
  const [passes, setPasses] = useState<GatePass[]>(MOCK_GATE_PASSES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [passType, setPassType] = useState<'DAY_OUTING' | 'HOME_VISIT'>('DAY_OUTING');
  const [destination, setDestination] = useState('');
  const [expectedIn, setExpectedIn] = useState('');
  const [reason, setReason] = useState('');

  const activePass = passes.find(p => p.status === 'APPROVED' || p.status === 'CHECKED_OUT');

  const handleApplyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !reason) return;

    const newPass: GatePass = {
      id: `GP-${Math.floor(10 + Math.random() * 90)}`,
      passNo: `GP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      type: passType,
      destination,
      outTime: 'Today, Just Now',
      expectedInTime: expectedIn || 'Today, 08:30 PM',
      reason,
      status: 'APPROVED',
      wardenName: 'Chief Warden: Mr. S.K. Joshi (Auto-Approved for Day Pass)',
      qrToken: `DBS_GATE_PASS_SECURE_${Math.random()}`,
      issuedDate: 'Today',
    };

    setPasses([newPass, ...passes]);
    setIsModalOpen(false);
    setDestination('');
    setExpectedIn('');
    setReason('');
    setToastMsg(`Hostel Gate Pass #${newPass.passNo} issued! Ready for Main Security Gate scan.`);
    setTimeout(() => setToastMsg(null), 4500);
  };

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
          <h2 className="heading-display page-title">Digital Hostel Gate Pass & Outings</h2>
          <p className="page-desc">
            Encrypted QR gate pass system for DBS Global University Campus Security & Warden Approvals.
          </p>
        </div>

        <button 
          className="btn btn-accent"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircle size={16} /> Request Outing Gate Pass
        </button>
      </div>

      {/* Live Active Gate Pass Card (What student shows at security gate) */}
      {activePass && (
        <div className="active-pass-card glass-panel">
          <div className="pass-card-header">
            <div className="pass-title-group">
              <span className="live-dot"></span>
              <span className="pass-label">VALID CAMPUS EXIT PASS</span>
              <span className="pass-no-badge">#{activePass.passNo}</span>
            </div>
            <span className="badge badge-success">
              <ShieldCheck size={14} /> Warden Signed & Authorized
            </span>
          </div>

          <div className="pass-card-content">
            {/* Visual QR Code Display */}
            <div className="qr-box-wrapper">
              <div className="qr-frame">
                <QrCode size={130} className="qr-graphic" />
                <div className="qr-scan-line"></div>
              </div>
              <div className="qr-hint">Scan at DBS University Security Gate 1 & 2</div>
            </div>

            {/* Student & Destination Info */}
            <div className="pass-meta-details">
              <div className="pass-student-row">
                <img src={CURRENT_STUDENT.avatarUrl} alt="Student" className="pass-avatar" />
                <div>
                  <h3 className="student-name-text">{CURRENT_STUDENT.name}</h3>
                  <div className="student-roll-text">
                    Roll: <strong>{CURRENT_STUDENT.rollNo}</strong> &bull; Boys Hostel Block B (Room 312)
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
                <ShieldCheck size={16} className="text-success" />
                <span>Digitally endorsed by: <strong>{activePass.wardenName}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pass History */}
      <div className="section-title-wrap">
        <h3 className="heading-display section-subheading">Hostel Outing History</h3>
      </div>

      <div className="history-list">
        {passes.map(p => (
          <div key={p.id} className="history-card glass-panel">
            <div className="hist-top">
              <div className="hist-type">
                <span className="hist-pass-no">#{p.passNo}</span>
                <span className="badge badge-info">{p.type.replace('_', ' ')}</span>
              </div>
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> {p.status}
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

      {/* Apply Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3 className="heading-display modal-title">New Hostel Gate Pass Request</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
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
                  <option value="HOME_VISIT">Home Visit / Night Out (Parent Consent Required)</option>
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
                  Generate Instant Gate Pass
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
          border: 1px solid var(--emerald-500);
          color: white;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .gatepass-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .active-pass-card {
          padding: 26px;
          border: 1px solid rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(11, 19, 41, 0.85));
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

        .pass-label {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--emerald-400);
        }

        .pass-no-badge {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .pass-card-content {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 28px;
          align-items: center;
        }

        .qr-box-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.35);
          padding: 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .qr-frame {
          position: relative;
          color: var(--emerald-400);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--emerald-400);
          box-shadow: 0 0 10px var(--emerald-400);
          animation: scanLine 2s infinite ease-in-out alternate;
        }

        @keyframes scanLine {
          from { top: 0; }
          to { top: 100%; }
        }

        .qr-hint {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-align: center;
        }

        .pass-student-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }

        .pass-avatar {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
          border: 2px solid var(--emerald-500);
          object-fit: cover;
        }

        .student-name-text {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .student-roll-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .pass-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          background: rgba(0, 0, 0, 0.25);
          padding: 16px;
          border-radius: var(--radius-md);
          margin-bottom: 16px;
        }

        .pass-grid-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 0.85rem;
        }

        .grid-lbl {
          font-size: 0.72rem;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .pass-warden-endorsement {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #a7f3d0;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-card {
          padding: 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .hist-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hist-type {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hist-pass-no {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--amber-400);
        }

        .hist-dest {
          font-size: 1.05rem;
          font-weight: 700;
        }

        .hist-reason {
          font-size: 0.825rem;
          color: var(--text-secondary);
        }

        .hist-times {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          gap: 8px;
        }

        .consent-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.1);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          color: var(--amber-400);
        }

        @media (max-width: 768px) {
          .pass-card-content {
            grid-template-columns: 1fr;
          }
          .pass-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
