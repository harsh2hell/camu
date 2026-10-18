import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi, type UserSession } from '../api/auth';

interface CamuLoginPageProps {
  portalMode: 'student' | 'teacher';
  onTogglePortal: (mode: 'student' | 'teacher') => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const CamuLoginPage: React.FC<CamuLoginPageProps> = ({
  portalMode,
  onTogglePortal,
  onLoginSuccess,
}) => {
  const isStudent = portalMode === 'student';

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailOrRoll, setEmailOrRoll] = useState(isStudent ? 'harsh.23cse@dbs.edu.in' : 'rajesh.sharma@dbs.edu.in');
  const [password, setPassword] = useState(isStudent ? 'DBS@2026' : 'Faculty@DBS');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Carousel slide state
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      image: '/dbs_campus_real.jpg',
      title: 'Discover your next journey',
      desc: 'Explore ideas, academic excellence, and campus experiences designed to inspire your future at DBS Global University.',
    },
    {
      image: '/dbs_campus_bg.jpg',
      title: 'World-Class Himalayan Campus',
      desc: 'Modern architecture, cutting-edge computing laboratories, and expansive sports grounds nestled in the scenic Doon Valley.',
    },
    {
      image: '/dbs_campus_slide2.webp',
      title: 'Empowering Future Leaders',
      desc: 'Connecting higher education with global industry opportunities, live projects, and innovative technology learning.',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrRoll.trim()) {
      setErrorMessage('Please enter your email or roll number.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(emailOrRoll, password);
      onLoginSuccess({
        ...session,
        role: isStudent ? 'STUDENT' : 'FACULTY',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authApi.loginWithGoogle();
      onLoginSuccess({ ...session, role: isStudent ? 'STUDENT' : 'FACULTY' });
    } catch {
      setErrorMessage('Google SSO failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleOrMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authApi.loginWithMicrosoft();
      onLoginSuccess({ ...session, role: isStudent ? 'STUDENT' : 'FACULTY' });
    } catch {
      setErrorMessage('Single Sign-On failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regRoll || !regEmail || !regPin || !regPassword) {
      setErrorMessage('Please fill in all registration fields.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.registerWithPin({
        fullName: regName,
        rollNo: regRoll,
        email: regEmail,
        camuPin: regPin,
        password: regPassword,
      });
      onLoginSuccess(session);
    } catch {
      setErrorMessage('Activation failed. Contact Registrar Office.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="freshy-auth-viewport">
      {/* Centered Modal / Canvas Container matching screenshot */}
      <div className="freshy-auth-card">
        {/* LEFT COLUMN: Clean Form */}
        <div className="freshy-form-column">
          {/* Top Portal Toggle (Student vs Teacher) */}
          <div className="portal-subdomain-pill-row">
            <div className="portal-indicator-chip">
              <span className="dot-live"></span>
              <span>{isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}</span>
            </div>
            <button
              type="button"
              className="portal-switch-subtle-btn"
              onClick={() => {
                const next = isStudent ? 'teacher' : 'student';
                onTogglePortal(next);
                setEmailOrRoll(next === 'student' ? 'harsh.23cse@dbs.edu.in' : 'rajesh.sharma@dbs.edu.in');
                setPassword(next === 'student' ? 'DBS@2026' : 'Faculty@DBS');
                setErrorMessage(null);
              }}
            >
              Switch to {isStudent ? 'teacher.dgu.in' : 'student.dgu.in'}
            </button>
          </div>

          <div className="freshy-form-inner">
            {/* 1. Radiating Sun / Emblem Logo */}
            <div className="freshy-brand-emblem-wrap">
              <svg className="freshy-sun-logo" viewBox="0 0 100 100" fill="none">
                {/* Center Core */}
                <circle cx="50" cy="50" r="14" fill="#f97316" />
                <circle cx="50" cy="50" r="8" fill="#ffffff" />
                <circle cx="50" cy="50" r="4" fill="#f97316" />
                {/* Radiating Petals / Sun Rays */}
                <g stroke="#f97316" strokeWidth="4.5" strokeLinecap="round">
                  <line x1="50" y1="20" x2="50" y2="10" />
                  <line x1="50" y1="80" x2="50" y2="90" />
                  <line x1="20" y1="50" x2="10" y2="50" />
                  <line x1="80" y1="50" x2="90" y2="50" />
                  <line x1="29" y1="29" x2="21" y2="21" />
                  <line x1="71" y1="71" x2="79" y2="79" />
                  <line x1="29" y1="71" x2="21" y2="79" />
                  <line x1="71" y1="29" x2="79" y2="21" />
                  <line x1="39" y1="23" x2="34" y2="13" />
                  <line x1="61" y1="23" x2="66" y2="13" />
                  <line x1="39" y1="77" x2="34" y2="87" />
                  <line x1="61" y1="77" x2="66" y2="87" />
                  <line x1="23" y1="39" x2="13" y2="34" />
                  <line x1="23" y1="61" x2="13" y2="66" />
                  <line x1="77" y1="39" x2="87" y2="34" />
                  <line x1="77" y1="61" x2="87" y2="66" />
                </g>
              </svg>
            </div>

            {/* 2. Titles */}
            <h1 className="freshy-title">Welcome Back!</h1>
            <p className="freshy-subtitle">
              {isStudent 
                ? 'Sign in to continue where you left off.' 
                : 'Sign in to DBS Global University Faculty Suite.'}
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="freshy-error-alert">
                <span>{errorMessage}</span>
              </div>
            )}

            {!isRegisterMode ? (
              <>
                {/* 3. SSO Buttons (Google & Apple / Microsoft) */}
                <div className="freshy-sso-group">
                  <button 
                    type="button" 
                    className="freshy-sso-btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <svg className="freshy-sso-icon" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button 
                    type="button" 
                    className="freshy-sso-btn"
                    onClick={handleAppleOrMicrosoftLogin}
                    disabled={isLoading}
                  >
                    <svg className="freshy-sso-icon" viewBox="0 0 24 24" fill="#000000">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.85-.92.04-2.02.62-2.66 1.37-.56.65-1.06 1.71-.93 2.73 1.03.08 2.07-.54 2.58-1.25z"/>
                    </svg>
                    <span>Continue with Apple</span>
                  </button>
                </div>

                {/* 4. OR Divider */}
                <div className="freshy-or-divider">
                  <span className="or-line"></span>
                  <span className="or-text">OR</span>
                  <span className="or-line"></span>
                </div>

                {/* 5. Inputs Form */}
                <form onSubmit={handleLogin} className="freshy-fields-form">
                  <div className="freshy-input-group">
                    <label className="freshy-input-label">Email address</label>
                    <input
                      type="text"
                      className="freshy-text-input"
                      placeholder="Example@gmail.com"
                      value={emailOrRoll}
                      onChange={(e) => setEmailOrRoll(e.target.value)}
                      required
                    />
                  </div>

                  <div className="freshy-input-group">
                    <div className="freshy-label-row">
                      <label className="freshy-input-label">Password</label>
                      <button
                        type="button"
                        className="freshy-forgot-link"
                        onClick={() => alert(`Password reset instructions sent to your registered email.`)}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="freshy-password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="freshy-text-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="freshy-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password view"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* 6. Deep Dark Log in Button */}
                  <button 
                    type="submit" 
                    className="freshy-submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Log in'}
                  </button>

                  {/* 7. Sign up switcher */}
                  <div className="freshy-signup-row">
                    <span>Don't have account yet? </span>
                    <button
                      type="button"
                      className="freshy-signup-link"
                      onClick={() => setIsRegisterMode(true)}
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Sign up / Student Activation Form */
              <form onSubmit={handleRegister} className="freshy-fields-form">
                <div className="freshy-input-group">
                  <label className="freshy-input-label">Full Name</label>
                  <input
                    type="text"
                    className="freshy-text-input"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="freshy-input-group">
                  <label className="freshy-input-label">Student Roll Number</label>
                  <input
                    type="text"
                    className="freshy-text-input"
                    placeholder="e.g. DBS/23/CSE/042"
                    value={regRoll}
                    onChange={(e) => setRegRoll(e.target.value)}
                    required
                  />
                </div>

                <div className="freshy-input-group">
                  <label className="freshy-input-label">Official University Email</label>
                  <input
                    type="email"
                    className="freshy-text-input"
                    placeholder="student.23cse@dbs.edu.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="freshy-input-group">
                  <label className="freshy-input-label">Registrar PIN (6-Digit Code)</label>
                  <input
                    type="text"
                    className="freshy-text-input"
                    placeholder="e.g. 748291"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    required
                  />
                </div>

                <div className="freshy-input-group">
                  <label className="freshy-input-label">Create Password</label>
                  <input
                    type="password"
                    className="freshy-text-input"
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="freshy-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </button>

                <div className="freshy-signup-row">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    className="freshy-signup-link"
                    onClick={() => setIsRegisterMode(false)}
                  >
                    Log in
                  </button>
                </div>
              </form>
            )}

            {/* 8. Bottom Terms Disclaimer */}
            <div className="freshy-legal-disclaimer">
              <span>By continuing you agree to our </span>
              <a href="#terms" onClick={(e) => { e.preventDefault(); alert('DBS Terms & Conditions'); }}>
                Terms &amp; Conditions
              </a>
              <br />
              <span>and acknowledge our </span>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('DBS Privacy Policy'); }}>
                Privacy Policy
              </a>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real DBS Campus Photography Card matching screenshot */}
        <div className="freshy-image-column">
          <div className="freshy-image-card-container">
            {/* The real DBS University Photo */}
            <img 
              src={slides[activeSlide].image} 
              alt="DBS Global University Campus" 
              className="freshy-campus-photo"
            />
            
            {/* Bottom Dark Gradient Scrim */}
            <div className="freshy-image-scrim"></div>

            {/* Overlaid Captions and Pagination Lines */}
            <div className="freshy-image-overlay-content">
              {/* Pagination Indicators */}
              <div className="freshy-carousel-bars">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`carousel-bar-line ${idx === activeSlide ? 'bar-active' : ''}`}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Title & Description */}
              <h2 className="freshy-slide-title">{slides[activeSlide].title}</h2>
              <p className="freshy-slide-desc">{slides[activeSlide].desc}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .freshy-auth-viewport {
          min-height: 100vh;
          width: 100vw;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }

        .freshy-auth-card {
          width: 100%;
          max-width: 1120px;
          min-height: 720px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 25px 70px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }

        /* LEFT COLUMN */
        .freshy-form-column {
          padding: 32px 56px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-y: auto;
        }

        .portal-subdomain-pill-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .portal-indicator-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #334155;
        }

        .dot-live {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f97316;
        }

        .portal-switch-subtle-btn {
          background: none;
          border: none;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .portal-switch-subtle-btn:hover {
          color: #0f172a;
        }

        .freshy-form-inner {
          max-width: 380px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }

        /* Radiant Sun Logo */
        .freshy-brand-emblem-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }

        .freshy-sun-logo {
          width: 52px;
          height: 52px;
        }

        .freshy-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin-bottom: 6px;
        }

        .freshy-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin-bottom: 24px;
        }

        .freshy-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          margin-bottom: 16px;
          text-align: center;
        }

        /* SSO Buttons */
        .freshy-sso-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .freshy-sso-btn {
          width: 100%;
          height: 48px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }

        .freshy-sso-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .freshy-sso-icon {
          width: 18px;
          height: 18px;
        }

        /* OR Divider */
        .freshy-or-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 18px 0;
        }

        .or-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .or-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Form Fields */
        .freshy-fields-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .freshy-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .freshy-input-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
        }

        .freshy-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .freshy-forgot-link {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
        }

        .freshy-forgot-link:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        .freshy-text-input {
          width: 100%;
          height: 48px;
          padding: 10px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .freshy-text-input:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        .freshy-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .freshy-eye-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .freshy-eye-btn:hover {
          color: #0f172a;
        }

        /* Deep Black / Midnight Navy Log in Button */
        .freshy-submit-btn {
          width: 100%;
          height: 48px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .freshy-submit-btn:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-1px);
        }

        .freshy-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .freshy-signup-row {
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 8px;
        }

        .freshy-signup-link {
          color: #0f172a;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
        }

        /* Bottom Legal Disclaimer */
        .freshy-legal-disclaimer {
          text-align: center;
          font-size: 0.72rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-top: 32px;
        }

        .freshy-legal-disclaimer a {
          color: #0f172a;
          font-weight: 600;
          text-decoration: underline;
        }

        /* RIGHT COLUMN: Image & Carousel Card */
        .freshy-image-column {
          padding: 14px;
          display: flex;
        }

        .freshy-image-card-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 640px;
          border-radius: 20px;
          overflow: hidden;
          background: #0f172a;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .freshy-campus-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.5s ease;
        }

        .freshy-image-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.05) 0%,
            rgba(0, 0, 0, 0.25) 50%,
            rgba(0, 0, 0, 0.88) 100%
          );
          z-index: 2;
        }

        .freshy-image-overlay-content {
          position: relative;
          z-index: 10;
          padding: 36px 40px;
          color: #ffffff;
        }

        /* Carousel Bars matching screenshot */
        .freshy-carousel-bars {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .carousel-bar-line {
          height: 3px;
          width: 16px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          padding: 0;
        }

        .carousel-bar-line.bar-active {
          width: 36px;
          background: #ffffff;
        }

        .freshy-slide-title {
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 8px;
        }

        .freshy-slide-desc {
          font-size: 0.825rem;
          color: #cbd5e1;
          line-height: 1.5;
          max-width: 440px;
          opacity: 0.9;
        }

        @media (max-width: 900px) {
          .freshy-auth-card {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .freshy-image-column {
            display: none;
          }
          .freshy-form-column {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
};
