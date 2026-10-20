import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  RotateCw, 
  Lock, 
  Users, 
  CheckCircle2, 
  Clock, 
  Maximize2, 
  Minimize2, 
  AlertCircle, 
  Loader2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { attendanceApi } from '../api/attendance';
import type { QrTokenResponseDTO, QrSessionStatusDTO } from '../../server/src/types/attendance';

interface FacultyQrModalProps {
  sessionId: string;
  courseCode: string;
  courseTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionFinalized: (stats: { presentCount: number; absentCount: number }) => void;
}

export const FacultyQrModal: React.FC<FacultyQrModalProps> = ({
  sessionId,
  courseCode,
  courseTitle,
  isOpen,
  onClose,
  onSessionFinalized,
}) => {
  const [, setTokenData] = useState<QrTokenResponseDTO | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<QrSessionStatusDTO | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [closureSuccessMsg, setClosureSuccessMsg] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Generate or rotate QR token
  const loadOrRotateToken = useCallback(async () => {
    if (isLocked) return;
    try {
      setIsRotating(true);
      setErrorMsg(null);
      const res = await attendanceApi.generateQrToken(sessionId);
      setTokenData(res);
      setSecondsRemaining(res.expiresInSeconds || 60);

      // Generate visual QR code canvas data URL
      const dataUrl = await QRCode.toDataURL(res.token, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.message?.toLowerCase().includes('locked')) {
        setIsLocked(true);
      } else {
        setErrorMsg(err.message || 'Failed to generate QR token.');
      }
    } finally {
      setIsRotating(false);
    }
  }, [sessionId, isLocked]);

  // 2. Poll live session check-in status
  const fetchStatus = useCallback(async () => {
    try {
      const status = await attendanceApi.getQrStatus(sessionId);
      setSessionStatus(status);
      if (status.isLocked) {
        setIsLocked(true);
      }
    } catch (err: any) {
      console.warn('Live QR status poll error:', err);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    if (!isOpen) return;
    loadOrRotateToken();
    fetchStatus();

    // Start live polling every 3 seconds for student check-ins
    pollingRef.current = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, loadOrRotateToken, fetchStatus]);

  // Countdown clock & auto-rotation
  useEffect(() => {
    if (!isOpen || isLocked) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Token expired -> automatically rotate
          loadOrRotateToken();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isLocked, loadOrRotateToken]);

  // Handle session closure
  const handleCloseAttendance = async () => {
    if (isClosing || isLocked) return;
    const confirm = window.confirm(
      'Are you sure you want to close attendance?\n\nThis will permanently finalize the session. All enrolled students who did not check in will be marked ABSENT per institutional policy.'
    );
    if (!confirm) return;

    try {
      setIsClosing(true);
      setErrorMsg(null);
      const res = await attendanceApi.closeSession(sessionId);
      setIsLocked(true);
      setClosureSuccessMsg(
        `Session finalized and locked. ${res.presentCount} present, ${res.absentCount} marked absent.`
      );
      // Immediately refresh live status to reflect finalized counts
      await fetchStatus();
      onSessionFinalized({ presentCount: res.presentCount, absentCount: res.absentCount });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close attendance session.');
    } finally {
      setIsClosing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`qr-modal-overlay ${isFullScreen ? 'is-fullscreen' : ''}`}>
      <div className="qr-modal-container glass-panel">
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-header-left">
            <div className="qr-badge">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Cryptographic QR Roll Call &bull; {courseCode}</span>
            </div>
            <h2 className="qr-modal-title">{courseTitle}</h2>
          </div>

          <div className="qr-header-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Exit Fullscreen' : 'Classroom Fullscreen Mode'}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              title="Close Dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status / Error Alerts */}
        {errorMsg && (
          <div className="qr-alert alert-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {closureSuccessMsg && (
          <div className="qr-alert alert-success">
            <CheckCircle2 size={16} />
            <span>{closureSuccessMsg}</span>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="qr-modal-body">
          {/* Left: QR Display Card */}
          <div className="qr-display-section">
            <div className={`qr-canvas-wrapper ${isLocked ? 'is-disabled' : ''}`}>
              {isRotating && !qrDataUrl && (
                <div className="qr-loader">
                  <Loader2 size={36} className="animate-spin text-blue" />
                  <span>Generating Secure Token...</span>
                </div>
              )}

              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`Attendance QR code for ${courseCode}`}
                  className="qr-image"
                />
              )}

              {isLocked && (
                <div className="qr-locked-overlay">
                  <Lock size={44} className="text-danger" />
                  <span className="locked-title">Attendance Closed &amp; Locked</span>
                  <span className="locked-sub">No further scans accepted</span>
                </div>
              )}
            </div>

            {/* Token Expiry & Controls */}
            {!isLocked && (
              <div className="qr-timer-strip">
                <div className="timer-bar-wrap">
                  <div
                    className="timer-bar-fill"
                    style={{ width: `${(secondsRemaining / 60) * 100}%` }}
                  ></div>
                </div>
                <div className="timer-info-row">
                  <div className="timer-time">
                    <Clock size={14} className="text-blue" />
                    <span>Token expires in: <strong>{secondsRemaining}s</strong></span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs rotate-btn"
                    onClick={loadOrRotateToken}
                    disabled={isRotating}
                  >
                    <RotateCw size={13} className={isRotating ? 'animate-spin' : ''} />
                    <span>Rotate Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* Close Session Action */}
            <div className="qr-actions-row">
              {!isLocked ? (
                <button
                  type="button"
                  className="btn btn-danger close-attendance-btn"
                  onClick={handleCloseAttendance}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Finalizing...
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> Close Attendance
                    </>
                  )}
                </button>
              ) : (
                <div className="finalized-pill">
                  <Check size={16} /> Session Finalized in Central Database
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Roster & Progress Stream */}
          <div className="qr-roster-section">
            <div className="roster-header">
              <div className="roster-title-wrap">
                <Users size={16} className="text-blue" />
                <h3>Live Check-In Progress</h3>
              </div>
              <div className="roster-counts-pill">
                <span className="count-present">{sessionStatus?.presentCount || 0} Present</span>
                <span className="count-separator">/</span>
                <span className="count-total">{sessionStatus?.totalEnrolled || 0} Enrolled</span>
              </div>
            </div>

            {/* Live Student List */}
            <div className="roster-student-list">
              {sessionStatus?.students && sessionStatus.students.length > 0 ? (
                sessionStatus.students.map((student) => {
                  const isPresent = student.status === 'PRESENT';
                  const isAbsent = student.status === 'ABSENT';
                  const isOD = student.status === 'ON_DUTY';

                  return (
                    <div
                      key={student.studentUserId}
                      className={`roster-student-item ${
                        isPresent ? 'item-present' : isAbsent ? 'item-absent' : ''
                      }`}
                    >
                      <div className="student-info">
                        <span className="student-name">{student.fullName}</span>
                        <span className="student-roll">{student.rollNumber}</span>
                      </div>
                      <div className="student-status-badge">
                        {isPresent ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} /> Present
                          </span>
                        ) : isAbsent ? (
                          <span className="badge badge-danger">Absent</span>
                        ) : isOD ? (
                          <span className="badge badge-warning">On-Duty</span>
                        ) : (
                          <span className="badge badge-muted">Pending Scan</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="roster-empty">
                  <Loader2 size={20} className="animate-spin text-muted" />
                  <span>Loading enrolled roster...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .qr-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 9, 23, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .qr-modal-overlay.is-fullscreen {
          padding: 0;
        }

        .qr-modal-container {
          background: #0b1329;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          width: 100%;
          max-width: 920px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .is-fullscreen .qr-modal-container {
          max-width: 100%;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
          border: none;
        }

        .qr-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .qr-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.12);
          padding: 4px 10px;
          border-radius: 9999px;
          margin-bottom: 4px;
        }

        .qr-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .qr-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qr-modal-body {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 24px;
          padding: 24px;
        }

        .qr-display-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .qr-canvas-wrapper {
          position: relative;
          background: #ffffff;
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 320px;
          min-height: 320px;
        }

        .qr-image {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }

        .qr-canvas-wrapper.is-disabled .qr-image {
          filter: blur(4px) grayscale(100%);
          opacity: 0.3;
        }

        .qr-locked-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.85);
          border-radius: 16px;
          color: #f87171;
          text-align: center;
          padding: 20px;
          gap: 8px;
        }

        .locked-title {
          font-size: 1rem;
          font-weight: 800;
          color: #ffffff;
        }

        .locked-sub {
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .qr-timer-strip {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .timer-bar-wrap {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          overflow: hidden;
        }

        .timer-bar-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 1s linear;
        }

        .timer-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #cbd5e1;
        }

        .timer-time {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rotate-btn {
          font-size: 0.75rem;
          padding: 3px 8px;
          color: #93c5fd;
        }

        .qr-actions-row {
          width: 100%;
        }

        .close-attendance-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          background: #dc2626;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        }

        .close-attendance-btn:hover {
          background: #b91c1c;
        }

        .finalized-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          color: #34d399;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: center;
        }

        .qr-roster-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 480px;
        }

        .roster-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 10px;
        }

        .roster-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .roster-title-wrap h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }

        .roster-counts-pill {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .count-present {
          color: #10b981;
        }

        .count-separator {
          color: #64748b;
          margin: 0 4px;
        }

        .count-total {
          color: #94a3b8;
        }

        .roster-student-list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 4px;
        }

        .roster-student-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          transition: background-color 0.2s;
        }

        .item-present {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.25);
        }

        .student-info {
          display: flex;
          flex-direction: column;
        }

        .student-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #f8fafc;
        }

        .student-roll {
          font-size: 0.72rem;
          color: #94a3b8;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .badge-success {
          background: #10b981;
          color: #042f2e;
        }

        .badge-danger {
          background: #ef4444;
          color: #ffffff;
        }

        .badge-warning {
          background: #f59e0b;
          color: #451a03;
        }

        .badge-muted {
          background: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
        }

        .qr-alert {
          margin: 12px 24px 0;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        @media (max-width: 840px) {
          .qr-modal-body {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
