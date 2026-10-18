import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  ShieldCheck, 
  User, 
  KeyRound, 
  MapPin,
  Clock,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { authApi, type UserSession } from '../api/auth';

interface CamuLoginPageProps {
  portalMode: 'student' | 'teacher';
  onTogglePortal: (mode: 'student' | 'teacher') => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const CamuLoginPage: React.FC<CamuLoginPageProps> = ({ 
  portalMode, 
  onTogglePortal, 
  onLoginSuccess 
}) => {
  const isStudent = portalMode === 'student';

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState(isStudent ? 'harsh.23cse@dbs.edu.in' : 'rajesh.sharma@dbs.edu.in');
  const [password, setPassword] = useState(isStudent ? 'DBS@2026' : 'Faculty@DBS');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration / PIN Activation (Student only)
  const [regFullName, setRegFullName] = useState('');
  const [regRollNo, setRegRollNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage(isStudent ? 'Please enter your Roll Number or Student Email.' : 'Please enter your Faculty Employee Code.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(username, password);
      // Ensure role matches the portal mode
      const adjustedSession: UserSession = {
        ...session,
        role: isStudent ? 'STUDENT' : 'FACULTY',
      };
      onLoginSuccess(adjustedSession);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authApi.loginWithGoogle();
      onLoginSuccess({ ...session, role: isStudent ? 'STUDENT' : 'FACULTY' });
    } catch (err: any) {
      setErrorMessage('Google SSO failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authApi.loginWithMicrosoft();
      onLoginSuccess({ ...session, role: isStudent ? 'STUDENT' : 'FACULTY' });
    } catch (err: any) {
      setErrorMessage('Microsoft 365 SSO failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regRollNo || !regEmail || !regPin || !regPassword) {
      setErrorMessage('Please complete all registration fields.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.registerWithPin({
        fullName: regFullName,
        rollNo: regRollNo,
        email: regEmail,
        camuPin: regPin,
        password: regPassword,
      });
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Activation failed. Please contact Registrar Office.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dbs-auth-layout">
      {/* Top Domain Switcher Ribbon */}
      <div className="domain-switcher-bar">
        <div className="current-subdomain-pill">
          <span className="live-dot-subdomain"></span>
          <span className="domain-text">
            {isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}
          </span>
          <span className="domain-scope-label">
            {isStudent ? 'Official Student & Parent Portal' : 'Faculty & Academic Administration Portal'}
          </span>
        </div>

        <button 
          type="button" 
          className="switch-portal-action-btn"
          onClick={() => {
            const nextMode = isStudent ? 'teacher' : 'student';
            onTogglePortal(nextMode);
            setUsername(nextMode === 'student' ? 'harsh.23cse@dbs.edu.in' : 'rajesh.sharma@dbs.edu.in');
            setPassword(nextMode === 'student' ? 'DBS@2026' : 'Faculty@DBS');
            setIsRegisterMode(false);
            setErrorMessage(null);
          }}
        >
          <span>Go to <strong>{isStudent ? 'teacher.dgu.in' : 'student.dgu.in'}</strong></span>
          <ExternalLink size={13} />
        </button>
      </div>

      {/* LEFT COLUMN: Campus Showcase */}
      <div className="auth-showcase-panel">
        <div 
          className="showcase-bg-image"
          style={{ backgroundImage: "url('/dbs_campus_bg.jpg')" }}
        ></div>
        <div className="showcase-gradient-overlay"></div>

        <div className="showcase-content">
          {/* Top Brand Tag */}
          <div className="showcase-top-badge">
            <div className="crest-emblem">
              <GraduationCap size={24} className="crest-gold" />
            </div>
            <div>
              <div className="showcase-uni-title">DBS GLOBAL UNIVERSITY</div>
              <div className="showcase-uni-sub">
                {isStudent ? 'Student & Parent Academic Suite' : 'Faculty & Academic Administration Suite'}
              </div>
            </div>
          </div>

          {/* Central Hero Statement */}
          <div className="showcase-hero-body">
            <span className="live-term-pill">
              <span className="pulse-dot"></span> 
              {isStudent ? 'student.dgu.in • Student Access' : 'teacher.dgu.in • Faculty Access'}
            </span>
            
            <h1 className="showcase-heading">
              {isStudent 
                ? 'Your Campus Life, Attendance & Academics at Your Fingertips.' 
                : 'Accelerate Classroom Attendance, Grading & Academic Governance.'}
            </h1>
            
            <p className="showcase-description">
              {isStudent 
                ? 'Log in to track your 75% attendance criteria, real-time timetable, exam grades, digital gate pass, and campus dues in a unified modern portal.' 
                : 'Dedicated portal for DBS professors and HODs: 1-click lecture attendance roll call, 75% defaulter warnings, internal assessment grading, and on-duty leave approvals.'}
            </p>

            {/* Feature Highlights Grid */}
            <div className="showcase-features-grid">
              {isStudent ? (
                <>
                  <div className="showcase-feature-card">
                    <BookOpen size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">75% Attendance Predictor</div>
                      <div className="feature-desc">Know how many classes you can skip/attend</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <Calendar size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">Live Dynamic Timetable</div>
                      <div className="feature-desc">Room LT-201 allocations & schedules</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <ShieldCheck size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">Encrypted Hostel Gate Pass</div>
                      <div className="feature-desc">Live security QR codes with curfew timer</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <Sparkles size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">Instant Fee Clearances</div>
                      <div className="feature-desc">1-click receipts & exam No-Dues</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="showcase-feature-card">
                    <Laptop size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">1-Click Attendance</div>
                      <div className="feature-desc">Mark entire batch present in 2 seconds</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <ShieldCheck size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">75% Defaulter Monitor</div>
                      <div className="feature-desc">Automated SMS/Email debarment warnings</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <BookOpen size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">Continuous Internal Eval</div>
                      <div className="feature-desc">Sessional 1, Mid-term & IA2 marks entry</div>
                    </div>
                  </div>
                  <div className="showcase-feature-card">
                    <Calendar size={20} className="feature-icon" />
                    <div>
                      <div className="feature-title">OD & Leave Approvals</div>
                      <div className="feature-desc">Instant verification of hackathons & sports</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Campus Location */}
          <div className="showcase-footer-strip">
            <div className="footer-info-item">
              <MapPin size={15} />
              <span>Selaqui Campus, Chakrata Road, Dehradun (UK)</span>
            </div>
            <div className="footer-info-item">
              <Clock size={15} />
              <span>DBS IT Systems: Online 99.98%</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Auth Gateway */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          {/* Form Header */}
          <div className="auth-form-header">
            <div className="subdomain-indicator-badge">
              <span className="dot-active"></span>
              <strong>{isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}</strong>
            </div>

            <h2 className="auth-main-title">
              {isRegisterMode 
                ? 'Activate Student Account' 
                : isStudent ? 'Student Sign In' : 'Faculty & Staff Sign In'}
            </h2>
            <p className="auth-subtitle">
              {isRegisterMode 
                ? 'Enter your Registrar PIN to initialize your university digital account.' 
                : isStudent 
                  ? 'Access your personal student ledger, timetable, and attendance.' 
                  : 'Faculty authentication for Dr. Rajesh Sharma and teaching staff.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="auth-alert-box">
              <span>{errorMessage}</span>
            </div>
          )}

          {!isRegisterMode ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="auth-form-fields">
              <div className="input-group">
                <label className="input-label">
                  {isStudent ? 'Student Roll Number or Email' : 'Faculty Employee Code or Email'}
                </label>
                <div className="input-container">
                  <User size={18} className="field-icon" />
                  <input
                    type="text"
                    className="text-input"
                    placeholder={isStudent ? 'e.g. DBS/23/CSE/042 or harsh.23cse@dbs.edu.in' : 'e.g. DBS-FAC-108 or rajesh.sharma@dbs.edu.in'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label className="input-label">Password</label>
                  <button 
                    type="button" 
                    className="forgot-pw-btn"
                    onClick={() => alert(`Password recovery link dispatched to your registered DBS ${isStudent ? 'Student' : 'Faculty'} email.`)}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="input-container">
                  <KeyRound size={18} className="field-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="text-input"
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-remember-row">
                <label className="checkbox-wrap">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                  />
                  <span>Keep me signed in on this workstation</span>
                </label>
              </div>

              {/* Primary Action Button */}
              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying Credentials...' : `Sign In to ${isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}`}
              </button>

              {/* Single Sign-On Divider */}
              <div className="auth-or-divider">
                <span className="or-line"></span>
                <span className="or-text">OR SIGN IN WITH UNIVERSITY SSO</span>
                <span className="or-line"></span>
              </div>

              {/* SSO Buttons */}
              <div className="sso-grid">
                <button 
                  type="button" 
                  className="sso-btn"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="sso-svg" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Google Workspace</span>
                </button>

                <button 
                  type="button" 
                  className="sso-btn"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                >
                  <svg className="sso-svg" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                    <path fill="#7fba00" d="M13 1h10v10H13z"/>
                    <path fill="#ffb900" d="M13 13h10v10H13z"/>
                  </svg>
                  <span>Microsoft 365</span>
                </button>
              </div>

              {/* Bottom Switcher */}
              {isStudent && (
                <div className="auth-bottom-switch">
                  <span>First time student? </span>
                  <button 
                    type="button" 
                    className="switch-link-btn"
                    onClick={() => setIsRegisterMode(true)}
                  >
                    Activate with Registrar PIN
                  </button>
                </div>
              )}

              {/* Subdomain Switch Callout */}
              <div className="subdomain-switch-footer-box">
                <span>Looking for the {isStudent ? 'Faculty & Staff' : 'Student'} Portal?</span>
                <button
                  type="button"
                  className="switch-inline-link"
                  onClick={() => {
                    const next = isStudent ? 'teacher' : 'student';
                    onTogglePortal(next);
                    setUsername(next === 'student' ? 'harsh.23cse@dbs.edu.in' : 'rajesh.sharma@dbs.edu.in');
                    setPassword(next === 'student' ? 'DBS@2026' : 'Faculty@DBS');
                    setErrorMessage(null);
                  }}
                >
                  Switch to {isStudent ? 'teacher.dgu.in' : 'student.dgu.in'} &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* Student PIN Activation */
            <form onSubmit={handleRegister} className="auth-form-fields">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div className="input-container">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Enter full legal name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Student Roll Number</label>
                <div className="input-container">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. DBS/23/CSE/042"
                    value={regRollNo}
                    onChange={(e) => setRegRollNo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Official University Email (@dbs.edu.in)</label>
                <div className="input-container">
                  <input
                    type="email"
                    className="text-input"
                    placeholder="student.23cse@dbs.edu.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Registrar PIN (6-Digit Code)</label>
                <div className="input-container">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. 748291"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Create Secure Password</label>
                <div className="input-container">
                  <input
                    type="password"
                    className="text-input"
                    placeholder="At least 8 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Activating...' : 'Verify PIN & Enter student.dgu.in'}
              </button>

              <div className="auth-bottom-switch" style={{ marginTop: '16px' }}>
                <span>Already have active credentials? </span>
                <button 
                  type="button" 
                  className="switch-link-btn"
                  onClick={() => setIsRegisterMode(false)}
                >
                  Back to Student Sign In
                </button>
              </div>
            </form>
          )}

          {/* Form Footer */}
          <div className="auth-card-footer">
            <span>&copy; {new Date().getFullYear()} DBS Global University &bull; {isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}</span>
            <div className="footer-links-row">
              <a href="#help" onClick={(e) => { e.preventDefault(); alert('IT Helpdesk: it.support@dbs.edu.in'); }}>IT Support</a>
              <span>&bull;</span>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('DBS Data Privacy Standards 2026'); }}>Privacy</a>
              <span>&bull;</span>
              <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Academic IT Terms of Service'); }}>Terms</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbs-auth-layout {
          position: relative;
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          min-height: 100vh;
          width: 100vw;
          background: #ffffff;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* Top Subdomain Switcher Ribbon */
        .domain-switcher-bar {
          position: absolute;
          top: 14px;
          left: 20px;
          right: 20px;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
        }

        .current-subdomain-pill {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 6px 14px;
          border-radius: 9999px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }

        .live-dot-subdomain {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isStudent ? '#38bdf8' : '#f59e0b'};
          box-shadow: 0 0 8px ${isStudent ? '#38bdf8' : '#f59e0b'};
        }

        .domain-text {
          font-size: 0.85rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.02em;
        }

        .domain-scope-label {
          font-size: 0.72rem;
          color: #94a3b8;
          padding-left: 6px;
          border-left: 1px solid rgba(255, 255, 255, 0.2);
        }

        .switch-portal-action-btn {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #1e293b;
          padding: 7px 16px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          transition: all 0.15s ease;
        }

        .switch-portal-action-btn:hover {
          background: #f8fafc;
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
        }

        /* Showcase Panel (Left) */
        .auth-showcase-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 64px 56px 44px;
          color: #ffffff;
          overflow: hidden;
        }

        .showcase-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 1;
        }

        .showcase-gradient-overlay {
          position: absolute;
          inset: 0;
          background: ${isStudent 
            ? 'linear-gradient(135deg, rgba(6, 11, 25, 0.94) 0%, rgba(15, 28, 65, 0.84) 50%, rgba(10, 25, 45, 0.9) 100%)' 
            : 'linear-gradient(135deg, rgba(20, 10, 30, 0.94) 0%, rgba(45, 20, 50, 0.85) 50%, rgba(15, 15, 35, 0.92) 100%)'};
          z-index: 2;
        }

        .showcase-content {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .showcase-top-badge {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .crest-emblem {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 1.5px solid rgba(245, 158, 11, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
        }

        .crest-gold {
          color: #fbbf24;
        }

        .showcase-uni-title {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
        }

        .showcase-uni-sub {
          font-size: 0.75rem;
          color: #cbd5e1;
        }

        .showcase-hero-body {
          margin: auto 0;
          max-width: 580px;
          padding: 20px 0;
        }

        .live-term-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #fde047;
          margin-bottom: 20px;
        }

        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fde047;
          box-shadow: 0 0 8px #fde047;
          animation: pulseAnim 1.6s infinite;
        }

        @keyframes pulseAnim {
          0% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0.5; transform: scale(0.9); }
        }

        .showcase-heading {
          font-size: 2.3rem;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .showcase-description {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 30px;
        }

        .showcase-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .showcase-feature-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .feature-icon {
          color: ${isStudent ? '#38bdf8' : '#fbbf24'};
          margin-top: 2px;
          flex-shrink: 0;
        }

        .feature-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .feature-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .showcase-footer-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #94a3b8;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .footer-info-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Form Panel (Right) */
        .auth-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 70px 40px 40px;
          background: #f8fafc;
          overflow-y: auto;
        }

        .auth-form-wrapper {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          padding: 38px 40px;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
        }

        .subdomain-indicator-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${isStudent ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
          color: ${isStudent ? '#1d4ed8' : '#b45309'};
          border: 1px solid ${isStudent ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)'};
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.78rem;
          margin-bottom: 12px;
        }

        .dot-active {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        .auth-main-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }

        .auth-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.4;
          margin-bottom: 22px;
        }

        .auth-alert-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 16px;
        }

        .auth-form-fields {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: 0.825rem;
          font-weight: 600;
          color: #334155;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-pw-btn {
          font-size: 0.78rem;
          color: #2563eb;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          pointer-events: none;
        }

        .text-input {
          width: 100%;
          height: 44px;
          padding: 10px 14px 10px 40px;
          border: 1.5px solid #cbd5e1;
          border-radius: 9px;
          font-size: 0.88rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .text-input:focus {
          border-color: ${isStudent ? '#2563eb' : '#d97706'};
          box-shadow: 0 0 0 3px ${isStudent ? 'rgba(37, 99, 235, 0.12)' : 'rgba(217, 119, 6, 0.12)'};
        }

        .password-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .form-remember-row {
          display: flex;
          align-items: center;
          font-size: 0.8rem;
          color: #64748b;
        }

        .checkbox-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .auth-submit-btn {
          width: 100%;
          height: 46px;
          background: ${isStudent 
            ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' 
            : 'linear-gradient(135deg, #b45309, #d97706)'};
          color: #ffffff;
          border: none;
          border-radius: 9px;
          font-size: 0.925rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: ${isStudent 
            ? '0 4px 14px rgba(37, 99, 235, 0.28)' 
            : '0 4px 14px rgba(217, 119, 6, 0.28)'};
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          margin-top: 4px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .auth-or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0;
        }

        .or-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .or-text {
          font-size: 0.68rem;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .sso-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .sso-btn {
          height: 42px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .sso-svg {
          width: 17px;
          height: 17px;
        }

        .auth-bottom-switch {
          text-align: center;
          font-size: 0.825rem;
          color: #64748b;
          margin-top: 6px;
        }

        .switch-link-btn {
          color: #2563eb;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
        }

        .subdomain-switch-footer-box {
          margin-top: 14px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: #64748b;
        }

        .switch-inline-link {
          color: ${isStudent ? '#b45309' : '#1d4ed8'};
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
        }

        .switch-inline-link:hover {
          text-decoration: underline;
        }

        .auth-card-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          text-align: center;
          font-size: 0.72rem;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .footer-links-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .footer-links-row a {
          color: #64748b;
          text-decoration: none;
        }

        @media (max-width: 1024px) {
          .dbs-auth-layout {
            grid-template-columns: 1fr;
          }
          .auth-showcase-panel {
            display: none;
          }
          .domain-switcher-bar {
            position: static;
            padding: 16px 20px 0;
          }
          .auth-form-panel {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
