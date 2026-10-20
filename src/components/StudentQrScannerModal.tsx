import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldCheck,
  Keyboard,
  ArrowRight
} from 'lucide-react';
import { attendanceApi } from '../api/attendance';
import type { QrCheckInResultDTO } from '../../server/src/types/attendance';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: QrCheckInResultDTO) => void;
  expectedCourseCode?: string;
}

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expectedCourseCode,
}) => {
  const [scannerState, setScannerState] = useState<'idle' | 'starting' | 'scanning' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<QrCheckInResultDTO | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const scannerContainerId = 'student-qr-reader';

  // Stop camera stream safely
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping html5-qrcode scanner:', err);
      } finally {
        isScanningRef.current = false;
      }
    }
  }, []);

  // Submit token to backend
  const handleTokenSubmit = useCallback(async (token: string) => {
    if (!token || !token.trim()) {
      setErrorMessage('Please enter or scan a valid QR token.');
      return;
    }

    setScannerState('submitting');
    setErrorMessage(null);

    // Stop camera before backend check
    await stopScanner();

    try {
      const result = await attendanceApi.checkInWithQr(token.trim());
      setSuccessResult(result);
      setScannerState('success');
      onSuccess(result);
    } catch (err: any) {
      setScannerState('error');
      if (err?.statusCode === 409 || err?.message?.toLowerCase().includes('locked')) {
        setErrorMessage('This attendance session is locked and closed. Further check-ins are not accepted.');
      } else if (err?.message?.toLowerCase().includes('expired')) {
        setErrorMessage('This QR token has expired. Please ask your instructor for a refreshed QR code.');
      } else if (err?.message?.toLowerCase().includes('not enrolled')) {
        setErrorMessage('Enrollment verification failed: You are not enrolled in this course offering.');
      } else {
        setErrorMessage(err.message || 'Check-in failed. Please verify your token and try again.');
      }
    }
  }, [stopScanner, onSuccess]);

  // Start in-app camera scanner
  const startScanner = useCallback(async () => {
    setScannerState('starting');
    setErrorMessage(null);
    setPermissionDenied(false);

    try {
      // Ensure any existing scanner is stopped
      await stopScanner();

      const qrCodeScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrCodeScanner;

      await qrCodeScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          // Scanned successfully!
          await handleTokenSubmit(decodedText);
        },
        () => {
          // Ignored per-frame decode errors
        }
      );

      isScanningRef.current = true;
      setScannerState('scanning');
    } catch (err: any) {
      console.warn('Camera scanner initialization failed:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('notallowed')) {
        setPermissionDenied(true);
        setErrorMessage('Camera access denied. Please grant camera permission in your browser settings to scan attendance QR codes.');
      } else if (errMsg.toLowerCase().includes('notfound') || errMsg.toLowerCase().includes('device')) {
        setErrorMessage('No camera device detected on this device. You can paste the QR token below.');
        setShowManualInput(true);
      } else {
        setErrorMessage('Camera could not be started. You can use direct token entry below.');
        setShowManualInput(true);
      }
      setScannerState('error');
    }
  }, [stopScanner, handleTokenSubmit]);

  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      setErrorMessage(null);
      setScannerState('idle');
      // Delay slightly for DOM mount of container element
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal glass-panel animate-fade-in">
        {/* Header */}
        <div className="scanner-header">
          <div className="scanner-header-info">
            <div className="scanner-badge">
              <Camera size={13} className="text-blue" />
              <span>In-App QR Attendance Check-In</span>
            </div>
            <h3 className="scanner-title">
              {expectedCourseCode ? `Mark Attendance &bull; ${expectedCourseCode}` : 'Scan Class Attendance QR'}
            </h3>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            title="Close Scanner"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="scanner-body">
          {/* Scanner View Area */}
          {scannerState !== 'success' && (
            <div className="scanner-viewport-wrap">
              <div id={scannerContainerId} className="scanner-container"></div>

              {scannerState === 'starting' && (
                <div className="scanner-overlay-msg">
                  <Loader2 size={32} className="animate-spin text-blue" />
                  <span>Requesting Camera Access...</span>
                </div>
              )}

              {scannerState === 'submitting' && (
                <div className="scanner-overlay-msg">
                  <Loader2 size={36} className="animate-spin text-emerald" />
                  <span className="font-bold">Verifying Attendance Record...</span>
                </div>
              )}
            </div>
          )}

          {/* Success State View */}
          {scannerState === 'success' && successResult && (
            <div className="scanner-success-card">
              <div className="success-icon-wrap">
                <CheckCircle2 size={54} className="text-emerald" />
              </div>
              <h4 className="success-heading">Attendance Confirmed!</h4>
              <p className="success-sub">
                {successResult.isAlreadyMarked
                  ? 'Your attendance was previously marked for this session.'
                  : 'Your attendance record has been verified and persisted to the central academic database.'}
              </p>

              <div className="success-details-box">
                <div className="detail-row">
                  <span className="detail-label">Course:</span>
                  <span className="detail-val"><strong>{successResult.courseCode}</strong> &bull; {successResult.courseTitle}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Instructor:</span>
                  <span className="detail-val">{successResult.facultyName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-val status-badge-success">PRESENT (Verified)</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary done-btn"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}

          {/* Error Alert View */}
          {errorMessage && scannerState === 'error' && (
            <div className="scanner-error-card">
              <AlertCircle size={20} className="text-danger flex-shrink-0" />
              <div className="error-text-wrap">
                <p className="error-msg">{errorMessage}</p>
                {permissionDenied && (
                  <p className="error-hint">
                    How to enable: Tap the lock/tune icon beside the browser URL bar &rarr; Permissions &rarr; Allow Camera &rarr; Reload.
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm retry-btn"
                onClick={startScanner}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Fallback Manual Token Entry (for accessibility, desktop test walkthroughs, or devices without camera) */}
          {scannerState !== 'success' && (
            <div className="manual-token-section">
              <button
                type="button"
                className="toggle-manual-btn"
                onClick={() => setShowManualInput(!showManualInput)}
              >
                <Keyboard size={14} />
                <span>{showManualInput ? 'Hide Token Entry' : 'Camera not working? Enter Token Directly'}</span>
              </button>

              {showManualInput && (
                <div className="manual-token-form">
                  <input
                    type="text"
                    className="manual-input"
                    placeholder="Paste QR token payload here..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    disabled={scannerState === 'submitting'}
                  />
                  <button
                    type="button"
                    className="btn btn-primary submit-manual-btn"
                    onClick={() => handleTokenSubmit(manualToken)}
                    disabled={scannerState === 'submitting' || !manualToken.trim()}
                  >
                    {scannerState === 'submitting' ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        Verify <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="scanner-footer">
          <div className="security-notice">
            <ShieldCheck size={13} className="text-blue" />
            <span>Server-side cryptographic HMAC-SHA256 token verification active.</span>
          </div>
        </div>
      </div>

      <style>{`
        .qr-scanner-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .qr-scanner-modal {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
        }

        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .scanner-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.1);
          padding: 3px 8px;
          border-radius: 9999px;
          margin-bottom: 4px;
        }

        .scanner-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .scanner-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scanner-viewport-wrap {
          position: relative;
          width: 100%;
          min-height: 280px;
          background: #020617;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
        }

        .scanner-container {
          width: 100%;
          height: 100%;
        }

        .scanner-container video {
          border-radius: 12px;
          object-fit: cover;
        }

        .scanner-overlay-msg {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.9);
          gap: 12px;
          color: #f1f5f9;
          font-size: 0.85rem;
        }

        .scanner-success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px 10px;
        }

        .success-icon-wrap {
          margin-bottom: 12px;
        }

        .success-heading {
          font-size: 1.3rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .success-sub {
          font-size: 0.84rem;
          color: #94a3b8;
          margin: 0 0 16px 0;
          max-width: 380px;
        }

        .success-details-box {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
          text-align: left;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
        }

        .detail-label {
          color: #64748b;
        }

        .detail-val {
          color: #f8fafc;
        }

        .status-badge-success {
          color: #34d399;
          font-weight: 700;
        }

        .done-btn {
          width: 100%;
          padding: 10px;
          font-weight: 700;
          background: #2563eb;
          color: #fff;
          border-radius: 10px;
        }

        .scanner-error-card {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.82rem;
          color: #fca5a5;
        }

        .error-text-wrap {
          flex: 1;
        }

        .error-msg {
          margin: 0 0 4px 0;
          font-weight: 600;
        }

        .error-hint {
          margin: 0;
          font-size: 0.74rem;
          color: #f87171;
          opacity: 0.85;
        }

        .retry-btn {
          padding: 4px 10px;
          font-size: 0.75rem;
        }

        .manual-token-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 12px;
        }

        .toggle-manual-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.78rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
          width: fit-content;
        }

        .toggle-manual-btn:hover {
          color: #38bdf8;
        }

        .manual-token-form {
          display: flex;
          gap: 8px;
        }

        .manual-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.8rem;
          color: #fff;
          outline: none;
        }

        .submit-manual-btn {
          padding: 8px 14px;
          font-size: 0.8rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .scanner-footer {
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.25);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};
