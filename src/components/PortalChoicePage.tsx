import React, { useState, useEffect } from 'react';
import { User, Award, ArrowRight, LifeBuoy, Mail, Copy, Check, X } from 'lucide-react';

interface PortalChoicePageProps {
  onSelectPortal: (portal: 'student' | 'teacher') => void;
}

export const PortalChoicePage: React.FC<PortalChoicePageProps> = ({ onSelectPortal }) => {
  const currentHostname = window.location.hostname;
  const isCustomDomain = currentHostname.includes('autonex.studio') || currentHostname.includes('dgu.');

  // 2.5s Academic Carousel transition matching login page
  const SLIDE_DURATION = 2500;
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // Support Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  interface SlideItem {
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

  const handlePortalClick = (target: 'student' | 'teacher') => {
    if (isCustomDomain && !currentHostname.startsWith('student.') && !currentHostname.startsWith('teacher.')) {
      const baseDomain = currentHostname.replace(/^www\./, '');
      const targetSubdomain = target === 'student' ? 'student.' : 'teacher.';
      window.location.href = `${window.location.protocol}//${targetSubdomain}${baseDomain}`;
      return;
    }
    onSelectPortal(target);
  };

  const handleCopySupportEmail = () => {
    navigator.clipboard.writeText('support@dgu.ac.in');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="choice-auth-viewport">
      
      {/* FLOATING TOP BAR: Liquid Glass Support Button */}
      <div className="choice-floating-top-bar">
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

      {/* CENTERED 50-50 CARD: EXACT MATCH TO LOGIN PAGE UI DESIGN */}
      <div className="choice-auth-card">

        {/* MOBILE ONLY: Hero Banner */}
        <div className="choice-mobile-banner">
          {slides.map((slide, idx) => (
            <img 
              key={idx}
              src={slide.image} 
              alt={slide.title} 
              className={`choice-mobile-banner-img ${idx === activeSlide ? 'banner-active' : ''}`}
            />
          ))}
          <div className="choice-mobile-banner-scrim" />
          <div className="choice-mobile-banner-brand">
            <img 
              src="/dbs_logo_transparent.png" 
              alt="DBS Global University" 
              className="choice-mobile-dbs-logo"
            />
          </div>
          <div className="choice-mobile-dots">
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={`mobile-dot ${idx === activeSlide ? 'dot-active' : ''}`} 
              />
            ))}
          </div>
        </div>

        {/* LEFT COLUMN: 50% Choice Selection */}
        <div className="choice-form-column">
          <div className="choice-form-inner">
            {/* 1. DBS University Logo */}
            <div className="choice-brand-emblem-wrap">
              <img 
                src="/dbs_logo_dark.png" 
                alt="DBS Global University" 
                className="choice-dbs-main-logo"
              />
            </div>

            {/* 2. Welcome Heading */}
            <h1 className="choice-title">Welcome!</h1>
            <p className="choice-subtitle">
              Select your designated academic portal to sign in.
            </p>

            {/* 3. TWO MINIMALIST PORTAL CHOICE CARDS */}
            <div className="choice-tiles-group">
              
              {/* Option 1: Student Portal */}
              <div 
                className="portal-choice-tile student-tile"
                onClick={() => handlePortalClick('student')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePortalClick('student'); }}
              >
                <div className="tile-left-icon student-icon-bg">
                  <User size={20} />
                </div>
                <div className="tile-content">
                  <span className="tile-title">I'm a Student</span>
                </div>
                <div className="tile-arrow-circle">
                  <ArrowRight size={17} />
                </div>
              </div>

              {/* Option 2: Faculty Gateway */}
              <div 
                className="portal-choice-tile faculty-tile"
                onClick={() => handlePortalClick('teacher')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePortalClick('teacher'); }}
              >
                <div className="tile-left-icon faculty-icon-bg">
                  <Award size={20} />
                </div>
                <div className="tile-content">
                  <span className="tile-title">I'm a Faculty</span>
                </div>
                <div className="tile-arrow-circle">
                  <ArrowRight size={17} />
                </div>
              </div>

            </div>

            {/* 4. Bottom Support Link */}
            <div className="choice-bottom-note">
              <span>Need help signing in? </span>
              <button 
                type="button" 
                className="choice-support-link"
                onClick={() => setShowSupportModal(true)}
              >
                Contact Support Desk
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: 50% Photo Carousel Matching Login Page */}
        <div 
          className="choice-image-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`choice-slide ${idx === activeSlide ? 'slide-active' : ''}`}
            >
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="choice-slide-img"
              />
            </div>
          ))}

          {/* Bottom Vignette Gradient */}
          <div className="choice-slide-gradient" />

          {/* Carousel Progress Bar & Captions */}
          <div className="choice-slide-overlay-content">
            <div className="choice-progress-bars">
              {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className="choice-progress-track"
                  onClick={() => handleSelectSlide(idx)}
                >
                  <div 
                    className={`choice-progress-fill ${
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

            <div className="choice-caption-box">
              <h2 className="choice-slide-title">
                {slides[activeSlide].title}
              </h2>
              <p className="choice-slide-desc">
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
                <span className="support-item-label">ERP Helpline Phone:</span>
                <span className="support-val-text">+91 135 269 9100 (Ext: 104)</span>
              </div>

              <div className="support-item">
                <span className="support-item-label">Service Desk Hours:</span>
                <span className="support-val-text">Monday &ndash; Saturday, 9:00 AM &ndash; 5:30 PM IST</span>
              </div>

              <a 
                href="mailto:support@dgu.ac.in?subject=DBS%20Portal%20Access%20Support"
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
        .choice-auth-viewport {
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

        /* FLOATING TOP GLASS BAR */
        .choice-floating-top-bar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 1040px;
          max-width: 95vw;
          margin-bottom: 14px;
          z-index: 20;
          animation: fadeInDown 0.3s ease;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* LIQUID GLASS CYLINDRICAL BUTTON */
        .liquid-glass-btn {
          height: 40px;
          padding: 0 18px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 8px 24px -4px rgba(57, 12, 70, 0.08),
            0 2px 6px 0 rgba(0, 0, 0, 0.04),
            inset 0 1px 1px rgba(255, 255, 255, 0.9);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
          font-weight: 600;
          color: #390c46;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .liquid-glass-btn:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(57, 12, 70, 0.3);
          color: #210529;
        }

        .glass-btn-icon {
          color: #562b63;
        }

        /* 50-50 CARD CONTAINER */
        .choice-auth-card {
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
        .choice-mobile-banner {
          display: none;
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
        }

        .choice-mobile-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
        }

        .choice-mobile-banner-img.banner-active {
          opacity: 1;
        }

        .choice-mobile-banner-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0.75) 100%);
        }

        .choice-mobile-banner-brand {
          position: absolute;
          top: 14px;
          left: 16px;
          z-index: 3;
        }

        .choice-mobile-dbs-logo {
          height: 32px;
          filter: brightness(0) invert(1);
        }

        .choice-mobile-dots {
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
        .choice-form-column {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 44px 50px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .choice-form-inner {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          text-align: center;
        }

        .choice-brand-emblem-wrap {
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
        }

        .choice-dbs-main-logo {
          height: 52px;
          width: auto;
          object-fit: contain;
        }

        .choice-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .choice-subtitle {
          font-size: 0.84rem;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.35;
        }

        /* TILES GROUP - MINIMALIST DESIGN */
        .choice-tiles-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        .portal-choice-tile {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .portal-choice-tile:hover {
          border-color: #390c46;
          background: #faf5ff;
        }

        .tile-left-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .student-icon-bg {
          background: #f5eff8;
          color: #390c46;
          border: 1px solid rgba(57, 12, 70, 0.1);
        }

        .faculty-icon-bg {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }

        .portal-choice-tile:hover .student-icon-bg {
          background: #390c46;
          color: #ffffff;
        }

        .portal-choice-tile:hover .faculty-icon-bg {
          background: #390c46;
          color: #ffffff;
          border-color: #390c46;
        }

        .tile-content {
          flex: 1;
        }

        .tile-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
          font-family: inherit;
        }

        .portal-choice-tile:hover .tile-title {
          color: #390c46;
        }

        .tile-arrow-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .portal-choice-tile:hover .tile-arrow-circle {
          background: #390c46;
          border-color: #390c46;
          color: #ffffff;
        }

        /* BOTTOM SUPPORT */
        .choice-bottom-note {
          margin-top: 24px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .choice-support-link {
          background: none;
          border: none;
          color: #390c46;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .choice-support-link:hover {
          color: #1e0525;
        }

        /* RIGHT COLUMN: 50% Photo Carousel */
        .choice-image-column {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #0f172a;
        }

        .choice-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .choice-slide.slide-active {
          opacity: 1;
        }

        .choice-slide-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
        }

        .choice-slide-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.88) 100%);
          pointer-events: none;
        }

        .choice-slide-overlay-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 36px 36px 32px;
          color: #ffffff;
          z-index: 2;
        }

        .choice-progress-bars {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }

        .choice-progress-track {
          flex: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.28);
          border-radius: 2px;
          overflow: hidden;
          cursor: pointer;
        }

        .choice-progress-fill {
          height: 100%;
          width: 0%;
          background: #ffffff;
        }

        .choice-progress-fill.fill-complete {
          width: 100%;
        }

        .choice-progress-fill.fill-animating {
          animation-name: progressLinear;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          background: #ec4899;
        }

        @keyframes progressLinear {
          from { width: 0%; }
          to { width: 100%; }
        }

        .choice-caption-box {
          text-align: left;
        }

        .choice-slide-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
          color: #ffffff;
        }

        .choice-slide-desc {
          font-size: 0.82rem;
          line-height: 1.45;
          color: #e2e8f0;
          margin: 0;
        }

        /* SUPPORT MODAL */
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
          .choice-auth-card {
            flex-direction: column;
            width: 100%;
            max-width: 440px;
            min-height: auto;
            border-radius: 20px;
          }

          .choice-image-column {
            display: none;
          }

          .choice-mobile-banner {
            display: block;
          }

          .choice-form-column {
            padding: 24px 20px 32px;
          }
        }
      `}</style>
    </div>
  );
};
