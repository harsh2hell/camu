import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi, type UserSession } from '../api/auth';

interface CamuLoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const CamuLoginPage: React.FC<CamuLoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regRollNo, setRegRollNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCamuPin, setRegCamuPin] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your Username, Roll Number, or registered email.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(username, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
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
      setErrorMessage(err.message || 'Google SSO authentication failed.');
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
      setErrorMessage(err.message || 'Microsoft 365 authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regRollNo || !regEmail || !regCamuPin || !regPassword) {
      setErrorMessage('Please fill in all registration fields and your University Camu PIN.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.registerWithPin({
        fullName: regFullName,
        rollNo: regRollNo,
        email: regEmail,
        camuPin: regCamuPin,
        password: regPassword,
      });
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Account activation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick-fill demo credentials
  const fillDemoStudent = () => {
    setUsername('harsh.23cse@dbs.edu.in');
    setPassword('DBS@2026');
    setErrorMessage(null);
  };

  const fillDemoFaculty = () => {
    setUsername('rajesh.sharma@dbs.edu.in');
    setPassword('Faculty@DBS');
    setErrorMessage(null);
  };

  return (
    <div className="camu-login-viewport">
      {/* Background Image Container */}
      <div 
        className="camu-bg-cover"
        style={{ backgroundImage: "url('/dbs_campus_bg.jpg')" }}
      ></div>
      <div className="camu-bg-overlay"></div>

      {/* Center Login Card matching Screenshot 2 */}
      <div className="camu-card-container">
        <div className="camu-login-card">
          {/* 1. Official MyCamu Logo */}
          <div className="camu-header-logos">
            <div className="mycamu-brand-box">
              <svg className="mycamu-svg-logo" viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Border Box */}
                <rect x="2" y="4" width="46" height="40" rx="3" stroke="#0077c8" strokeWidth="2.5" fill="none" />
                {/* My */}
                <text x="6" y="32" fontFamily="system-ui, sans-serif" fontSize="22" fontWeight="700" fill="#0077c8">My</text>
                {/* Chevrons on top */}
                <path d="M12 12 L16 8 L20 12" stroke="#0077c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 12 L26 8 L30 12" stroke="#0077c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Camu text */}
                <text x="54" y="32" fontFamily="system-ui, sans-serif" fontSize="24" fontWeight="800" fill="#0b2447" letterSpacing="-0.5">Camu</text>
              </svg>
            </div>

            {/* 2. Official DBS Global University Crest */}
            <div className="dbs-crest-box">
              <div className="dbs-emblem">
                <span className="dbs-tag">DBS</span>
                <span className="dbs-city">DEHRADUN</span>
              </div>
              <div className="dbs-crest-text">
                <div className="dbs-main-title">DBS GLOBAL</div>
                <div className="dbs-sub-title">UNIVERSITY</div>
              </div>
            </div>

            <h1 className="institution-heading">DBS Global University</h1>
            <button 
              type="button" 
              className="not-dbs-link"
              onClick={() => alert('This portal instance is dedicated exclusively to DBS Global University (Dehradun).')}
            >
              Not from DBS Global University?
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="camu-error-alert">
              <span>{errorMessage}</span>
            </div>
          )}

          {!isRegisterMode ? (
            /* Sign In Mode */
            <form onSubmit={handleLogin} className="camu-form">
              <div className="camu-field-group">
                <label htmlFor="camu-username" className="camu-label">Username</label>
                <input
                  id="camu-username"
                  type="text"
                  className="camu-input"
                  placeholder="Roll No. or University Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="camu-field-group">
                <div className="password-label-row">
                  <label htmlFor="camu-password" className="camu-label">Password</label>
                  <button 
                    type="button" 
                    className="forgot-link"
                    onClick={() => alert('Password reset link will be sent to your registered DBS University email.')}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="password-input-wrap">
                  <input
                    id="camu-password"
                    type={showPassword ? 'text' : 'password'}
                    className="camu-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button 
                type="submit" 
                className="camu-primary-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Login'}
              </button>

              {/* OR Divider */}
              <div className="camu-divider">
                <span className="divider-line"></span>
                <span className="divider-text">OR</span>
                <span className="divider-line"></span>
              </div>

              {/* SSO Buttons */}
              <div className="sso-buttons-group">
                <button 
                  type="button" 
                  className="camu-sso-btn"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="sso-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button 
                  type="button" 
                  className="camu-sso-btn"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                >
                  <svg className="sso-icon" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                    <path fill="#7fba00" d="M13 1h10v10H13z"/>
                    <path fill="#ffb900" d="M13 13h10v10H13z"/>
                  </svg>
                  <span>Continue with Microsoft</span>
                </button>
              </div>

              {/* Bottom Register Switcher */}
              <div className="camu-footer-row">
                <span>New to MyCamu? </span>
                <button 
                  type="button" 
                  className="create-account-link"
                  onClick={() => setIsRegisterMode(true)}
                >
                  Create an account
                </button>
              </div>

              {/* Convenient Quick-Login Demo Pills */}
              <div className="demo-credentials-strip">
                <span className="demo-hint">Quick Test Login:</span>
                <div className="demo-pill-group">
                  <button type="button" className="demo-pill" onClick={fillDemoStudent}>
                    Student (Harsh)
                  </button>
                  <button type="button" className="demo-pill" onClick={fillDemoFaculty}>
                    Faculty (Dr. Sharma)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* First Time Camu PIN Registration Mode */
            <form onSubmit={handleRegister} className="camu-form">
              <div className="reg-badge-row">
                <span className="reg-badge">Student / Parent Account Activation</span>
              </div>

              <div className="camu-field-group">
                <label className="camu-label">Full Name</label>
                <input
                  type="text"
                  className="camu-input"
                  placeholder="e.g. Harsh Vardhan"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                />
              </div>

              <div className="camu-field-group">
                <label className="camu-label">DBS University Roll Number</label>
                <input
                  type="text"
                  className="camu-input"
                  placeholder="e.g. DBS/23/CSE/042"
                  value={regRollNo}
                  onChange={(e) => setRegRollNo(e.target.value)}
                  required
                />
              </div>

              <div className="camu-field-group">
                <label className="camu-label">Official University Email ID</label>
                <input
                  type="email"
                  className="camu-input"
                  placeholder="harsh.23cse@dbs.edu.in"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="camu-field-group">
                <label className="camu-label">Camu PIN (Provided by DBS Registrar Office)</label>
                <input
                  type="text"
                  className="camu-input"
                  placeholder="6-digit University PIN (e.g. 849201)"
                  value={regCamuPin}
                  onChange={(e) => setRegCamuPin(e.target.value)}
                  required
                />
              </div>

              <div className="camu-field-group">
                <label className="camu-label">Create Password</label>
                <input
                  type="password"
                  className="camu-input"
                  placeholder="Minimum 8 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="camu-primary-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Activating Account...' : 'Activate & Enter Portal'}
              </button>

              <div className="camu-footer-row" style={{ marginTop: '16px' }}>
                <span>Already have an active account? </span>
                <button 
                  type="button" 
                  className="create-account-link"
                  onClick={() => setIsRegisterMode(false)}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .camu-login-viewport {
          position: relative;
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #334155;
        }

        .camu-bg-cover {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 1;
        }

        .camu-bg-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.08);
          z-index: 2;
        }

        .camu-card-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          padding: 20px;
          margin: 0 auto;
        }

        .camu-login-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 34px 40px;
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.18);
          display: flex;
          flex-direction: column;
          animation: cardSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardSlide {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .camu-header-logos {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }

        .mycamu-brand-box {
          margin-bottom: 16px;
        }

        .mycamu-svg-logo {
          width: 130px;
          height: 38px;
        }

        .dbs-crest-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .dbs-emblem {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1.5px solid #881337;
          border-radius: 4px;
          padding: 2px 6px;
          background: #fff;
        }

        .dbs-tag {
          font-size: 0.9rem;
          font-weight: 900;
          color: #881337;
          line-height: 1;
          letter-spacing: 0.05em;
        }

        .dbs-city {
          font-size: 0.45rem;
          font-weight: 800;
          color: #881337;
          letter-spacing: 0.08em;
        }

        .dbs-crest-text {
          text-align: left;
          line-height: 1.1;
        }

        .dbs-main-title {
          font-size: 0.825rem;
          font-weight: 800;
          color: #881337;
          letter-spacing: 0.02em;
        }

        .dbs-sub-title {
          font-size: 0.65rem;
          font-weight: 700;
          color: #881337;
          letter-spacing: 0.06em;
        }

        .institution-heading {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 6px 0 2px;
        }

        .not-dbs-link {
          font-size: 0.78rem;
          color: #0288d1;
          font-weight: 500;
          cursor: pointer;
          background: none;
          border: none;
          text-decoration: none;
        }

        .not-dbs-link:hover {
          text-decoration: underline;
        }

        .camu-error-alert {
          background: #fee2e2;
          border: 1px solid #f87171;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 16px;
          text-align: center;
        }

        .camu-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .camu-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .camu-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #334155;
        }

        .password-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-link {
          font-size: 0.78rem;
          color: #0288d1;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .camu-input {
          width: 100%;
          height: 44px;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .camu-input:focus {
          border-color: #0288d1;
          box-shadow: 0 0 0 3px rgba(2, 136, 209, 0.15);
        }

        .password-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .eye-toggle-btn {
          position: absolute;
          right: 12px;
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .eye-toggle-btn:hover {
          color: #0f172a;
        }

        .camu-primary-btn {
          width: 100%;
          height: 46px;
          background: #0288d1;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 4px;
        }

        .camu-primary-btn:hover:not(:disabled) {
          background: #0277bd;
        }

        .camu-primary-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .camu-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .sso-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .camu-sso-btn {
          width: 100%;
          height: 44px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .camu-sso-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .sso-icon {
          width: 18px;
          height: 18px;
        }

        .camu-footer-row {
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 8px;
        }

        .create-account-link {
          color: #0288d1;
          background: none;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        .create-account-link:hover {
          text-decoration: underline;
        }

        /* Demo credentials helper */
        .demo-credentials-strip {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #64748b;
          flex-wrap: wrap;
          gap: 6px;
        }

        .demo-pill-group {
          display: flex;
          gap: 6px;
        }

        .demo-pill {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #0288d1;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .demo-pill:hover {
          background: #0288d1;
          color: #ffffff;
          border-color: #0288d1;
        }

        .reg-badge-row {
          text-align: center;
          margin-bottom: 6px;
        }

        .reg-badge {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
