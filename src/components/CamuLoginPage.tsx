import React, { useState, useEffect } from 'react';
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

  // Carousel slide state (3.5s per photo, time-card progress bar)
  const SLIDE_DURATION = 3500; // 3.5 seconds
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const slides = [
    {
      image: '/dbs_campus_real.jpg',
      title: 'Discover your next journey',
      desc: 'Explore ideas, academic excellence, and campus experiences designed to inspire your future at DBS Global University.',
    },
    {
      image: '/dbs_computing_lab.webp',
      title: 'Advanced AI & Computing Labs',
      desc: 'High-performance computing workstations, cloud architecture, and next-gen technology incubation centers.',
    },
    {
      image: '/dbs_life_campus.webp',
      title: 'Scenic Himalayan Campus Life',
      desc: 'Nestled in the lush Doon Valley with world-class residential facilities, sports complexes, and vibrant student clubs.',
    },
    {
      image: '/dbs_campus_hero.webp',
      title: 'Global Industry Immersion',
      desc: 'Direct corporate mentorship, international academic collaborations, and live industry project incubators.',
    },
    {
      image: '/dbs_campus_teamwork.webp',
      title: "Empowering Tomorrow's Leaders",
      desc: 'Fostering innovation, leadership, and entrepreneurial mindsets across engineering, management, and technology.',
    },
  ];

  // Auto-advance timer: smoothly changes photos every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
      setProgressKey((prev) => prev + 1);
    }, SLIDE_DURATION);

    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const handleSelectSlide = (idx: number) => {
    setActiveSlide(idx);
    setProgressKey((prev) => prev + 1);
  };

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
        
        {/* MOBILE ONLY: Compact DBS Campus Hero Banner with cycling carousel */}
        <div className="freshy-mobile-banner">
          {slides.map((slide, idx) => (
            <img 
              key={idx}
              src={slide.image} 
              alt={slide.title} 
              className={`freshy-mobile-banner-img ${idx === activeSlide ? 'banner-active' : ''}`}
            />
          ))}
          <div className="freshy-mobile-banner-scrim"></div>
          <div className="freshy-mobile-banner-content">
            <div className="portal-indicator-chip chip-dark">
              <span className="dot-live"></span>
              <span>{isStudent ? 'student.dgu.in' : 'teacher.dgu.in'}</span>
            </div>
            <button
              type="button"
              className="portal-switch-subtle-btn switch-on-dark"
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
          {/* Mobile slide indicator dots */}
          <div className="freshy-mobile-dots">
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={`mobile-dot ${idx === activeSlide ? 'dot-active' : ''}`} 
              />
            ))}
          </div>
        </div>

        {/* LEFT COLUMN: Clean Form */}
        <div className="freshy-form-column">
          {/* Top Portal Toggle (Student vs Teacher) - Hidden on Mobile since shown in banner */}
          <div className="portal-subdomain-pill-row desktop-only-flex">
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
            {/* 1. Radiating Sun / Concentric Arch Emblem Logo */}
            <div className="freshy-brand-emblem-wrap">
              <svg className="freshy-sun-logo" viewBox="0 0 64 64" fill="none">
                {/* Radiating Pill Rays */}
                <g stroke="#f97316" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="10" y1="38" x2="15" y2="38" />
                  <line x1="12" y1="28" x2="17" y2="30" />
                  <line x1="17" y1="20" x2="22" y2="24" />
                  <line x1="24" y1="14" x2="27" y2="20" />
                  <line x1="32" y1="10" x2="32" y2="17" />
                  <line x1="40" y1="14" x2="37" y2="20" />
                  <line x1="47" y1="20" x2="42" y2="24" />
                  <line x1="52" y1="28" x2="47" y2="30" />
                  <line x1="54" y1="38" x2="49" y2="38" />
                </g>
                {/* Concentric Arches */}
                <g stroke="#f97316" strokeWidth="2.6" strokeLinecap="round" fill="none">
                  <path d="M 18 42 A 14 14 0 0 1 46 42" />
                  <path d="M 23 42 A 9 9 0 0 1 41 42" />
                  <path d="M 28 42 A 4 4 0 0 1 36 42" />
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
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
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
                        onClick={() => alert('Password reset link sent to your registered email.')}
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
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    inputMode="email"
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

        {/* RIGHT COLUMN: Interactive Timed Carousel Card with Cross-fading Photos */}
        <div 
          className="freshy-image-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="freshy-image-card-container">
            {/* Cross-fading stacked photos with gentle cinematic pan zoom */}
            {slides.map((slide, idx) => (
              <div 
                key={idx}
                className={`freshy-campus-photo-layer ${idx === activeSlide ? 'photo-active' : ''}`}
              >
                <img 
                  src={slide.image} 
                  alt={slide.title} 
                  className="freshy-campus-photo"
                />
              </div>
            ))}
            
            {/* Bottom Dark Gradient Scrim */}
            <div className="freshy-image-scrim"></div>

            {/* Overlaid Captions and Time-Card Pagination Lines */}
            <div className="freshy-image-overlay-content">
              {/* Story / Time-Card Dash Indicators */}
              <div className="freshy-carousel-bars">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`carousel-bar-line ${
                      idx === activeSlide 
                        ? 'bar-active' 
                        : idx < activeSlide 
                          ? 'bar-completed' 
                          : ''
                    }`}
                    onClick={() => handleSelectSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    {idx === activeSlide && (
                      <span 
                        key={progressKey}
                        className="carousel-bar-progress" 
                        style={{
                          animationDuration: `${SLIDE_DURATION}ms`,
                          animationPlayState: isPaused ? 'paused' : 'running',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Title & Description with smooth fade transition */}
              <div key={activeSlide} className="freshy-slide-text-wrapper">
                <h2 className="freshy-slide-title">{slides[activeSlide].title}</h2>
                <p className="freshy-slide-desc">{slides[activeSlide].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ==========================================================================
           FULLSCREEN VIEWPORT & ADAPTIVE SIZING ARCHITECTURE
           Fits standard desktop & laptop viewports completely without vertical scroll,
           while gracefully falling back to scroll on small displays & mobile devices.
           ========================================================================== */
        
        .freshy-auth-viewport {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          box-sizing: border-box;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .freshy-auth-card {
          width: 100%;
          max-width: 980px;
          /* Fits inside available window height with safety margins */
          height: calc(100dvh - 24px);
          max-height: 600px;
          min-height: 470px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 16px 48px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04);
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          overflow: hidden;
          position: relative;
        }

        /* MOBILE BANNER: Hidden on desktop */
        .freshy-mobile-banner {
          display: none;
        }

        .desktop-only-flex {
          display: flex;
        }

        /* LEFT FORM COLUMN */
        .freshy-form-column {
          padding: 14px 34px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .portal-subdomain-pill-row {
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .portal-indicator-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 2.5px 8.5px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #334155;
          letter-spacing: -0.01em;
        }

        .portal-indicator-chip.chip-dark {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          border-color: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
        }

        .dot-live {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f97316;
          box-shadow: 0 0 6px rgba(249, 115, 22, 0.6);
        }

        .portal-switch-subtle-btn {
          background: none;
          border: none;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          padding: 2px 4px;
        }

        .portal-switch-subtle-btn:hover {
          color: #0f172a;
        }

        .portal-switch-subtle-btn.switch-on-dark {
          color: #e2e8f0;
        }
        .portal-switch-subtle-btn.switch-on-dark:hover {
          color: #ffffff;
        }

        .freshy-form-inner {
          max-width: 350px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }

        /* 1. Radiant Sun Logo (Arch + Rays) */
        .freshy-brand-emblem-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 4px;
        }

        .freshy-sun-logo {
          width: 34px;
          height: 34px;
        }

        /* 2. Titles */
        .freshy-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        .freshy-subtitle {
          font-size: 0.78rem;
          color: #64748b;
          margin-bottom: 8px;
          line-height: 1.35;
        }

        .freshy-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.74rem;
          margin-bottom: 8px;
          text-align: center;
        }

        /* 3. SSO Buttons */
        .freshy-sso-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 6px;
        }

        .freshy-sso-btn {
          width: 100%;
          height: 36px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 0.81rem;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .freshy-sso-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .freshy-sso-icon {
          width: 15px;
          height: 15px;
        }

        /* 4. OR Divider */
        .freshy-or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
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
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        /* 5. Form Fields */
        .freshy-fields-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .freshy-input-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .freshy-input-label {
          font-size: 0.77rem;
          font-weight: 600;
          color: #0f172a;
        }

        .freshy-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .freshy-forgot-link {
          font-size: 0.73rem;
          color: #64748b;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .freshy-forgot-link:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        .freshy-text-input {
          width: 100%;
          height: 36px;
          padding: 6px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          font-size: 0.83rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
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
          right: 10px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }

        .freshy-eye-btn:hover {
          color: #0f172a;
        }

        /* 6. Deep Black Log in Button */
        .freshy-submit-btn {
          width: 100%;
          height: 38px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 3px;
          transition: background 0.15s ease;
        }

        .freshy-submit-btn:hover:not(:disabled) {
          background: #1e293b;
        }

        .freshy-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* 7. Sign up switcher */
        .freshy-signup-row {
          text-align: center;
          font-size: 0.77rem;
          color: #64748b;
          margin-top: 3px;
        }

        .freshy-signup-link {
          color: #0f172a;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        /* 8. Bottom Terms Disclaimer */
        .freshy-legal-disclaimer {
          text-align: center;
          font-size: 0.65rem;
          color: #94a3b8;
          line-height: 1.35;
          margin-top: 8px;
        }

        .freshy-legal-disclaimer a {
          color: #0f172a;
          font-weight: 600;
          text-decoration: underline;
        }

        /* ==========================================================================
           RIGHT COLUMN: TIMED CAROUSEL PHOTO CARD
           Stacked cross-fading photos with subtle pan-zoom, gradient scrim,
           and Instagram/Apple style progress timer dashes.
           ========================================================================== */
        .freshy-image-column {
          padding: 10px;
          display: flex;
          height: 100%;
          box-sizing: border-box;
          user-select: none;
        }

        .freshy-image-card-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          background: #090e17;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        /* Stacked Photo Layers for Buttery Smooth Cross-Fade */
        .freshy-campus-photo-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 1;
        }

        .freshy-campus-photo-layer.photo-active {
          opacity: 1;
          pointer-events: auto;
          z-index: 2;
        }

        .freshy-campus-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.05);
          transition: transform 4.5s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .freshy-campus-photo-layer.photo-active .freshy-campus-photo {
          transform: scale(1);
        }

        /* Bottom Dark Gradient Scrim */
        .freshy-image-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.02) 0%,
            rgba(0, 0, 0, 0.15) 40%,
            rgba(0, 0, 0, 0.82) 80%,
            rgba(0, 0, 0, 0.94) 100%
          );
          z-index: 3;
          pointer-events: none;
        }

        .freshy-image-overlay-content {
          position: relative;
          z-index: 10;
          padding: 20px 22px;
          color: #ffffff;
        }

        /* Timed Progress Carousel Bars */
        .freshy-carousel-bars {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .carousel-bar-line {
          position: relative;
          height: 3px;
          width: 12px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          cursor: pointer;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;
          padding: 0;
          overflow: hidden;
        }

        .carousel-bar-line.bar-completed {
          background: rgba(255, 255, 255, 0.85);
        }

        .carousel-bar-line.bar-active {
          width: 32px;
          background: rgba(255, 255, 255, 0.3);
        }

        /* Animated Progress Fill */
        .carousel-bar-progress {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 0%;
          background: #ffffff;
          border-radius: 9999px;
          animation: fillProgress linear forwards;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
        }

        @keyframes fillProgress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        /* Slide text smooth fade-in */
        .freshy-slide-text-wrapper {
          animation: slideTextFade 0.45s ease-out;
        }

        @keyframes slideTextFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .freshy-slide-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .freshy-slide-desc {
          font-size: 0.74rem;
          color: #cbd5e1;
          line-height: 1.4;
          max-width: 380px;
          opacity: 0.92;
        }

        /* ==========================================================================
           LARGE DESKTOP / HIGH RESOLUTION EXPANSION
           On taller monitors (>= 760px), scale up spacing for a luxurious feel.
           ========================================================================== */
        @media (min-height: 760px) and (min-width: 821px) {
          .freshy-auth-card {
            max-height: 660px;
            border-radius: 24px;
          }
          .freshy-form-column {
            padding: 24px 40px 18px;
          }
          .freshy-sun-logo {
            width: 42px;
            height: 42px;
          }
          .freshy-brand-emblem-wrap {
            margin-bottom: 8px;
          }
          .freshy-title {
            font-size: 1.6rem;
            margin-bottom: 4px;
          }
          .freshy-subtitle {
            font-size: 0.84rem;
            margin-bottom: 12px;
          }
          .freshy-sso-group {
            gap: 8px;
            margin-bottom: 10px;
          }
          .freshy-sso-btn {
            height: 40px;
            font-size: 0.84rem;
          }
          .freshy-or-divider {
            margin: 10px 0;
          }
          .freshy-fields-form {
            gap: 11px;
          }
          .freshy-text-input {
            height: 40px;
            font-size: 0.86rem;
            padding: 8px 14px;
          }
          .freshy-submit-btn {
            height: 42px;
            font-size: 0.92rem;
            margin-top: 5px;
          }
          .freshy-signup-row {
            margin-top: 6px;
            font-size: 0.8rem;
          }
          .freshy-legal-disclaimer {
            margin-top: 14px;
            font-size: 0.68rem;
          }
          .freshy-image-overlay-content {
            padding: 28px 30px;
          }
          .freshy-slide-title {
            font-size: 1.4rem;
            margin-bottom: 6px;
          }
          .freshy-slide-desc {
            font-size: 0.8rem;
          }
          .carousel-bar-line.bar-active {
            width: 38px;
          }
        }

        /* ==========================================================================
           SMALL DESKTOP HEIGHT OVERFLOW SAFEGUARD
           If user shrinks window height below 500px, allow clean vertical scrolling
           ========================================================================== */
        @media (max-height: 500px) and (min-width: 821px) {
          .freshy-auth-card {
            height: auto;
            max-height: none;
            min-height: 440px;
            margin: 12px 0;
          }
        }

        /* ==========================================================================
           MOBILE & TABLET RESPONSIVE OPTIMIZATION
           Mobile-first stack with compact campus hero banner, high-touch inputs,
           and smooth scrolling for any screen size.
           ========================================================================== */
        @media (max-width: 820px) {
          .freshy-auth-viewport {
            height: auto;
            min-height: 100dvh;
            padding: 10px 10px 24px;
            align-items: flex-start;
          }

          .freshy-auth-card {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
            min-height: auto;
            max-width: 440px;
            margin: 0 auto;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          }

          .desktop-only-flex {
            display: none !important;
          }

          /* Show sleek mobile campus hero banner */
          .freshy-mobile-banner {
            display: block;
            position: relative;
            height: 130px;
            width: 100%;
            overflow: hidden;
            background: #0f172a;
          }

          .freshy-mobile-banner-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.8s ease-in-out;
          }

          .freshy-mobile-banner-img.banner-active {
            opacity: 1;
          }

          .freshy-mobile-banner-scrim {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(15, 23, 42, 0.25) 0%,
              rgba(15, 23, 42, 0.85) 100%
            );
          }

          .freshy-mobile-banner-content {
            position: absolute;
            bottom: 12px;
            left: 14px;
            right: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 5;
          }

          .freshy-mobile-dots {
            position: absolute;
            top: 10px;
            right: 14px;
            display: flex;
            gap: 4px;
            z-index: 5;
          }

          .mobile-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.35);
            transition: all 0.3s ease;
          }

          .mobile-dot.dot-active {
            width: 14px;
            border-radius: 9999px;
            background: #ffffff;
          }

          .freshy-image-column {
            display: none;
          }

          .freshy-form-column {
            padding: 18px 18px 22px;
            overflow-y: visible;
          }

          .freshy-form-inner {
            max-width: 100%;
          }

          .freshy-sun-logo {
            width: 38px;
            height: 38px;
          }

          .freshy-title {
            font-size: 1.5rem;
          }

          .freshy-subtitle {
            font-size: 0.82rem;
            margin-bottom: 14px;
          }

          /* Mobile Touch Targets: 46px height + 16px font to prevent iOS zoom */
          .freshy-text-input {
            height: 46px;
            font-size: 16px;
            border-radius: 11px;
            padding: 8px 14px;
          }

          .freshy-sso-btn {
            height: 44px;
            font-size: 0.88rem;
            border-radius: 11px;
            gap: 12px;
          }

          .freshy-submit-btn {
            height: 46px;
            font-size: 0.94rem;
            border-radius: 11px;
            margin-top: 6px;
          }

          .freshy-signup-row {
            margin-top: 6px;
            font-size: 0.82rem;
          }

          .freshy-legal-disclaimer {
            margin-top: 14px;
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};
