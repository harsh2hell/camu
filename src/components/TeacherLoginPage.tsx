import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, GraduationCap } from 'lucide-react';
import { authApi, type UserSession } from '../api/auth';

interface TeacherLoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onSwitchToStudent?: () => void;
}

export const TeacherLoginPage: React.FC<TeacherLoginPageProps> = ({
  onLoginSuccess,
  onSwitchToStudent,
}) => {
  // Dynamic user detection: Returning vs. First-Time visitor
  const [savedEmail, setSavedEmail] = useState<string>(() => {
    const email = localStorage.getItem('dbs_last_user_email') || '';
    // If last email was faculty, prefill it
    return email.toLowerCase().includes('sharma') || email.toLowerCase().includes('faculty') || email.toLowerCase().includes('prof') 
      ? email 
      : '';
  });
  const [savedName, setSavedName] = useState<string>(() => {
    return localStorage.getItem('dbs_last_user_name') || '';
  });

  const isReturningUser = Boolean(savedEmail.trim());

  // Email/Faculty ID: Pre-fill ONLY for returning faculty; strictly empty for new users
  const [emailOrEmpId, setEmailOrEmpId] = useState<string>(() => {
    return savedEmail.trim();
  });

  // Password: MUST ALWAYS BE EMPTY BY DEFAULT
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2.5s Academic Carousel transition
  const SLIDE_DURATION = 2500;
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // Dedicated Faculty, Professorship & Academic Governance Slides
  interface SlideItem {
    desktopImage?: string;
    mobileImage?: string;
    image: string;
    title: string;
    desc: string;
  }

  const slides: SlideItem[] = [
    {
      image: '/dbs_academic_seminar.webp',
      title: 'Faculty Excellence & Academic Research',
      desc: 'Distinguished professorship, scholarly research publications, and structured student-faculty mentorship programs.',
    },
    {
      image: '/dbs_academic_lecture_hall.webp',
      title: 'Smart Amphitheatre Lecture Theatres',
      desc: 'Acoustic lecture halls equipped with hybrid capture systems, digital whiteboards, and real-time attendance syncing.',
    },
    {
      image: '/dbs_academic_conclave.webp',
      title: 'National Academic Board Conclaves',
      desc: 'Departmental boards of studies continuously modernizing syllabi to align with global business and industry demands.',
    },
    {
      image: '/dbs_academic_finance_suite.webp',
      title: 'Scholarly Research & Innovation Labs',
      desc: 'High-performance computing workstations and faculty incubation labs fostering next-generation intellectual property.',
    },
    {
      image: '/dbs_academic_guest_lecture.webp',
      title: 'Distinguished Keynote Auditoriums',
      desc: 'State-of-the-art auditoriums hosting national symposia, executive masterclasses, and international conferences.',
    },
  ];

  // Auto-advance timer: changes photos every 2.5s
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
    setEmailOrEmpId('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrEmpId.trim()) {
      setErrorMessage('Please enter your official university email or Employee ID.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(emailOrEmpId, password);
      localStorage.setItem('dbs_last_user_email', emailOrEmpId.trim());
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());

      onLoginSuccess({
        ...session,
        role: 'FACULTY',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid faculty credentials. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const session = await authApi.loginWithGoogle();
      localStorage.setItem('dbs_last_user_email', session.email || 'rajesh.sharma@dbs.edu.in');
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());
      onLoginSuccess({ ...session, role: 'FACULTY' });
    } catch {
      setErrorMessage('Google Workspace SSO failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="faculty-auth-viewport">
      <div className="faculty-auth-card">
        
        {/* MOBILE ONLY: Compact DBS Campus Hero Banner */}
        <div className="faculty-mobile-banner">
          {slides.map((slide, idx) => (
            <img 
              key={idx}
              src={slide.mobileImage || slide.image} 
              alt={slide.title} 
              className={`faculty-mobile-banner-img ${idx === activeSlide ? 'banner-active' : ''}`}
            />
          ))}
          <div className="faculty-mobile-banner-scrim" />
          <div className="faculty-mobile-banner-brand">
            <img 
              src="/dbs_logo_transparent.png" 
              alt="DBS Global University" 
              className="faculty-mobile-dbs-logo"
            />
            <span className="faculty-badge-pill">FACULTY &amp; STAFF</span>
          </div>
          <div className="faculty-mobile-dots">
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={`mobile-dot ${idx === activeSlide ? 'dot-active' : ''}`} 
              />
            ))}
          </div>
        </div>

        {/* LEFT COLUMN: Clean Form with 50-50 Symmetry */}
        <div className="faculty-form-column">
          <div className="faculty-form-inner">
            {/* 1. Official DBS Logo */}
            <div className="faculty-brand-emblem-wrap">
              <img 
                src="/dbs_logo_dark.png" 
                alt="DBS Global University" 
                className="faculty-dbs-main-logo"
              />
            </div>

            {/* Portal Badge Indicator */}
            <div className="faculty-domain-indicator">
              <span className="faculty-status-dot" />
              <strong>teacher.autonex.studio</strong>
              <span className="domain-sep">&bull;</span>
              <span>Faculty Gateway</span>
            </div>

            {/* 2. Dynamic Titles: Returning vs. New Faculty */}
            <h1 className="faculty-title">
              {isReturningUser 
                ? (savedName ? `Welcome back, ${savedName.split(' ')[0]}!` : 'Welcome Back!')
                : 'Faculty Gateway'}
            </h1>
            <p className="faculty-subtitle">
              {isReturningUser
                ? 'Sign in to continue your academic session where you left off.'
                : 'Sign in with your official university credentials (@dbs.edu.in).'}
            </p>

            {/* Error Alert */}
            {errorMessage && (
              <div className="faculty-error-alert">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 3. Single Clean SSO Button: Continue with Google Workspace */}
            <div className="faculty-sso-group">
              <button 
                type="button" 
                className="faculty-sso-btn"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="faculty-sso-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with DBS Workspace</span>
              </button>
            </div>

            {/* 4. OR Divider */}
            <div className="faculty-or-divider">
              <span className="or-line" />
              <span className="or-text">OR</span>
              <span className="or-line" />
            </div>

            {/* 5. Faculty Form */}
            <form onSubmit={handleLogin} className="faculty-fields-form">
              <div className="faculty-input-group">
                <div className="faculty-label-row">
                  <label className="faculty-input-label">University Email or Employee ID</label>
                  {isReturningUser && (
                    <button
                      type="button"
                      className="faculty-switch-user-btn"
                      onClick={handleSwitchAccount}
                    >
                      Switch account
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="faculty-text-input"
                  placeholder={isReturningUser ? savedEmail : "faculty.name@dbs.edu.in"}
                  value={emailOrEmpId}
                  onChange={(e) => setEmailOrEmpId(e.target.value)}
                  required
                />
              </div>

              <div className="faculty-input-group">
                <div className="faculty-label-row">
                  <label className="faculty-input-label">Password</label>
                  <button 
                    type="button" 
                    className="faculty-forgot-link"
                    onClick={() => alert('Faculty password reset instructions sent to your registered department email.')}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="faculty-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="faculty-text-input"
                    placeholder="Enter your faculty password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="faculty-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password view"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 6. Solid Plain DBS Deep Imperial Plum Submit Button */}
              <button 
                type="submit" 
                className="faculty-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Sign in to Faculty Suite'}
              </button>

              {/* 7. Switch to Student Portal Link */}
              <div className="faculty-student-switch-row">
                <span>Are you a student? </span>
                <button
                  type="button"
                  className="faculty-student-link"
                  onClick={onSwitchToStudent}
                >
                  <GraduationCap size={14} className="inline-icon" />
                  Go to Student Portal
                </button>
              </div>
            </form>

            {/* 8. Bottom Terms & Security Disclaimer */}
            <div className="faculty-legal-disclaimer">
              <div className="faculty-security-note">
                <ShieldCheck size={12} />
                <span>Authorized Faculty &amp; Academic Staff Access Only</span>
              </div>
              <span>By accessing you acknowledge DBS Global University </span>
              <a href="#it-policy" onClick={(e) => { e.preventDefault(); alert('DBS IT & Academic Security Policy'); }}>
                IT &amp; Security Policy
              </a>.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 50-50 Balanced Faculty Photo Carousel */}
        <div 
          className="faculty-image-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="faculty-image-card-container">
            {slides.map((slide, idx) => (
              <div 
                key={idx}
                className={`faculty-campus-photo-layer ${idx === activeSlide ? 'photo-active' : ''}`}
              >
                <img 
                  src={slide.desktopImage || slide.image} 
                  alt={slide.title} 
                  className="faculty-campus-photo"
                />
              </div>
            ))}
            
            <div className="faculty-image-scrim" />

            <div className="faculty-image-overlay-content">
              <div className="faculty-carousel-bars">
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

              <div key={activeSlide} className="faculty-slide-text-wrapper">
                <h2 className="faculty-slide-title">{slides[activeSlide].title}</h2>
                <p className="faculty-slide-desc">{slides[activeSlide].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .faculty-auth-viewport {
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

        .faculty-auth-card {
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

        .faculty-mobile-banner {
          display: none;
        }

        /* Left Column: Form */
        .faculty-form-column {
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

        .faculty-form-inner {
          max-width: 350px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }

        .faculty-brand-emblem-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 8px;
        }

        .faculty-dbs-main-logo {
          height: 38px;
          width: auto;
          max-width: 220px;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.03));
        }

        .faculty-domain-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.73rem;
          color: #390c46;
          background: rgba(57, 12, 70, 0.06);
          padding: 3px 10px;
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .faculty-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
        }

        .domain-sep {
          color: #94a3b8;
        }

        .faculty-title {
          font-size: 1.55rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .faculty-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.35;
        }

        .faculty-error-alert {
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.78rem;
          margin-bottom: 12px;
          text-align: left;
        }

        .faculty-sso-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }

        .faculty-sso-btn {
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
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .faculty-sso-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .faculty-sso-icon {
          width: 16px;
          height: 16px;
        }

        .faculty-or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 12px 0;
        }

        .faculty-or-divider .or-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .faculty-or-divider .or-text {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .faculty-fields-form {
          display: flex;
          flex-direction: column;
          gap: 11px;
          text-align: left;
        }

        .faculty-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .faculty-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faculty-input-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }

        .faculty-switch-user-btn {
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

        .faculty-switch-user-btn:hover {
          color: #0f172a;
        }

        .faculty-forgot-link {
          font-size: 0.74rem;
          color: #64748b;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .faculty-forgot-link:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        .faculty-text-input {
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

        .faculty-text-input:focus {
          border-color: #390c46;
          box-shadow: 0 0 0 3px rgba(57, 12, 70, 0.12);
        }

        .faculty-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .faculty-eye-btn {
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

        .faculty-eye-btn:hover {
          color: #0f172a;
        }

        /* Solid DBS Deep Imperial Plum Button */
        .faculty-submit-btn {
          width: 100%;
          height: 44px;
          background: #390c46;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(57, 12, 70, 0.25);
          transition: all 0.18s ease;
        }

        .faculty-submit-btn:hover:not(:disabled) {
          background: #2a0834;
          box-shadow: 0 6px 18px rgba(57, 12, 70, 0.35);
          transform: translateY(-1px);
        }

        .faculty-submit-btn:active:not(:disabled) {
          transform: translateY(0);
          background: #210529;
          box-shadow: 0 2px 8px rgba(57, 12, 70, 0.2);
        }

        .faculty-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* Switch to student link */
        .faculty-student-switch-row {
          text-align: center;
          font-size: 0.82rem;
          color: #64748b;
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .faculty-student-link {
          color: #0f172a;
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s ease;
        }

        .faculty-student-link:hover {
          color: #334155;
        }

        .inline-icon {
          color: #562b63;
        }

        /* Bottom Disclaimer */
        .faculty-legal-disclaimer {
          text-align: center;
          font-size: 0.68rem;
          color: #94a3b8;
          line-height: 1.45;
          margin-top: 20px;
        }

        .faculty-security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .faculty-legal-disclaimer a {
          color: #0f172a;
          font-weight: 600;
          text-decoration: underline;
          transition: color 0.15s ease;
        }

        .faculty-legal-disclaimer a:hover {
          color: #334155;
        }

        /* Right Column: Carousel */
        .faculty-image-column {
          padding: 10px;
          display: flex;
          height: 100%;
          box-sizing: border-box;
          user-select: none;
        }

        .faculty-image-card-container {
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

        .faculty-campus-photo-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          z-index: 1;
        }

        .faculty-campus-photo-layer.photo-active {
          opacity: 1;
          pointer-events: auto;
          z-index: 2;
        }

        .faculty-campus-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
        }

        .faculty-image-scrim {
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

        .faculty-image-overlay-content {
          position: relative;
          z-index: 10;
          padding: 22px 24px;
          color: #ffffff;
        }

        .faculty-carousel-bars {
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
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .faculty-slide-text-wrapper {
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

        .faculty-slide-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .faculty-slide-desc {
          font-size: 0.74rem;
          color: #cbd5e1;
          line-height: 1.4;
          max-width: 380px;
          opacity: 0.92;
        }

        /* Large desktop expansion */
        @media (min-height: 760px) and (min-width: 821px) {
          .faculty-auth-card {
            max-width: 1040px;
            max-height: 640px;
            grid-template-columns: 1fr 1fr;
            border-radius: 24px;
          }
          .faculty-form-column {
            padding: 30px 42px 24px;
          }
          .faculty-dbs-main-logo {
            height: 44px;
            max-width: 250px;
          }
          .faculty-title {
            font-size: 1.65rem;
          }
          .faculty-subtitle {
            font-size: 0.86rem;
            margin-bottom: 18px;
          }
          .faculty-submit-btn {
            height: 46px;
            font-size: 0.94rem;
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 820px) {
          .faculty-auth-viewport {
            height: auto;
            min-height: 100dvh;
            padding: 10px 10px 24px;
            align-items: flex-start;
          }

          .faculty-auth-card {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
            min-height: auto;
            max-width: 440px;
            margin: 0 auto;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          }

          .faculty-mobile-banner {
            display: block;
            position: relative;
            height: 130px;
            width: 100%;
            overflow: hidden;
            background: #1f0727;
          }

          .faculty-mobile-banner-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.75s ease-in-out;
          }

          .faculty-mobile-banner-img.banner-active {
            opacity: 1;
          }

          .faculty-mobile-banner-scrim {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(31, 7, 39, 0.25) 0%,
              rgba(31, 7, 39, 0.88) 100%
            );
          }

          .faculty-mobile-banner-brand {
            position: absolute;
            bottom: 12px;
            left: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 5;
          }

          .faculty-mobile-dbs-logo {
            height: 28px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
          }

          .faculty-badge-pill {
            font-size: 0.68rem;
            font-weight: 700;
            color: #ffffff;
            background: rgba(57, 12, 70, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 3px 8px;
            border-radius: 6px;
          }

          .faculty-mobile-dots {
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

          .faculty-image-column {
            display: none;
          }

          .faculty-form-column {
            padding: 22px 20px 24px;
            overflow-y: visible;
          }
        }
      `}</style>
    </div>
  );
};
