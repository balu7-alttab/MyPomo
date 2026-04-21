'use client';

import AppShell from '@/components/AppShell';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="page-header" style={{ marginBottom: '3rem' }}>
        <div>
          <h1 className="page-title">⚙️ Settings</h1>
          <p className="page-subtitle">Manage your account, preferences, and workspace configuration.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1000px' }}>
        
        {/* ── Account & Data ─────────────────────────────────────────────── */}
        <div className="settings-section">
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>Account & Data</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Manage your linked identity and data exports.
            </p>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* User ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>User Context</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Authenticated via Google SSO</span>
              </div>
              <span className="mono" style={{ fontSize: '0.8125rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                Active
              </span>
            </div>
            {/* Export Data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Export Data</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Download a CSV of all your focus sessions</span>
              </div>
              <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Export (Coming soon)
              </button>
            </div>
            {/* Sign Out */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', background: 'rgba(255, 69, 58, 0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--danger)' }}>Sign Out</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Securely disconnect your session</span>
              </div>
              <button 
                id="sign-out-btn" 
                className="btn btn-sm" 
                style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--danger)', border: '1px solid rgba(255, 69, 58, 0.3)' }}
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* ── App Preferences ────────────────────────────────────────────── */}
        <div className="settings-section">
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>App Preferences</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Customize how MyPomo looks across your devices.
            </p>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Appearance Theme</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Switch between light and dark modes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Coming Soon</span>
                <div style={{ width: '44px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', opacity: 0.5, cursor: 'not-allowed' }}>
                  <div style={{ position: 'absolute', left: '2px', top: '2px', width: '20px', height: '20px', background: 'var(--text-muted)', borderRadius: '50%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── About MyPomo ─────────────────────────────────────────────── */}
        <div className="settings-section">
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>About MyPomo</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              System information and developer credits.
            </p>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Developed by Balu Akula, Founder of Alt-tab</span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Version 1.0</span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
