'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  getCategories,
  createSession,
  completeSession,
  abandonSession,
} from '@/app/actions';
import {
  saveActiveTimer,
  loadActiveTimer,
  clearActiveTimer,
} from '@/lib/data';

/* ─── Timer States: idle → running → paused → done ─────────────────────── */

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

  // Active session
  const [sessionId, setSessionId]   = useState(null);
  const [totalSecs, setTotalSecs]   = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const intervalRef  = useRef(null);
  const wallStartRef = useRef(null); // Date.now() when timer last started/resumed
  const baseElapsed  = useRef(0);   // seconds already elapsed before last (re)start

  // Done / reflection
  const [goalAchieved, setGoalAchieved] = useState(null);
  const [note, setNote]                 = useState('');

  // ── On mount: restore any running session from localStorage ───────────────
  useEffect(() => {
    async function init() {
      const cats = await getCategories();
      setCategories(cats);

      const saved = loadActiveTimer();
      if (!saved) return;

      const { sessionId, categoryId, goalText, totalSecs, wallClockStart, phase, elapsedAtPause } = saved;

      if (phase === 'running') {
        const elapsed = Math.floor((Date.now() - wallClockStart) / 1000);
        if (elapsed >= totalSecs) {
          // Session already expired while away — go straight to done
          restoreSession({ sessionId, categoryId, goalText, totalSecs, elapsed: totalSecs, phase: 'done' });
          setPhase('done');
          return;
        }
        restoreSession({ sessionId, categoryId, goalText, totalSecs, elapsed, phase: 'running' });
        startTicker(totalSecs, elapsed, wallClockStart, 0, sessionId, categoryId, goalText);
      } else if (phase === 'paused') {
        restoreSession({ sessionId, categoryId, goalText, totalSecs, elapsed: elapsedAtPause, phase: 'paused' });
      } else if (phase === 'done') {
        restoreSession({ sessionId, categoryId, goalText, totalSecs, elapsed: totalSecs, phase: 'done' });
      }
    }
    init();
  }, []);

  function restoreSession({ sessionId, categoryId, goalText, totalSecs, elapsed, phase }) {
    setSessionId(sessionId);
    setSelectedCat(categoryId);
    setGoalText(goalText);
    setTotalSecs(totalSecs);
    setElapsed(elapsed);
    baseElapsed.current = elapsed;
    setPhase(phase);
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  function startTicker(total, currentElapsed, wallStart, base, tickSessionId, tickCatId, tickGoalText) {
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
        saveActiveTimer({
          sessionId: tickSessionId,
          categoryId: tickCatId,
          goalText: tickGoalText,
          totalSecs: total,
          wallClockStart: null,
          phase: 'done',
          elapsedAtPause: total,
        });
      }
    }, 500);
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleStart() {
    const mins = useCustom ? parseInt(customDur, 10) : duration;
    if (!selectedCat || !goalText.trim() || !mins || mins < 1) return;

    const secs      = mins * 60;
    const wallStart = Date.now();
    
    // DB
    const session = await createSession({ categoryId: selectedCat, goalText: goalText.trim(), durationMinutes: mins });

    setSessionId(session.id);
    setTotalSecs(secs);
    setElapsed(0);
    setPhase('running');

    // Local Storage
    saveActiveTimer({
      sessionId:     session.id,
      categoryId:    selectedCat,
      goalText:      goalText.trim(),
      totalSecs:     secs,
      wallClockStart: wallStart,
      phase:         'running',
      elapsedAtPause: 0,
    });

    startTicker(secs, 0, wallStart, 0, session.id, selectedCat, goalText.trim());
  }

  function handlePause() {
    clearInterval(intervalRef.current);
    setPhase('paused');
    // Update persisted state to paused so restore shows paused correctly
    saveActiveTimer({
      sessionId,
      categoryId:    selectedCat,
      goalText,
      totalSecs,
      wallClockStart: null,
      phase:         'paused',
      elapsedAtPause: elapsed,
    });
  }

  function handleResume() {
    const wallStart = Date.now();
    setPhase('running');
    saveActiveTimer({
      sessionId,
      categoryId:    selectedCat,
      goalText,
      totalSecs,
      wallClockStart: wallStart,
      phase:         'running',
      elapsedAtPause: elapsed,
    });
    startTicker(totalSecs, elapsed, wallStart, elapsed, sessionId, selectedCat, goalText);
  }

  async function handleAbandon() {
    clearInterval(intervalRef.current);
    await abandonSession(sessionId, elapsed);
    clearActiveTimer();
    resetAll();
  }

  async function handleSaveReflection() {
    await completeSession(sessionId, {
      actualDurationSeconds: elapsed,
      goalAchieved,
      note: note.trim(),
    });
    clearActiveTimer();
    resetAll();
    router.push('/');
  }

  function resetAll() {
    clearInterval(intervalRef.current);
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
              disabled={!selectedCat || !goalText.trim() || (useCustom ? !customDur : !duration)}
              style={{ marginTop: '0.5rem' }}>
              ▶ Start Session
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
