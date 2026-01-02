"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="landing-page" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Hero Section */}
      <section className="hero-section" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #fbbf24 100%)',
      }}>
        {/* Animated Solar Theme Background */}
        <div className="hero-bg-solar" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 0,
          opacity: 0.3,
        }}>
          {/* Animated Sun */}
          <div className="sun" style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 100%)',
            top: '10%',
            right: '10%',
            boxShadow: '0 0 60px #fbbf24, 0 0 120px #f59e0b',
            animation: 'sunPulse 4s infinite ease-in-out',
          }}>
            {/* Sun Rays */}
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: '4px',
                height: '80px',
                background: 'linear-gradient(to bottom, #fbbf24, transparent)',
                top: '50%',
                left: '50%',
                transformOrigin: '2px 0',
                transform: `rotate(${i * 30}deg) translateY(-100px)`,
                opacity: 0.6,
                animation: `rayRotate 20s linear infinite`,
              }} />
            ))}
          </div>

          {/* Solar Panels Grid */}
          <div className="solar-panels" style={{
            position: 'absolute',
            bottom: '15%',
            left: '5%',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            transform: 'perspective(600px) rotateX(45deg)',
            animation: 'panelFloat 6s infinite ease-in-out',
          }}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                width: '60px',
                height: '90px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                border: '2px solid #1e3a8a',
                borderRadius: '4px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                position: 'relative',
                animation: `panelShine ${3 + (i % 3)}s infinite ease-in-out`,
                animationDelay: `${i * 0.2}s`,
              }}>
                {/* Panel Grid Lines */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: '#1e3a8a',
                }} />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  width: '1px',
                  background: '#1e3a8a',
                }} />
              </div>
            ))}
          </div>

          {/* Surveyor Silhouettes */}
          <div className="surveyors" style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
          }}>
            {/* Surveyor 1 - Standing with tablet */}
            <div style={{
              position: 'absolute',
              animation: 'surveyor1 8s infinite ease-in-out',
            }}>
              <svg width="80" height="120" viewBox="0 0 80 120" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {/* Body */}
                <ellipse cx="40" cy="30" rx="12" ry="15" fill="#f59e0b" />
                <rect x="35" y="44" width="10" height="30" fill="#f59e0b" rx="2" />
                {/* Legs */}
                <rect x="35" y="72" width="4" height="25" fill="#d97706" rx="2" />
                <rect x="41" y="72" width="4" height="25" fill="#d97706" rx="2" />
                {/* Arms - holding tablet */}
                <rect x="28" y="48" width="4" height="18" fill="#f59e0b" rx="2" />
                <rect x="48" y="48" width="4" height="18" fill="#f59e0b" rx="2" />
                {/* Tablet */}
                <rect x="28" y="60" width="24" height="16" fill="#1e3a8a" rx="2" stroke="#60a5fa" strokeWidth="1" />
                {/* Head */}
                <circle cx="40" cy="22" r="10" fill="#fbbf24" />
                {/* Hard hat */}
                <ellipse cx="40" cy="18" rx="11" ry="6" fill="#f59e0b" />
              </svg>
            </div>

            {/* Surveyor 2 - Kneeling and working */}
            <div style={{
              position: 'absolute',
              left: '100px',
              animation: 'surveyor2 6s infinite ease-in-out',
            }}>
              <svg width="80" height="100" viewBox="0 0 80 100" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {/* Body - kneeling position */}
                <ellipse cx="40" cy="50" rx="12" ry="15" fill="#f59e0b" />
                <rect x="35" y="64" width="10" height="20" fill="#f59e0b" rx="2" />
                {/* Legs - bent */}
                <rect x="30" y="78" width="4" height="15" fill="#d97706" rx="2" transform="rotate(-20 32 78)" />
                <rect x="46" y="78" width="4" height="15" fill="#d97706" rx="2" transform="rotate(20 48 78)" />
                {/* Arms - working */}
                <rect x="25" y="54" width="4" height="20" fill="#f59e0b" rx="2" transform="rotate(-30 27 54)" />
                <rect x="51" y="54" width="4" height="20" fill="#f59e0b" rx="2" transform="rotate(30 53 54)" />
                {/* Head */}
                <circle cx="40" cy="42" r="10" fill="#fbbf24" />
                {/* Hard hat */}
                <ellipse cx="40" cy="38" rx="11" ry="6" fill="#f59e0b" />
              </svg>
            </div>
          </div>

          {/* Floating Tech Icons */}
          <div className="tech-icons" style={{
            position: 'absolute',
            top: '30%',
            left: '10%',
            animation: 'iconFloat 8s infinite ease-in-out',
          }}>
            <div style={{ fontSize: '3rem', opacity: 0.4, animation: 'rotate 20s linear infinite' }}>📐</div>
          </div>
          <div className="tech-icons" style={{
            position: 'absolute',
            top: '60%',
            right: '5%',
            animation: 'iconFloat 10s infinite ease-in-out 2s',
          }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.4, animation: 'rotate 15s linear infinite reverse' }}>🔌</div>
          </div>
          <div className="tech-icons" style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            animation: 'iconFloat 12s infinite ease-in-out 4s',
          }}>
            <div style={{ fontSize: '2.8rem', opacity: 0.4 }}>⚡</div>
          </div>

          {/* Energy Waves */}
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '10%',
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, transparent, #fbbf24, transparent)`,
              opacity: 0.3,
              animation: `energyWave ${4 + i}s infinite ease-in-out`,
              animationDelay: `${i * 1.3}s`,
            }} />
          ))}
        </div>

        {/* Overlay for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 0,
        }} />

        {/* Hero Content */}
        <div className="hero-content" style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {/* Solar Icon */}
          <div className="hero-icon" style={{
            fontSize: '5rem',
            marginBottom: '1.5rem',
            animation: 'fadeInDown 1s ease-out',
          }}>
            ☀️
          </div>

          <h1 className="hero-title" style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '1.5rem',
            lineHeight: 1.2,
            animation: 'fadeInUp 1s ease-out 0.2s backwards',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            Solar AI Platform
          </h1>

          <p className="hero-subtitle" style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '3rem',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: 1.6,
            animation: 'fadeInUp 1s ease-out 0.4s backwards',
          }}>
            Revolutionize your solar projects with AI-powered analysis, intelligent design tools, and automated reporting
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta" style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeInUp 1s ease-out 0.6s backwards',
          }}>
            <Link href="/projects" className="cta-primary" style={{
              padding: '1.2rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              background: '#ffffff',
              color: '#667eea',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              display: 'inline-block',
            }}>
              Get Started →
            </Link>
            <a href="#features" className="cta-secondary" style={{
              padding: '1.2rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50px',
              textDecoration: 'none',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'inline-block',
            }}>
              Learn More
            </a>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-indicator" style={{
            position: 'absolute',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'bounce 2s infinite',
          }}>
            <div style={{
              width: '30px',
              height: '50px',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '25px',
              position: 'relative',
            }}>
              <div style={{
                width: '6px',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '3px',
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                animation: 'scroll 2s infinite',
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section" style={{
        padding: '6rem 2rem',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-heading" style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}>
            Powerful Features
          </h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginBottom: '4rem',
            maxWidth: '600px',
            margin: '0 auto 4rem',
          }}>
            Everything you need to design, analyze, and deploy solar installations with confidence
          </p>

          <div className="features-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            {/* Feature 1 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Visual Geometry Editor
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Draw roof planes and mark obstructions with our intuitive map-based editor. Upload site images for pixel-perfect accuracy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                AI-Powered Analysis
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Automated roof risk assessment, electrical capacity analysis, and shading calculations powered by machine learning.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Smart Panel Layout
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Automatically optimize panel placement for maximum energy production. Simple mode for surveyors, advanced mode for engineers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Instant Reports
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Generate professional PDF reports with system specifications, energy estimates, and financial projections in seconds.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Mobile First
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Fully responsive design optimized for site surveyors working on tablets and mobile devices in the field.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              padding: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Secure & Scalable
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Enterprise-grade security with PostgreSQL database, async processing with Celery, and RESTful API architecture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section" style={{
        padding: '5rem 2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center',
          }}>
            <div className="stat-item">
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>∞</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Projects Supported</div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>24/7</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>AI Processing</div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>100%</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Accuracy Focused</div>
            </div>
            <div className="stat-item">
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>⚡</div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Lightning Fast</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{
        padding: '6rem 2rem',
        background: 'var(--bg-secondary)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: 'var(--text-primary)',
          }}>
            Ready to Transform Your Solar Workflow?
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            lineHeight: 1.6,
          }}>
            Join the future of solar project design and analysis. Start your first project today.
          </p>
          <Link href="/projects" className="cta-launch" style={{
            padding: '1.2rem 3rem',
            fontSize: '1.2rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            borderRadius: '50px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            display: 'inline-block',
          }}>
            Launch Platform →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}>
        <p>© 2025 Solar AI Platform. Powered by AI, Built for the Future.</p>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.05);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.08;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.12;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-10px);
          }
        }

        @keyframes scroll {
          0% {
            top: 8px;
          }
          50% {
            top: 20px;
          }
          100% {
            top: 8px;
          }
        }

        @keyframes sunPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 60px #fbbf24, 0 0 120px #f59e0b;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 80px #fbbf24, 0 0 150px #f59e0b;
          }
        }

        @keyframes rayRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes panelFloat {
          0%, 100% {
            transform: perspective(600px) rotateX(45deg) translateY(0);
          }
          50% {
            transform: perspective(600px) rotateX(45deg) translateY(-10px);
          }
        }

        @keyframes panelShine {
          0%, 100% {
            opacity: 0.8;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.2);
          }
        }

        @keyframes surveyor1 {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.02);
          }
        }

        @keyframes surveyor2 {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes energyWave {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .cta-primary {
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .cta-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(102, 126, 234, 0.4);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease-out, height 0.6s ease-out;
        }

        .cta-primary::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
          transform: translateX(-100%);
          transition: transform 0.8s;
        }

        .cta-primary:hover {
          transform: translateY(-7px) scale(1.08);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(102, 126, 234, 0.5);
          animation: btnPulse 0.6s ease-out;
        }

        .cta-primary:hover::before {
          width: 350px;
          height: 350px;
        }

        .cta-primary:hover::after {
          transform: translateX(100%);
        }

        .cta-primary:active {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
        }

        @keyframes btnPulse {
          0%, 100% {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(102, 126, 234, 0.5);
          }
          50% {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(102, 126, 234, 0.8);
          }
        }

        .cta-secondary {
          position: relative;
          overflow: hidden;
        }

        .cta-secondary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 15px 40px rgba(255, 255, 255, 0.2);
        }

        .cta-secondary:hover::before {
          left: 100%;
        }

        .cta-secondary:active {
          transform: translateY(-2px) scale(1.02);
        }

        .feature-card {
          position: relative;
          overflow: hidden;
        }

        .feature-card::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          bottom: -50%;
          left: -50%;
          background: linear-gradient(to bottom, transparent, rgba(102, 126, 234, 0.1), transparent);
          transform: rotateZ(45deg) translateY(-100%);
          transition: transform 0.6s;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
          border-color: var(--primary);
        }

        .feature-card:hover::after {
          transform: rotateZ(45deg) translateY(100%);
        }

        .cta-launch {
          position: relative;
          overflow: hidden;
        }

        .cta-launch::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s;
        }

        .cta-launch:hover {
          transform: translateY(-5px) scale(1.08);
          box-shadow: 0 20px 50px rgba(102, 126, 234, 0.6);
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .cta-launch:hover::before {
          left: 100%;
        }

        .cta-launch:active {
          transform: translateY(-2px) scale(1.05);
        }

        @media (max-width: 768px) {
          .hero-cta {
            flex-direction: column;
            align-items: center;
          }

          .cta-primary, .cta-secondary {
            width: 100%;
            max-width: 300px;
          }

          .features-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2rem !important;
          }

          .scroll-indicator {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
