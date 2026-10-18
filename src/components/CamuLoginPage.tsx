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
  onLoginSuccess,
}) => {
  const isStudent = portalMode === 'student';

  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Dynamic user detection: Returning vs. First-Time visitor
  const [savedEmail, setSavedEmail] = useState<string>(() => {
    return localStorage.getItem('dbs_last_user_email') || '';
  });
  const [savedName, setSavedName] = useState<string>(() => {
    return localStorage.getItem('dbs_last_user_name') || '';
  });

  const isReturningUser = Boolean(savedEmail.trim());

  // Email/Roll: Pre-filled ONLY for returning users; strictly empty for new users
  const [emailOrRoll, setEmailOrRoll] = useState<string>(() => {
    return savedEmail.trim();
  });

  // Password: MUST ALWAYS BE EMPTY BY DEFAULT (for both new and returning users)
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // 2.5s Academic Carousel transition
  const SLIDE_DURATION = 2500; // 2.5 seconds per slide
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // Academic Slides interface supporting dedicated vertical desktop photos vs horizontal mobile photos
  interface SlideItem {
    desktopImage?: string;
    mobileImage?: string;
    image: string;
    title: string;
    desc: string;
  }

  const slides: SlideItem[] = [
    {
      image: '/dbs_campus_real.jpg',
      title: 'Himalayan Academic Campus',
      desc: 'An inspiring academic sanctuary nestled in the serene Doon Valley, engineered for holistic intellectual growth.',
    },
    {
      image: '/dbs_academic_conclave.webp',
      title: 'National Academic Conclaves',
      desc: 'Undergraduate and postgraduate research symposiums solving next-generation industry and business challenges.',
    },
    {
      image: '/dbs_academic_seminar.webp',
      title: 'Faculty Excellence & Mentorship',
      desc: 'Distinguished professorship, scholarly achievement awards, and continuous student-faculty research guidance.',
    },
    {
      image: '/dbs_academic_finance_suite.webp',
      title: 'Scholarly Research & Innovation',
      desc: 'Developing critical thinkers, entrepreneurs, and global scholars ready to lead tomorrow’s knowledge economy.',
    },
    {
      image: '/dbs_academic_ai_summit.webp',
      title: 'Global Tech & AI Summits',
      desc: 'Interactive keynotes and masterclasses hosted with international industry leaders and academic pioneers.',
    },
    {
      image: '/dbs_academic_lecture_hall.webp',
      title: 'Interactive Smart Lecture Theatres',
      desc: 'Tiered academic amphitheatres equipped for hybrid learning, case study workshops, and faculty lectures.',
    },
    {
      image: '/dbs_academic_guest_lecture.webp',
      title: 'Distinguished Keynote Auditoriums',
      desc: 'Smart acoustic auditoriums designed for national conventions, executive masterclasses, and academic discourse.',
    },
    {
      image: '/dbs_academic_genesis.webp',
      title: 'Innovation & Youth Conclaves',
      desc: 'Empowering future leaders through student incubation, multidisciplinary symposia, and creative summits.',
    },
    {
      image: '/dbs_fresher.webp',
      title: 'Vibrant Academic Student Community',
      desc: 'A collaborative, energetic student body united by intellectual curiosity, cultural diversity, and leadership.',
    },
  ];

  // Auto-advance timer: changes photos every 2.5s with silky cross-fade
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

  const handleSwitchAccount = () => {
    localStorage.removeItem('dbs_last_user_email');
    localStorage.removeItem('dbs_last_user_name');
    setSavedEmail('');
    setSavedName('');
    setEmailOrRoll('');
    setPassword('');
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
      // Persist email & name for returning user detection
      localStorage.setItem('dbs_last_user_email', emailOrRoll.trim());
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());

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
      localStorage.setItem('dbs_last_user_email', session.email || 'harsh.23cse@dbs.edu.in');
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
      onLoginSuccess({ ...session, role: isStudent ? 'STUDENT' : 'FACULTY' });
    } catch {
      setErrorMessage('Google SSO failed.');
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
              src={slide.mobileImage || slide.image} 
              alt={slide.title} 
              className={`freshy-mobile-banner-img ${idx === activeSlide ? 'banner-active' : ''}`}
            />
          ))}
          <div className="freshy-mobile-banner-scrim"></div>
          <div className="freshy-mobile-banner-brand">
            <img 
              src="/dbs_logo_transparent.png" 
              alt="DBS Global University" 
              className="freshy-mobile-dbs-logo"
            />
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

        {/* LEFT COLUMN: Clean Form with Generous Breathing Room */}
        <div className="freshy-form-column">
          <div className="freshy-form-inner">
            {/* 1. Official Transparent DBS Global University Logo */}
            <div className="freshy-brand-emblem-wrap">
              <img 
                src="/dbs_logo_dark.png" 
                alt="DBS Global University" 
                className="freshy-dbs-main-logo"
              />
            </div>

            {/* 2. Dynamic Titles: Returning User vs. New First-Time Customer */}
            <h1 className="freshy-title">
              {isReturningUser 
                ? (savedName ? `Welcome back, ${savedName.split(' ')[0]}!` : 'Welcome Back!')
                : (isStudent ? 'Welcome!' : 'Faculty Gateway')}
            </h1>
            <p className="freshy-subtitle">
              {isReturningUser
                ? 'Sign in to continue where you left off.'
                : (isStudent 
                    ? 'Sign in to access your student portal.' 
                    : 'Sign in to access DBS Global University Faculty Suite.')}
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="freshy-error-alert">
                <span>{errorMessage}</span>
              </div>
            )}

            {!isRegisterMode ? (
              <>
                {/* 3. Single Clean SSO Button: Continue with Google */}
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
                    <div className="freshy-label-row">
                      <label className="freshy-input-label">Email address</label>
                      {isReturningUser && (
                        <button
                          type="button"
                          className="freshy-switch-user-btn"
                          onClick={handleSwitchAccount}
                        >
                          Switch account
                        </button>
                      )}
                    </div>
                    <input
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="freshy-text-input"
                      placeholder={isReturningUser ? savedEmail : "name@dbs.edu.in"}
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

                  {/* 7. Sign up switcher with clear separation */}
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

            {/* 8. Bottom Terms Disclaimer with Generous Breathing Room */}
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

        {/* RIGHT COLUMN: Interactive 2.5s Academic Cross-fading Carousel (Zero Second Logo on Desktop) */}
        <div 
          className="freshy-image-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="freshy-image-card-container">
            {/* Cross-fading stacked academic photos with natural un-cropped framing */}
            {slides.map((slide, idx) => (
              <div 
                key={idx}
                className={`freshy-campus-photo-layer ${idx === activeSlide ? 'photo-active' : ''}`}
              >
                <img 
                  src={slide.desktopImage || slide.image} 
                  alt={slide.title} 
                  className="freshy-campus-photo"
                />
              </div>
            ))}
            
            {/* Bottom Dark Gradient Scrim */}
            <div className="freshy-image-scrim"></div>

            {/* Overlaid Captions and Time-Card Pagination Lines */}
            <div className="freshy-image-overlay-content">
              {/* 9-Dot/Dash Academic Progress Indicators */}
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
           Clean, airy spacing matching reference mockup.
           No cramped bottom elements; generous breathing room throughout.
           ========================================================================== */
        
        .freshy-auth-viewport {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          box-sizing: border-box;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .freshy-auth-card {
          width: 100%;
          max-width: 1020px;
          height: calc(100dvh - 36px);
          max-height: 600px;
          min-height: 480px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 16px 48px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04);
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          position: relative;
        }

        /* MOBILE BANNER: Hidden on desktop */
        .freshy-mobile-banner {
          display: none;
        }

        /* LEFT FORM COLUMN: Centered vertically with comfortable padding */
        .freshy-form-column {
          padding: 24px 38px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .freshy-form-inner {
          max-width: 350px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }

        /* 1. Official Transparent DBS Global University Logo */
        .freshy-brand-emblem-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 10px;
        }

        .freshy-dbs-main-logo {
          height: 38px;
          width: auto;
          max-width: 220px;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.03));
        }

        /* 2. Titles */
        .freshy-title {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .freshy-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.35;
        }

        .freshy-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.74rem;
          margin-bottom: 10px;
          text-align: center;
        }

        /* 3. SSO Button */
        .freshy-sso-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }

        .freshy-sso-btn {
          width: 100%;
          height: 40px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.85rem;
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
          width: 16px;
          height: 16px;
        }

        /* 4. OR Divider */
        .freshy-or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 12px 0;
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
          letter-spacing: 0.05em;
        }

        /* 5. Form Fields */
        .freshy-fields-form {
          display: flex;
          flex-direction: column;
          gap: 11px;
          text-align: left;
        }

        .freshy-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .freshy-input-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }

        .freshy-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .freshy-forgot-link {
          font-size: 0.74rem;
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

        .freshy-switch-user-btn {
          font-size: 0.74rem;
          color: #475569;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: color 0.15s ease;
        }

        .freshy-switch-user-btn:hover {
          color: #0f172a;
        }

        .freshy-text-input {
          width: 100%;
          height: 40px;
          padding: 8px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.86rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .freshy-text-input:focus {
          border-color: #562b63;
          box-shadow: 0 0 0 3px rgba(86, 43, 99, 0.12);
        }

        .freshy-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .freshy-eye-btn {
          position: absolute;
          right: 12px;
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

        /* 6. Solid DBS Plain Purple Log In Button (No gradient mix) */
        .freshy-submit-btn {
          width: 100%;
          height: 44px;
          background: #562b63;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(86, 43, 99, 0.22);
          transition: all 0.18s ease;
        }

        .freshy-submit-btn:hover:not(:disabled) {
          background: #461f52;
          box-shadow: 0 6px 18px rgba(86, 43, 99, 0.32);
          transform: translateY(-1px);
        }

        .freshy-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          background: #3b1746;
          box-shadow: 0 2px 8px rgba(86, 43, 99, 0.2);
        }

        .freshy-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* 7. Sign up switcher with clear separation & normal black color */
        .freshy-signup-row {
          text-align: center;
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 12px;
        }

        .freshy-signup-link {
          color: #0f172a;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          transition: color 0.15s ease;
        }

        .freshy-signup-link:hover {
          color: #334155;
        }

        /* 8. Bottom Terms Disclaimer with normal black link colors */
        .freshy-legal-disclaimer {
          text-align: center;
          font-size: 0.68rem;
          color: #94a3b8;
          line-height: 1.45;
          margin-top: 20px;
        }

        .freshy-legal-disclaimer a {
          color: #0f172a;
          font-weight: 600;
          text-decoration: underline;
          transition: color 0.15s ease;
        }

        .freshy-legal-disclaimer a:hover {
          color: #334155;
        }

        /* ==========================================================================
           RIGHT COLUMN: 2.5S TIMED ACADEMIC CAROUSEL
           Natural, uncropped framing without artificial zoom or second logo on desktop.
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
          background: #1f0727;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        /* Stacked Photo Layers: Natural framing, zero artificial zoom */
        .freshy-campus-photo-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1);
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
          object-position: center 25%; /* Keeps professors, students and campus facades properly centered */
        }

        /* Bottom Dark Gradient Scrim */
        .freshy-image-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.0) 0%,
            rgba(31, 7, 39, 0.15) 40%,
            rgba(31, 7, 39, 0.85) 75%,
            rgba(31, 7, 39, 0.98) 100%
          );
          z-index: 3;
          pointer-events: none;
        }

        .freshy-image-overlay-content {
          position: relative;
          z-index: 10;
          padding: 22px 24px;
          color: #ffffff;
        }

        /* Timed Progress Carousel Bars (Compact for 9 slides) */
        .freshy-carousel-bars {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .carousel-bar-line {
          position: relative;
          height: 3px;
          width: 9px;
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
          width: 24px;
          background: rgba(255, 255, 255, 0.3);
        }

        /* Animated Progress Fill with DBS Vibrant Magenta-Pink Gradient */
        .carousel-bar-progress {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 0%;
          background: linear-gradient(90deg, #d946ef, #ff3366);
          border-radius: 9999px;
          animation: fillProgress linear forwards;
          box-shadow: 0 0 8px rgba(217, 70, 239, 0.8);
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
            max-width: 1040px;
            max-height: 640px;
            grid-template-columns: 1fr 1fr;
            border-radius: 24px;
          }
          .freshy-form-column {
            padding: 30px 42px 24px;
          }
          .freshy-dbs-main-logo {
            height: 44px;
            max-width: 250px;
          }
          .freshy-brand-emblem-wrap {
            margin-bottom: 12px;
          }
          .freshy-title {
            font-size: 1.65rem;
            margin-bottom: 6px;
          }
          .freshy-subtitle {
            font-size: 0.86rem;
            margin-bottom: 18px;
          }
          .freshy-sso-group {
            margin-bottom: 16px;
          }
          .freshy-sso-btn {
            height: 44px;
            font-size: 0.88rem;
          }
          .freshy-or-divider {
            margin: 14px 0;
          }
          .freshy-fields-form {
            gap: 12px;
          }
          .freshy-text-input {
            height: 42px;
            font-size: 0.88rem;
            padding: 9px 14px;
          }
          .freshy-submit-btn {
            height: 46px;
            font-size: 0.94rem;
            margin-top: 10px;
          }
          .freshy-signup-row {
            margin-top: 14px;
            font-size: 0.84rem;
          }
          .freshy-legal-disclaimer {
            margin-top: 24px;
            font-size: 0.7rem;
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
            width: 28px;
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

          /* Show sleek mobile campus hero banner */
          .freshy-mobile-banner {
            display: block;
            position: relative;
            height: 130px;
            width: 100%;
            overflow: hidden;
            background: #1f0727;
          }

          .freshy-mobile-banner-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.75s ease-in-out;
          }

          .freshy-mobile-banner-img.banner-active {
            opacity: 1;
          }

          .freshy-mobile-banner-scrim {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(31, 7, 39, 0.25) 0%,
              rgba(31, 7, 39, 0.88) 100%
            );
          }

          .freshy-mobile-banner-brand {
            position: absolute;
            bottom: 12px;
            left: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            z-index: 5;
          }

          .freshy-mobile-dbs-logo {
            height: 28px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
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
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.35);
            transition: all 0.3s ease;
          }

          .mobile-dot.dot-active {
            width: 14px;
            border-radius: 9999px;
            background: linear-gradient(90deg, #d946ef, #ff3366);
            box-shadow: 0 0 6px rgba(217, 70, 239, 0.7);
          }

          .freshy-image-column {
            display: none;
          }

          .freshy-form-column {
            padding: 22px 20px 24px;
            overflow-y: visible;
          }

          .freshy-form-inner {
            max-width: 100%;
          }

          .freshy-dbs-main-logo {
            height: 38px;
            max-width: 200px;
          }

          .freshy-title {
            font-size: 1.55rem;
          }

          .freshy-subtitle {
            font-size: 0.84rem;
            margin-bottom: 16px;
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
            margin-top: 8px;
          }

          .freshy-signup-row {
            margin-top: 10px;
            font-size: 0.84rem;
          }

          .freshy-legal-disclaimer {
            margin-top: 18px;
            font-size: 0.72rem;
          }
        }
      `}</style>
    </div>
  );
};
