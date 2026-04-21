'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',          icon: '🏠', label: 'Dashboard' },
  { href: '/timer',     icon: '⏱️', label: 'Focus Timer' },
  { href: '/categories',icon: '🏷️', label: 'Categories' },
  { href: '/analytics', icon: '📊', label: 'Analytics' },
  { href: '/sessions',  icon: '📋', label: 'Sessions' },
  { href: '/settings',  icon: '⚙️', label: 'Settings' },
];

const FOCUS_INSIGHTS = [
  { type: 'stat', icon: '📊', title: 'The 23-Minute Rule', text: 'It takes an average of 23 minutes to return to deep focus after a single interruption.', source: 'UC Irvine' },
  { type: 'stat', icon: '📊', title: 'Context Switching', text: 'Toggling between different tasks can reduce your productivity by as much as 40%.', source: 'APA' },
  { type: 'stat', icon: '📊', title: 'The 500% Boost', text: 'Employees in a flow state are up to 5x more productive than their peers.', source: 'McKinsey & Co' },
  { type: 'stat', icon: '📊', title: 'Error Doubling', text: 'Even a 3-second interruption can double the error rate on complex tasks.', source: 'Michigan State' },
  { type: 'stat', icon: '📊', title: 'The 1,200 Switch', text: 'Average office workers switch apps over 1,000 times a day, fracturing focus.', source: 'Pegasystems' },
  { type: 'quote', icon: '💡', text: 'Focus on being productive instead of busy.', source: 'Tim Ferriss' },
  { type: 'quote', icon: '💡', text: 'Deep Work is the superpower of the 21st century.', source: 'Cal Newport' },
  { type: 'quote', icon: '💡', text: 'Goals set your direction; systems make your progress.', source: 'James Clear' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [insightIndex, setInsightIndex] = useState(0);

  useEffect(() => {
    // Pick a random initial index on mount
    setInsightIndex(Math.floor(Math.random() * FOCUS_INSIGHTS.length));

    // Rotate every 10 minutes (600,000 ms)
    const interval = setInterval(() => {
      setInsightIndex((current) => (current + 1) % FOCUS_INSIGHTS.length);
    }, 600000);

    return () => clearInterval(interval);
  }, []);

  const currentInsight = FOCUS_INSIGHTS[insightIndex];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🍅</div>
          <span className="sidebar-logo-text">MyPomo</span>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          <span className="nav-section-label">Focus</span>
          {NAV.slice(0, 2).map(item => (
            <Link
              key={item.href}
              prefetch={true}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <span className="nav-section-label">Progress</span>
          {NAV.slice(2, 5).map(item => (
            <Link
              key={item.href}
              prefetch={true}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <span className="nav-section-label">Manage</span>
          {NAV.slice(5).map(item => (
            <Link
              key={item.href}
              prefetch={true}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '1.25rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          <div key={insightIndex} className="fade-in" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '1rem' }}>{currentInsight.icon}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.625rem' }}>
                {currentInsight.type === 'stat' ? 'Focus Stat' : 'Focus Quote'}
              </span>
            </div>
            
            {currentInsight.title && (
              <div style={{ fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: '0.125rem', fontSize: '0.8125rem' }}>
                {currentInsight.title}
              </div>
            )}
            
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.75rem', fontStyle: currentInsight.type === 'quote' ? 'italic' : 'normal' }}>
              "{currentInsight.text}"
            </p>
            
            <div style={{ marginTop: '0.5rem', fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              — {currentInsight.source}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-tab-bar" role="navigation" aria-label="Mobile navigation">
        {[NAV[0], NAV[1], NAV[2], NAV[3], NAV[5]].map(item => (
          <Link
            key={item.href}
            prefetch={true}
            href={item.href}
            id={`tab-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            className={`tab-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="tab-icon">{item.icon}</span>
            <span>{item.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
