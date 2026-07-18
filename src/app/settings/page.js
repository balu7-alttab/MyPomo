'use client';

import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { signOut } from 'next-auth/react';
import { getPreferences, savePreferences } from '@/app/actions';
import { NOTIFICATION_SOUNDS, AMBIENT_SOUNDS, getSoundFile } from '@/app/sounds';

export default function SettingsPage() {
  const [prefs, setPrefs] = useState({ startSound: 'none', ambientSound: 'none', endSound: 'chime' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const previewAudioRef = useRef(null);
  const previewTimeoutRef = useRef(null);

  useEffect(() => {
    async function loadPrefs() {
      const data = await getPreferences();
      setPrefs(data);
    }
    loadPrefs();
    
    return () => {
      // Cleanup audio on unmount
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await savePreferences(prefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
      alert("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = (key, soundList, isAmbient) => {
    const file = getSoundFile(key, soundList);
    if (!file) return;

    // Stop current preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    clearTimeout(previewTimeoutRef.current);

    const audio = new Audio(file);
    audio.play().catch(console.error);
    previewAudioRef.current = audio;

    // Stop after a few seconds
    const durationMs = isAmbient ? 5000 : 3000;
    previewTimeoutRef.current = setTimeout(() => {
      audio.pause();
    }, durationMs);
  };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>User Context</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Authenticated via Google SSO</span>
              </div>
              <span className="mono" style={{ fontSize: '0.8125rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                Active
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Export Data</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Download a CSV of all your focus sessions</span>
              </div>
              <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Export (Coming soon)
              </button>
            </div>
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

        {/* ── Sound Preferences ──────────────────────────────────────────── */}
        <div className="settings-section">
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>Sound Preferences</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Choose audio cues for your focus sessions.
            </p>
          </div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Session Start Sound</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select className="input" style={{ width: '150px' }} value={prefs.startSound} onChange={e => setPrefs({ ...prefs, startSound: e.target.value })}>
                    {NOTIFICATION_SOUNDS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePreview(prefs.startSound, NOTIFICATION_SOUNDS, false)} disabled={prefs.startSound === 'none'}>▶ Preview</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Ambient Sound (Running)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select className="input" style={{ width: '150px' }} value={prefs.ambientSound} onChange={e => setPrefs({ ...prefs, ambientSound: e.target.value })}>
                    {AMBIENT_SOUNDS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePreview(prefs.ambientSound, AMBIENT_SOUNDS, true)} disabled={prefs.ambientSound === 'none'}>▶ Preview</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Session End Sound</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select className="input" style={{ width: '150px' }} value={prefs.endSound} onChange={e => setPrefs({ ...prefs, endSound: e.target.value })}>
                    {NOTIFICATION_SOUNDS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePreview(prefs.endSound, NOTIFICATION_SOUNDS, false)} disabled={prefs.endSound === 'none'}>▶ Preview</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                {saveSuccess && <span style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', marginRight: '1rem' }}>✓ Saved</span>}
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Sound Preferences'}
                </button>
              </div>

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
