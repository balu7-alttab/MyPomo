'use client';

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

export default function Sidebar() {
  const pathname = usePathname();

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
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>
              MyPomo v0.1
            </div>
            Your personal focus OS
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-tab-bar" role="navigation" aria-label="Mobile navigation">
        {[NAV[0], NAV[1], NAV[2], NAV[3], NAV[5]].map(item => (
          <Link
            key={item.href}
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
