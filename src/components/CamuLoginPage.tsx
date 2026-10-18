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
  Clock
} from 'lucide-react';
import { authApi, type UserSession } from '../api/auth';

interface CamuLoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const CamuLoginPage: React.FC<CamuLoginPageProps> = ({ onLoginSuccess }) => {
  const [activeRole, setActiveRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration / PIN Activation
  const [regFullName, setRegFullName] = useState('');
  const [regRollNo, setRegRollNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your Roll Number or University Email.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(username, password);
      onLoginSuccess(session);
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
      onLoginSuccess(session);
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
      onLoginSuccess(session);
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

  const fillQuickStudent = () => {
    setActiveRole('STUDENT');
    setUsername('harsh.23cse@dbs.edu.in');
    setPassword('DBS@2026');
    setErrorMessage(null);
  };

  const fillQuickFaculty = () => {
    setActiveRole('FACULTY');
    setUsername('rajesh.sharma@dbs.edu.in');
    setPassword('Faculty@DBS');
    setErrorMessage(null);
  };

  return (
    <div className="dbs-auth-layout">
      {/* LEFT COLUMN: Campus Life, Identity & Live Showcase */}
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
              <GraduationCap size={22} className="crest-gold" />
            </div>
            <div>
              <div className="showcase-uni-title">DBS GLOBAL UNIVERSITY</div>
              <div className="showcase-uni-sub">Dehradun, Uttarakhand &bull; Estd. by Govt. of Uttarakhand</div>
            </div>
          </div>

          {/* Central Hero Statement */}
          <div className="showcase-hero-body">
            <span className="live-term-pill">
              <span className="pulse-dot"></span> Odd Semester 2026-27 &bull; Live Academic Term
            </span>
            <h1 className="showcase-heading">
              Empowering Minds, Shaping Global Leaders.
            </h1>
            <p className="showcase-description">
              Access your personalized student ledger, dynamic timetable, continuous assessment marks, on-duty approvals, and campus services in one high-speed platform.
            </p>

            {/* University Feature Highlights Grid */}
            <div className="showcase-features-grid">
              <div className="showcase-feature-card">
                <BookOpen size={20} className="feature-icon" />
                <div>
                  <div className="feature-title">Academic ERP & LMS</div>
                  <div className="feature-desc">75% attendance audit & syllabi</div>
                </div>
              </div>

              <div className="showcase-feature-card">
                <Calendar size={20} className="feature-icon" />
                <div>
                  <div className="feature-title">Dynamic Schedules</div>
                  <div className="feature-desc">Live lecture & room allocations</div>
                </div>
              </div>

              <div className="showcase-feature-card">
                <ShieldCheck size={20} className="feature-icon" />
                <div>
                  <div className="feature-title">Digital Gate Pass</div>
                  <div className="feature-desc">Encrypted campus exit QR passes</div>
                </div>
              </div>

              <div className="showcase-feature-card">
                <Sparkles size={20} className="feature-icon" />
                <div>
                  <div className="feature-title">Zero-Latency Sync</div>
                  <div className="feature-desc">Sub-100ms real-time data access</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Campus Location & Weather Info */}
          <div className="showcase-footer-strip">
            <div className="footer-info-item">
              <MapPin size={15} />
              <span>Selaqui Campus, Chakrata Road, Dehradun</span>
            </div>
            <div className="footer-info-item">
              <Clock size={15} />
              <span>Campus Security: Active 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Auth Gateway */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          {/* Form Header */}
          <div className="auth-form-header">
            <div className="portal-mini-brand">
              <div className="mini-crest">
                <GraduationCap size={20} />
              </div>
              <span className="mini-brand-text">DBS PORTAL</span>
            </div>

            <h2 className="auth-main-title">
              {isRegisterMode ? 'Activate Student Account' : 'Welcome Back'}
            </h2>
            <p className="auth-subtitle">
              {isRegisterMode 
                ? 'Enter your Registrar PIN to initialize your university digital account.' 
                : 'Sign in to access your DBS Global University academic workspace.'}
            </p>
          </div>

          {/* Role Selector Tabs (Student vs Faculty) */}
          {!isRegisterMode && (
            <div className="role-selector-bar">
              <button
                type="button"
                className={`role-tab-btn ${activeRole === 'STUDENT' ? 'role-tab-active' : ''}`}
                onClick={() => {
                  setActiveRole('STUDENT');
                  setErrorMessage(null);
                }}
              >
                <User size={15} />
                <span>Student / Parent</span>
              </button>
              <button
                type="button"
                className={`role-tab-btn ${activeRole === 'FACULTY' ? 'role-tab-active' : ''}`}
                onClick={() => {
                  setActiveRole('FACULTY');
                  setErrorMessage(null);
                }}
              >
                <ShieldCheck size={15} />
                <span>Faculty / Staff</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="auth-alert-box">
              <span>{errorMessage}</span>
            </div>
          )}

          {!isRegisterMode ? (
            /* Standard Login Form */
            <form onSubmit={handleLogin} className="auth-form-fields">
              <div className="input-group">
                <label className="input-label">
                  {activeRole === 'STUDENT' ? 'Student Roll Number or Email' : 'Faculty Employee Code or Email'}
                </label>
                <div className="input-container">
                  <User size={18} className="field-icon" />
                  <input
                    type="text"
                    className="text-input"
                    placeholder={activeRole === 'STUDENT' ? 'e.g. DBS/23/CSE/042 or harsh@dbs.edu.in' : 'e.g. DBS-FAC-108 or faculty@dbs.edu.in'}
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
                    onClick={() => alert('Password recovery link has been dispatched to your official DBS email.')}
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
                  <span>Keep me signed in on this device</span>
                </label>
              </div>

              {/* Primary Action Button */}
              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying Credentials...' : `Sign In as ${activeRole === 'STUDENT' ? 'Student' : 'Faculty'}`}
              </button>

              {/* Single Sign-On Divider */}
              <div className="auth-or-divider">
                <span className="or-line"></span>
                <span className="or-text">OR CONTINUE WITH</span>
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

              {/* Bottom Registration Switch */}
              <div className="auth-bottom-switch">
                <span>First time here? </span>
                <button 
                  type="button" 
                  className="switch-link-btn"
                  onClick={() => setIsRegisterMode(true)}
                >
                  Activate with University PIN
                </button>
              </div>

              {/* Quick-Fill Demo Chips */}
              <div className="quick-demo-wrapper">
                <span className="demo-label">Dev Test Login:</span>
                <div className="demo-buttons">
                  <button type="button" className="demo-chip" onClick={fillQuickStudent}>
                    Student (Harsh)
                  </button>
                  <button type="button" className="demo-chip" onClick={fillQuickFaculty}>
                    Faculty (Dr. Sharma)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* First Time Student PIN Activation Form */
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
                <label className="input-label">Registrar Camu PIN (6-Digit Code)</label>
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
                {isLoading ? 'Activating...' : 'Verify PIN & Enter Portal'}
              </button>

              <div className="auth-bottom-switch" style={{ marginTop: '16px' }}>
                <span>Already have active credentials? </span>
                <button 
                  type="button" 
                  className="switch-link-btn"
                  onClick={() => setIsRegisterMode(false)}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Form Footer */}
          <div className="auth-card-footer">
            <span>&copy; {new Date().getFullYear()} DBS Global University. All rights reserved.</span>
            <div className="footer-links-row">
              <a href="#help" onClick={(e) => { e.preventDefault(); alert('IT Helpdesk: it.support@dbs.edu.in | +91-135-2699100'); }}>Support</a>
              <span>&bull;</span>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('DBS Global University Data Privacy Policy 2026'); }}>Privacy</a>
              <span>&bull;</span>
              <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Official Academic IT Usage Terms'); }}>Terms</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbs-auth-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          min-height: 100vh;
          width: 100vw;
          background: #ffffff;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* Showcase Panel (Left) */
        .auth-showcase-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 44px 56px;
          color: #ffffff;
          overflow: hidden;
        }

        .showcase-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transform: scale(1.02);
          transition: transform 12s ease;
          z-index: 1;
        }

        .dbs-auth-layout:hover .showcase-bg-image {
          transform: scale(1.05);
        }

        .showcase-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg, 
            rgba(6, 11, 25, 0.92) 0%, 
            rgba(15, 28, 65, 0.82) 50%,
            rgba(20, 10, 40, 0.88) 100%
          );
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
          width: 44px;
          height: 44px;
          border-radius: 10px;
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
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
        }

        .showcase-uni-sub {
          font-size: 0.75rem;
          color: #cbd5e1;
          font-weight: 400;
        }

        .showcase-hero-body {
          margin: auto 0;
          max-width: 580px;
          padding: 30px 0;
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
          font-size: 2.35rem;
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
          margin-bottom: 32px;
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
          color: #38bdf8;
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
          padding: 40px;
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

        .portal-mini-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 4px 10px;
          border-radius: 9999px;
          margin-bottom: 14px;
        }

        .mini-crest {
          color: #2563eb;
          display: flex;
          align-items: center;
        }

        .mini-brand-text {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #1e293b;
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

        /* Role Selector Tabs */
        .role-selector-bar {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          gap: 4px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }

        .role-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 8px 12px;
          font-size: 0.825rem;
          font-weight: 600;
          border-radius: 7px;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .role-tab-btn:hover {
          color: #0f172a;
        }

        .role-tab-active {
          background: #ffffff;
          color: #1d4ed8 !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          font-weight: 700;
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

        .forgot-pw-btn:hover {
          text-decoration: underline;
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
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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

        .password-eye-btn:hover {
          color: #334155;
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
          user-select: none;
        }

        .auth-submit-btn {
          width: 100%;
          height: 46px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #ffffff;
          border: none;
          border-radius: 9px;
          font-size: 0.925rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          margin-top: 4px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4);
          background: linear-gradient(135deg, #1e40af, #1d4ed8);
        }

        .auth-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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
          font-size: 0.7rem;
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
          transition: all 0.15s ease;
        }

        .sso-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .sso-svg {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
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
          padding: 0;
        }

        .switch-link-btn:hover {
          text-decoration: underline;
        }

        .quick-demo-wrapper {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .demo-label {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .demo-buttons {
          display: flex;
          gap: 6px;
        }

        .demo-chip {
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .demo-chip:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
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

        .footer-links-row a:hover {
          color: #2563eb;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .dbs-auth-layout {
            grid-template-columns: 1fr;
          }
          .auth-showcase-panel {
            display: none;
          }
          .auth-form-panel {
            min-height: 100vh;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
