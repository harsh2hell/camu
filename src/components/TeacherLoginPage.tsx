import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, GraduationCap, LifeBuoy, Mail, Copy, Check, X } from 'lucide-react';
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
    const lastRole = localStorage.getItem('dbs_last_user_role');
    const email = localStorage.getItem('dbs_last_user_email') || '';
    if (lastRole === 'FACULTY') {
      return email;
    }
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

  // Support Modal & Copy Email state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

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
      const session = await authApi.login(emailOrEmpId, password, 'FACULTY');
      localStorage.setItem('dbs_last_user_email', emailOrEmpId.trim());
      localStorage.setItem('dbs_last_user_role', 'FACULTY');
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
      const session = await authApi.loginWithGoogle('FACULTY');
      localStorage.setItem('dbs_last_user_email', session.email || 'rajesh.sharma@dgu.ac.in');
      localStorage.setItem('dbs_last_user_role', 'FACULTY');
      if (session.name) localStorage.setItem('dbs_last_user_name', session.name);
      localStorage.setItem('dbs_last_active_time', Date.now().toString());

      onLoginSuccess({ ...session, role: 'FACULTY' });
    } catch {
      setErrorMessage('Google Workspace SSO failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySupportEmail = () => {
    navigator.clipboard.writeText('support@dgu.ac.in');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="faculty-auth-viewport">
      
      {/* FLOATING TOP BAR: Liquid Glass Cylindrical Buttons */}
      <div className="faculty-floating-top-bar">
        {onSwitchToStudent && (
          <button 
            type="button" 
            className="liquid-glass-btn student-switch-glass"
            onClick={onSwitchToStudent}
            title="Go to Student Portal"
          >
            <GraduationCap size={16} className="glass-btn-icon" />
            <span className="glass-btn-text">Student? Login here</span>
            <span className="glass-btn-arrow">&rarr;</span>
          </button>
        )}

        <button 
          type="button" 
          className="liquid-glass-btn support-glass"
          onClick={() => setShowSupportModal(true)}
          title="Need IT or Academic Help?"
        >
          <LifeBuoy size={16} className="glass-btn-icon" />
          <span className="glass-btn-text">Support</span>
        </button>
      </div>

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

            {/* 2. Dynamic Titles: Returning vs. New Faculty */}
            <h1 className="faculty-title">
              {isReturningUser 
                ? (savedName ? `Welcome back, ${savedName.split(' ')[0]}!` : 'Welcome Back!')
                : 'Faculty Login'}
            </h1>
            <p className="faculty-subtitle">
              {isReturningUser
                ? 'Sign in to continue your academic session where you left off.'
                : 'Sign in with your official university credentials (@dgu.ac.in).'}
            </p>

            {/* Error Alert */}
            {errorMessage && (
              <div className="faculty-error-alert">
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 3. Single Clean SSO Button: Continue with DGU Workspace */}
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
                <span>Continue with DGU Workspace</span>
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
                  placeholder={isReturningUser ? savedEmail : "faculty@dgu.ac.in"}
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
                    placeholder="Enter your password"
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
                {isLoading ? 'Authenticating...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: 50-50 Balanced Faculty Photo Carousel */}
        <div 
          className="faculty-image-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`faculty-slide ${idx === activeSlide ? 'slide-active' : ''}`}
            >
              <img 
                src={slide.desktopImage || slide.image} 
                alt={slide.title} 
                className="faculty-slide-img"
              />
            </div>
          ))}

          {/* Bottom Vignette Gradient */}
          <div className="faculty-slide-gradient" />

          {/* Carousel Progress Bar & Captions */}
          <div className="faculty-slide-overlay-content">
            <div className="faculty-progress-bars">
              {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className="faculty-progress-track"
                  onClick={() => handleSelectSlide(idx)}
                >
                  <div 
                    className={`faculty-progress-fill ${
                      idx === activeSlide ? 'fill-animating' : idx < activeSlide ? 'fill-complete' : ''
                    }`}
                    key={idx === activeSlide ? progressKey : undefined}
                    style={{
                      animationDuration: `${SLIDE_DURATION}ms`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="faculty-caption-box">
              <h2 className="faculty-slide-title">
                {slides[activeSlide].title}
              </h2>
              <p className="faculty-slide-desc">
                {slides[activeSlide].desc}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* SUPPORT MODAL (Liquid Glass Design) */}
      {showSupportModal && (
        <div className="support-modal-backdrop" onClick={() => setShowSupportModal(false)}>
          <div className="support-glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="support-card-header">
              <div className="support-header-left">
                <div className="support-icon-badge">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="support-title">DBS University Support</h3>
                  <p className="support-subtitle">Academic ERP &amp; IT Help Desk</p>
                </div>
              </div>
              <button 
                type="button" 
                className="support-close-btn"
                onClick={() => setShowSupportModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="support-card-body">
              <div className="support-item">
                <span className="support-item-label">Technical Support Email:</span>
                <div className="support-email-row">
                  <span className="support-email-text">support@dgu.ac.in</span>
                  <button 
                    type="button" 
                    className="copy-email-btn"
                    onClick={handleCopySupportEmail}
                  >
                    {copiedEmail ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copiedEmail ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="support-item">
                <span className="support-item-label">Registrar Academic Office:</span>
                <span className="support-val-text">registrar@dgu.ac.in</span>
              </div>

              <div className="support-item">
                <span className="support-item-label">ERP Helpline:</span>
                <span className="support-val-text">+91 135 269 9100 (Ext: 104)</span>
              </div>

              <div className="support-item">
                <span className="support-item-label">Service Desk Hours:</span>
                <span className="support-val-text">Monday &ndash; Saturday, 9:00 AM &ndash; 5:30 PM IST</span>
              </div>

              <a 
                href="mailto:support@dgu.ac.in?subject=DBS%20Portal%20Login%20Support"
                className="direct-mail-cta"
              >
                <Mail size={16} />
                <span>Open Mail Client to support@dgu.ac.in</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-auth-viewport {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 24px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        /* FLOATING TOP GLASS BAR - ALIGNED TO RIGHT OF CARD */
        .faculty-floating-top-bar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 1040px;
          max-width: 95vw;
          gap: 12px;
          margin-bottom: 14px;
          z-index: 20;
        }

        /* LIQUID GLASS CYLINDRICAL BUTTON (NO HOVER ZOOM / POPUP) */
        .liquid-glass-btn {
          height: 40px;
          padding: 0 18px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 4px 14px -2px rgba(57, 12, 70, 0.08),
            0 1px 3px 0 rgba(0, 0, 0, 0.04);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
          font-weight: 600;
          color: #390c46;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .liquid-glass-btn:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(57, 12, 70, 0.3);
          color: #210529;
        }

        .liquid-glass-btn:active {
          background: #ffffff;
        }

        .glass-btn-icon {
          color: #562b63;
        }

        .glass-btn-arrow {
          font-weight: 700;
        }

        /* MAIN CARD */
        .faculty-auth-card {
          width: 1040px;
          max-width: 95vw;
          min-height: 580px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 
            0 20px 50px -10px rgba(15, 23, 42, 0.08),
            0 1px 3px 0 rgba(0, 0, 0, 0.02);
          border: 1px solid #f1f5f9;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        /* MOBILE BANNER */
        .faculty-mobile-banner {
          display: none;
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
        }

        .faculty-mobile-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
        }

        .faculty-mobile-banner-img.banner-active {
          opacity: 1;
        }

        .faculty-mobile-banner-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0.75) 100%);
        }

        .faculty-mobile-banner-brand {
          position: absolute;
          top: 14px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 3;
        }

        .faculty-mobile-dbs-logo {
          height: 32px;
          filter: brightness(0) invert(1);
        }

        .faculty-badge-pill {
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .faculty-mobile-dots {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 3;
        }

        .mobile-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transition: all 0.3s ease;
        }

        .mobile-dot.dot-active {
          width: 18px;
          border-radius: 3px;
          background: #ffffff;
        }

        /* LEFT FORM COLUMN (50%) */
        .faculty-form-column {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 44px 52px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .faculty-form-inner {
          width: 100%;
          max-width: 370px;
          display: flex;
          flex-direction: column;
          text-align: center;
        }

        .faculty-brand-emblem-wrap {
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
        }

        .faculty-dbs-main-logo {
          height: 52px;
          width: auto;
          object-fit: contain;
        }

        .faculty-title {
          font-size: 1.65rem;
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
          background: none;
          border: none;
          color: #390c46;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .faculty-forgot-link {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.75rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .faculty-forgot-link:hover {
          color: #0f172a;
        }

        .faculty-text-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
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
        }

        .faculty-submit-btn:active:not(:disabled) {
          background: #210529;
        }

        .faculty-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* RIGHT COLUMN: 50% Photo Carousel */
        .faculty-image-column {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #0f172a;
        }

        .faculty-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .faculty-slide.slide-active {
          opacity: 1;
        }

        .faculty-slide-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
        }

        .faculty-slide-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.88) 100%);
          pointer-events: none;
        }

        .faculty-slide-overlay-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 36px 36px 32px;
          color: #ffffff;
          z-index: 2;
        }

        .faculty-progress-bars {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }

        .faculty-progress-track {
          flex: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.28);
          border-radius: 2px;
          overflow: hidden;
          cursor: pointer;
        }

        .faculty-progress-fill {
          height: 100%;
          width: 0%;
          background: #ffffff;
        }

        .faculty-progress-fill.fill-complete {
          width: 100%;
        }

        .faculty-progress-fill.fill-animating {
          animation-name: progressLinear;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          background: #ec4899;
        }

        @keyframes progressLinear {
          from { width: 0%; }
          to { width: 100%; }
        }

        .faculty-caption-box {
          text-align: left;
        }

        .faculty-slide-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
          color: #ffffff;
        }

        .faculty-slide-desc {
          font-size: 0.82rem;
          line-height: 1.45;
          color: #e2e8f0;
          margin: 0;
        }

        /* SUPPORT MODAL (Liquid Glass) */
        .support-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .support-glass-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border-radius: 24px;
          border: 1.5px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 24px 60px -12px rgba(57, 12, 70, 0.25),
            0 2px 8px rgba(0, 0, 0, 0.04);
          padding: 28px;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .support-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .support-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .support-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #f5eff8;
          color: #562b63;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(86, 43, 99, 0.12);
        }

        .support-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .support-subtitle {
          font-size: 0.75rem;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .support-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .support-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .support-card-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: left;
        }

        .support-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .support-item-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
        }

        .support-email-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 10px;
        }

        .support-email-text {
          font-size: 0.88rem;
          font-weight: 700;
          color: #390c46;
          font-family: ui-monospace, monospace;
        }

        .copy-email-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .copy-email-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .text-emerald {
          color: #059669;
        }

        .support-val-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
        }

        .direct-mail-cta {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          background: #390c46;
          color: #ffffff;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.18s ease;
        }

        .direct-mail-cta:hover {
          background: #2a0834;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 900px) {
          /* Hide support button on mobile layout */
          .support-glass {
            display: none !important;
          }

          .faculty-auth-card {
            flex-direction: column;
            width: 100%;
            max-width: 440px;
            min-height: auto;
            border-radius: 20px;
          }

          .faculty-image-column {
            display: none;
          }

          .faculty-mobile-banner {
            display: block;
          }

          .faculty-form-column {
            padding: 24px 20px 32px;
          }
        }
      `}</style>
    </div>
  );
};
