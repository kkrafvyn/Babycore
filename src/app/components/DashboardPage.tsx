import { useEffect, useState } from 'react';
import {
  Palette,
  Rocket,
  RotateCcw,
  Smartphone,
  Sparkles,
  Zap,
  Hexagon,
} from 'lucide-react';

const STATS = [
  { value: '12K+', label: 'Active Users' },
  { value: '98%', label: 'Uptime' },
  { value: '4.9', label: 'Rating' },
  { value: '150+', label: 'Countries' },
];

const FEATURES = [
  {
    icon: Zap,
    color: 'violet',
    title: '3D Animations',
    description:
      'Buttery smooth 60fps animations with GPU-accelerated 3D transforms and perspective effects.',
  },
  {
    icon: Palette,
    color: 'cyan',
    title: 'Aurora Palette',
    description:
      'Curated deep space color system with electric violet, cyan aurora, and warm amber accents.',
  },
  {
    icon: Sparkles,
    color: 'amber',
    title: 'Glassmorphism',
    description:
      'Premium frosted glass UI with backdrop blur, subtle borders, and depth-aware shadows.',
  },
  {
    icon: Hexagon,
    color: 'rose',
    title: 'Particle System',
    description:
      'Dynamic floating particles with randomized physics for an immersive ambiance.',
  },
  {
    icon: Smartphone,
    color: 'emerald',
    title: 'Responsive Design',
    description:
      'Pixel-perfect on every device from ultra-wide monitors to compact mobile screens.',
  },
  {
    icon: Rocket,
    color: 'indigo',
    title: 'Performance First',
    description:
      'CSS-driven animations, lazy loading, and optimized rendering for instant interactions.',
  },
];

const TIMELINE = [
  {
    label: 'New component shipped',
    meta: '2 minutes ago',
    color: 'var(--color-accent-primary)',
  },
  {
    label: 'Design system updated',
    meta: '15 minutes ago',
    color: 'var(--color-accent-secondary)',
  },
  {
    label: 'Build passed all tests',
    meta: '32 minutes ago',
    color: 'var(--color-accent-emerald)',
  },
  {
    label: 'Splash screen animated',
    meta: '1 hour ago',
    color: 'var(--color-accent-tertiary)',
  },
];

const CHART_DATA = [
  { label: 'Mon', value: 65, color: 'var(--color-accent-primary)' },
  { label: 'Tue', value: 85, color: 'var(--color-accent-secondary)' },
  { label: 'Wed', value: 45, color: 'var(--color-accent-rose)' },
  { label: 'Thu', value: 90, color: 'var(--color-accent-primary)' },
  { label: 'Fri', value: 70, color: 'var(--color-accent-tertiary)' },
  { label: 'Sat', value: 55, color: 'var(--color-accent-secondary)' },
  { label: 'Sun', value: 80, color: 'var(--color-accent-emerald)' },
];

import { getClientAppName, getClientLogoSrc } from '../../lib/app-branding-client';

export function DashboardPage() {
  const appName = getClientAppName();
  const logoSrc = getClientLogoSrc();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger staggered entrance animations.
    setMounted(true);
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-bg" />

      <div className="dashboard-content">
        <nav className="nav-header">
          <div className="nav-logo">
            <img src={logoSrc} alt={appName} className="nav-logo-icon" />
            <span className="nav-logo-text">{appName}</span>
          </div>
          <div className="nav-links">
            {['Dashboard', 'Projects', 'Analytics', 'Settings'].map((item) => (
              <button
                key={item}
                className={`nav-link ${activeNav === item ? 'active' : ''}`}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="nav-cta">Get Started</button>
        </nav>

        <section className="hero" id="hero">
          <div className={`hero-badge ${mounted ? 'animate-in delay-1' : ''}`}>
            <span className="hero-badge-dot" />
            Now with 3D Splash Animations
          </div>
          <h1 className={`hero-title ${mounted ? 'animate-in delay-2' : ''}`}>
            Design That Feels <span className="hero-title-gradient">Alive</span>
          </h1>
          <p className={`hero-description ${mounted ? 'animate-in delay-3' : ''}`}>
            A premium UI experience with cinematic 3D splash screens, aurora-inspired
            color palettes, and buttery smooth animations that captivate from the
            first frame.
          </p>
          <div className={`hero-actions ${mounted ? 'animate-in delay-4' : ''}`}>
            <button className="btn-primary" id="explore-btn">
              <Sparkles size={18} />
              Explore Design
            </button>
            <button
              className="btn-ghost"
              id="replay-btn"
              onClick={() => window.location.reload()}
            >
              <RotateCcw size={16} />
              Replay Splash
            </button>
          </div>
        </section>

        <div className="stats-row">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`glass-card stat-card ${
                mounted ? `animate-in delay-${i + 3}` : ''
              }`}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <section className="features-section" id="features">
          <div className="section-header">
            <p className="section-tag">Features</p>
            <h2 className="section-title">Crafted with Precision</h2>
            <p className="section-description">
              Every detail is designed to create exceptional digital experiences
              that feel premium and state-of-the-art.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`glass-card feature-card ${
                    mounted ? `animate-in delay-${Math.min(i + 2, 8)}` : ''
                  }`}
                >
                  <div className="feature-card-content">
                    <div className={`feature-icon ${feature.color}`}>
                      <Icon size={24} />
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="activity-section" id="activity">
          <div className="section-header">
            <p className="section-tag">Live Activity</p>
            <h2 className="section-title">Real-Time Insights</h2>
          </div>
          <div className="activity-grid">
            <div className="glass-card activity-card">
              <div className="activity-card-header">
                <h3 className="activity-card-title">Recent Activity</h3>
                <span className="activity-card-badge badge-violet">Live</span>
              </div>
              {TIMELINE.map((item, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" style={{ background: item.color }} />
                  <div className="timeline-content">
                    <div className="timeline-label">{item.label}</div>
                    <div className="timeline-meta">{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card activity-card">
              <div className="activity-card-header">
                <h3 className="activity-card-title">Weekly Engagement</h3>
                <span className="activity-card-badge badge-cyan">This Week</span>
              </div>
              <div className="chart-bars">
                {CHART_DATA.map((bar, i) => (
                  <div
                    key={i}
                    className="chart-bar"
                    style={{
                      height: `${bar.value}%`,
                      background: `linear-gradient(180deg, ${bar.color} 0%, ${bar.color}44 100%)`,
                      boxShadow: `0 0 12px ${bar.color}33`,
                    }}
                  >
                    <span className="chart-bar-label">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <p>
            Designed with care by{' '}
            <a
              href="#"
              style={{
                background: 'var(--gradient-aurora)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Bud & Bloom
            </a>{' '}
            - Baby care dashboard
          </p>
        </footer>
      </div>
    </div>
  );
}
