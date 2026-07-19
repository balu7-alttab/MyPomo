'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  getCategories,
  createSession,
  completeSession,
  abandonSession,
  getActiveSession,
  pauseSession,
  resumeSession,
  getPreferences
} from '@/app/actions';
import { NOTIFICATION_SOUNDS, AMBIENT_SOUNDS, getSoundFile } from '@/app/sounds';

export default function TimerPage() {
  const router = useRouter();

  const [phase, setPhase]           = useState('idle');
  const [categories, setCategories] = useState([]);

  // Setup form
  const [selectedCat, setSelectedCat] = useState('');
  const [goalText, setGoalText]       = useState('');
  const [duration, setDuration]       = useState(25);
  const [customDur, setCustomDur]     = useState('');
  const [useCustom, setUseCustom]     = useState(false);
  const [isStarting, setIsStarting]   = useState(false);

  // Active session
  const [sessionId, setSessionId]   = useState(null);
  const [totalSecs, setTotalSecs]   = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const intervalRef  = useRef(null);
  const wallStartRef = useRef(null);
  const baseElapsed  = useRef(0);

  // Reflection
  const [goalAchieved, setGoalAchieved] = useState(null);
  const [note, setNote]                 = useState('');

  // Audio refs
  const [prefs, setPrefs] = useState(null);
  const startAudioRef   = useRef(null);
  const ambientAudioRef = useRef(null);
  const endAudioRef     = useRef(null);

  // ── 100% Server-Driven Initialization ─────────────────────────────────────
  useEffect(() => {
    async function init() {
      const cats = await getCategories();
      setCategories(cats);

      const userPrefs = await getPreferences();
      setPrefs(userPrefs);
      
      const startFile = getSoundFile(userPrefs.startSound, NOTIFICATION_SOUNDS);
      if (startFile) startAudioRef.current = new Audio(startFile);
      
      const ambientFile = getSoundFile(userPrefs.ambientSound, AMBIENT_SOUNDS);
      if (ambientFile) {
        const a = new Audio(ambientFile);
        a.loop = true;
        ambientAudioRef.current = a;
      }
      
      const endFile = getSoundFile(userPrefs.endSound, NOTIFICATION_SOUNDS);
      if (endFile) endAudioRef.current = new Audio(endFile);

      const active = await getActiveSession();
      if (!active) return;

      const total = active.durationMinutes * 60;
      
      if (active.status === 'paused') {
        // Paused on server
        restoreSession(active, total, active.actualDurationSeconds, 'paused');
      } else if (active.status === 'in_progress') {
        // Running on server
        const startTime = new Date(active.startedAt).getTime();
        const secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
        
        if (secondsElapsed >= total) {
          // Orphan session or expired -> Force complete
          restoreSession(active, total, total, 'done');
        } else {
          // Still running
          restoreSession(active, total, secondsElapsed, 'running');
          startTicker(total, startTime, 0);
          ambientAudioRef.current?.play().catch(e => console.error("Autoplay prevented:", e));
        }
      }
    }
    init();
    return () => {
      clearInterval(intervalRef.current);
      ambientAudioRef.current?.pause();
    };
  }, []);

  function restoreSession(active, total, elapsedSeconds, newPhase) {
    setSessionId(active.id);
    setSelectedCat(active.categoryId);
    setGoalText(active.goal?.text || '');
    setTotalSecs(total);
    setElapsed(elapsedSeconds);
    baseElapsed.current = elapsedSeconds;
    setPhase(newPhase);
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  function startTicker(total, wallStart, base) {
    wallStartRef.current = wallStart;
    baseElapsed.current  = base;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const newElapsed = base + Math.floor((Date.now() - wallStart) / 1000);
      setElapsed(newElapsed);
      if (newElapsed >= total) {
        clearInterval(intervalRef.current);
        setElapsed(total);
        setPhase('done');
        ambientAudioRef.current?.pause();
        endAudioRef.current?.play().catch(console.error);
      }
    }, 500);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleStart() {
    if (isStarting) return;
    const mins = useCustom ? parseInt(customDur, 10) : duration;
    if (!selectedCat || !goalText.trim() || !mins || mins < 1) return;

    const secs = mins * 60;
    const wallStart = Date.now();
    const permanentSessionId = crypto.randomUUID();
    
    // Optimistic UI
    setSessionId(permanentSessionId);
    setTotalSecs(secs);
    setElapsed(0);
    setPhase('running');
    startTicker(secs, wallStart, 0);
    
    startAudioRef.current?.play().catch(console.error);
    ambientAudioRef.current?.play().catch(console.error);
    
    setIsStarting(true);
    try {
      const session = await createSession({ 
        id: permanentSessionId,
        categoryId: selectedCat, 
        goalText: goalText.trim(), 
        durationMinutes: mins 
      });
      if (session?.error) throw new Error(session.error);
    } catch (err) {
      resetAll();
      alert(err.message || 'Failed to start session on server');
    } finally {
      setIsStarting(false);
    }
  }

  async function handlePause() {
    clearInterval(intervalRef.current);
    setPhase('paused');
    ambientAudioRef.current?.pause();
    try {
      await pauseSession(sessionId, elapsed);
    } catch (err) {
      alert("Failed to pause on server");
    }
  }

  async function handleResume() {
    const wallStart = Date.now();
    setPhase('running');
    startTicker(totalSecs, wallStart, elapsed);
    ambientAudioRef.current?.play().catch(console.error);
    try {
      await resumeSession(sessionId);
    } catch (err) {
      alert("Failed to resume on server");
    }
  }

  async function handleAbandon() {
    try {
      if (!sessionId) return;
      clearInterval(intervalRef.current);
      ambientAudioRef.current?.pause();
      if (ambientAudioRef.current) ambientAudioRef.current.currentTime = 0;
      await abandonSession(sessionId, elapsed);
      resetAll();
    } catch (err) {
      alert(err.message || 'Failed to abandon session.');
    }
  }

  async function handleSaveReflection() {
    try {
      if (!sessionId) return;
      const result = await completeSession(sessionId, {
        actualDurationSeconds: elapsed,
        goalAchieved,
        note: note.trim(),
      });
      if (result?.error) throw new Error(result.error);
      resetAll();
      router.push('/');
    } catch (err) {
      alert("Failed to save session: " + (err.message || "Unknown error"));
    }
  }

  function resetAll() {
    clearInterval(intervalRef.current);
    ambientAudioRef.current?.pause();
    if (ambientAudioRef.current) ambientAudioRef.current.currentTime = 0;
    setPhase('idle');
    setSessionId(null);
    setElapsed(0);
    setTotalSecs(0);
    setGoalText('');
    setSelectedCat('');
    setGoalAchieved(null);
    setNote('');
    baseElapsed.current = 0;
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const remaining  = Math.max(0, totalSecs - elapsed);
  const pct        = totalSecs > 0 ? Math.min(100, (elapsed / totalSecs) * 100) : 0;
  const mm         = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss         = String(remaining % 60).padStart(2, '0');
  const RADIUS     = 110;
  const CIRCUM     = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUM - (CIRCUM * pct) / 100;
  const activeCat  = categories.find(c => c.id === selectedCat);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">⏱️ Focus Timer</h1>
          <p className="page-subtitle">Set your intention and enter deep work.</p>
        </div>
      </div>

      {/* ── IDLE ───────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            width: '100%', background: 'var(--bg-card)',
            border: '1px solid var(--border-card)', borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
          }}>
            <h2 style={{ marginBottom: '1.75rem', textAlign: 'center' }}>New Focus Session</h2>

            <div className="form-group">
              <label htmlFor="category-select">Category *</label>
              <select id="category-select" className="input" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                <option value="">— Choose a life area —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="goal-input">What's your goal for this session? *</label>
              <input
                id="goal-input" type="text" className="input"
                placeholder="e.g. Finish the Q2 report introduction…"
                value={goalText} onChange={e => setGoalText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()} maxLength={200}
              />
              <span className="text-xs text-muted">{goalText.length}/200</span>
            </div>

            <div className="form-group">
              <label>Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[15, 25, 45, 60, 90].map(m => (
                  <button key={m} id={`duration-${m}`}
                    className={`btn ${!useCustom && duration === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => { setDuration(m); setUseCustom(false); }}
                  >{m}m</button>
                ))}
                <button id="duration-custom"
                  className={`btn ${useCustom ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setUseCustom(true)}
                >Custom</button>
              </div>
              {useCustom && (
                <div className="flex items-center gap-2 mt-2">
                  <input id="custom-duration-input" type="number" className="input"
                    placeholder="Minutes" min={1} max={480} value={customDur}
                    onChange={e => setCustomDur(e.target.value)}
                    style={{ maxWidth: 120 }} autoFocus
                  />
                  <span className="text-sm text-muted">minutes</span>
                </div>
              )}
            </div>

            <button id="start-timer-btn" className="btn btn-primary btn-lg w-full" onClick={handleStart}
              disabled={isStarting || !selectedCat || !goalText.trim() || (useCustom ? !customDur : !duration)}
              style={{ marginTop: '0.5rem' }}>
              {isStarting ? 'Starting...' : '▶ Start Session'}
            </button>
          </div>
        </div>
      )}

      {/* ── RUNNING / PAUSED ────────────────────────────────────────────────── */}
      {(phase === 'running' || phase === 'paused') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          {activeCat && (
            <div className="flex items-center gap-2" style={{
              background: `${activeCat.color}18`, border: `1px solid ${activeCat.color}44`,
              borderRadius: 'var(--radius-full)', padding: '0.375rem 1rem',
              fontSize: '0.9375rem', fontWeight: 600, color: activeCat.color,
            }}>
              {activeCat.icon} {activeCat.name}
            </div>
          )}

          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: 480, textAlign: 'center', fontStyle: 'italic' }}>
            "{goalText}"
          </p>

          {/* Circular timer */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'running' && (
              <div style={{
                position: 'absolute', width: 264, height: 264, borderRadius: '50%',
                background: `${activeCat?.color || 'var(--accent-primary)'}22`,
                animation: 'pulse-ring 2s ease-out infinite',
              }} />
            )}
            <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
              <circle cx="140" cy="140" r={RADIUS} fill="none"
                stroke={activeCat?.color || 'var(--accent-primary)'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRCUM} strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="mono" style={{
                fontSize: '3.5rem', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1,
                color: phase === 'paused' ? 'var(--text-muted)' : 'var(--text-primary)',
              }}>{mm}:{ss}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {phase === 'paused' ? '⏸ Paused' : 'remaining'}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted">{Math.floor(elapsed / 60)}m {elapsed % 60}s elapsed</p>

          <div className="flex items-center gap-3">
            {phase === 'running'
              ? <button id="pause-btn"  className="btn btn-secondary btn-lg" onClick={handlePause}>⏸ Pause</button>
              : <button id="resume-btn" className="btn btn-primary btn-lg"   onClick={handleResume}>▶ Resume</button>
            }
            <button id="abandon-btn" className="btn btn-danger" onClick={handleAbandon}>✕ Abandon</button>
          </div>
        </div>
      )}

      {/* ── DONE: Reflection ────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(124,90,240,0.1))' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2>Session Complete!</h2>
            <p className="text-sm" style={{ marginTop: '0.5rem' }}>
              You focused for <strong>{Math.floor(elapsed / 60)} minutes</strong>.
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Reflect on your session</h3>
            <div className="form-group">
              <label>Did you achieve your goal?</label>
              <p className="text-sm" style={{ marginBottom: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                "{goalText}"
              </p>
              <div className="flex gap-3">
                <button id="goal-yes-btn"
                  className={`btn ${goalAchieved === true ? 'btn-primary' : 'btn-secondary'} flex-1`}
                  onClick={() => setGoalAchieved(true)}>✅ Yes!</button>
                <button id="goal-no-btn"
                  className={`btn ${goalAchieved === false ? 'btn-danger' : 'btn-secondary'} flex-1`}
                  onClick={() => setGoalAchieved(false)}>❌ Not quite</button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="session-note">Add a note or reflection (optional)</label>
              <textarea id="session-note" className="input" rows={4}
                placeholder="What did you accomplish? Any blockers? Next steps?"
                value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button id="save-session-btn" className="btn btn-primary btn-lg w-full"
              onClick={handleSaveReflection} disabled={goalAchieved === null}>
              Save & Return to Dashboard
            </button>
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button id="skip-reflection-btn" className="btn btn-ghost btn-sm"
                onClick={async () => { setGoalAchieved(false); await handleSaveReflection(); }}>
                Skip reflection
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
