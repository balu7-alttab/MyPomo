'use client';

import AppShell from '@/components/AppShell';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Settings</h1>
          <p className="page-subtitle">Manage your account and preferences.</p>
        </div>
      </div>

      {/* ── Account Information ────────────────────────────────────────────── */}
      <h3 style={{ marginBottom: '1.25rem' }}>Account</h3>
      <div className="card" style={{ maxWidth: 560, marginBottom: '2rem' }}>
        <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
          You are currently signed in via Google Auth.
        </p>
        <button id="sign-out-btn" className="btn btn-secondary" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
          Sign Out
        </button>
      </div>

      {/* ── About Tab ─────────────────────────────────────────────────── */}
      <h3 style={{ marginBottom: '1.25rem' }}>About MyPomo</h3>
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🍅</div>
          <h2>MyPomo</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Version 0.3 — Phase 4 Build (Auth & Cloud Sync)</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Stack', value: 'Next.js 14 · Vanilla CSS' },
            { label: 'Database', value: 'SQLite via Prisma ORM' },
            { label: 'Auth', value: 'Google Single Sign-On (Auth.js)' },
            { label: 'Storage', value: 'Cloud Synced Database' },
          ].map(item => (
            <div key={item.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 0', borderBottom: '1px solid var(--border)',
              }}>
              <span className="text-muted text-sm">{item.label}</span>
              <span className="text-sm" style={{ fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <p className="text-xs text-muted text-center">
            ✅ Authenticated. All focus data is safely stored in the database.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
