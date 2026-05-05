'use client';

import Sidebar from './Sidebar';

/**
 * AppShell wraps every page with the sidebar layout.
 * Mark as 'use client' so child pages can use hooks freely.
 */
import Link from 'next/link';

function MobileHeader() {
  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--accent-primary), #b45af0)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 4px 12px rgba(124, 90, 240, 0.4)' }}>
          🍅
        </div>
        <span style={{ fontSize: '1.125rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, var(--accent-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          MyPomo
        </span>
      </div>
      <Link href="/settings" className="btn btn-ghost btn-icon">
        <span style={{ fontSize: '1.25rem' }}>⚙️</span>
      </Link>
    </header>
  );
}

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <MobileHeader />
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
