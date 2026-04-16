'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getSessions, addNoteToSession } from '@/app/actions';

function SessionContent({ session, cat, formatDur, isLive }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '🍅'}</span>
        <span style={{ fontWeight: 700 }}>{session.goal?.text || 'No goal set'}</span>
        {session.goal?.achieved === true  && <span title="Goal achieved">✅</span>}
        {session.goal?.achieved === false && <span title="Goal not achieved">❌</span>}
        {isLive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)',
            background: 'var(--accent-dim)', border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-full)', padding: '0.125rem 0.625rem',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent-secondary)',
              animation: 'pulse-ring 1.5s ease-out infinite',
              display: 'inline-block',
            }} />
            Live — tap to open
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: session.notes?.length ? '0.625rem' : 0 }}>
        <span className="badge text-xs" style={{
          background: `${cat?.color}20`, color: cat?.color,
          border: `1px solid ${cat?.color}40`,
        }}>
          {cat?.name}
        </span>
        <span className="badge text-xs" style={{
          background: session.status === 'completed'
            ? 'rgba(34,197,94,0.1)'
            : session.status === 'in_progress'
              ? 'rgba(124,90,240,0.12)'
              : 'rgba(239,68,68,0.1)',
          color: session.status === 'completed'
            ? 'var(--success)'
            : session.status === 'in_progress'
              ? 'var(--accent-secondary)'
              : 'var(--danger)',
          border: session.status === 'completed'
            ? '1px solid rgba(34,197,94,0.2)'
            : session.status === 'in_progress'
              ? '1px solid var(--border-active)'
              : '1px solid rgba(239,68,68,0.2)',
        }}>
          {session.status === 'in_progress' ? '⏱ in progress' : session.status}
        </span>
        {session.actualDurationSeconds > 0 && (
          <span className="text-xs text-muted">{formatDur(session.actualDurationSeconds)}</span>
        )}
        <span className="text-xs text-muted">
          {session.endedAt
            ? new Date(session.endedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : new Date(session.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      </div>

      {session.notes?.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.625rem 0.875rem',
          marginTop: '0.5rem',
        }}>
          {session.notes.map(n => (
            <p key={n.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              📝 {n.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions]     = useState([]);
  const [filter, setFilter]         = useState('all');
  const [noteModal, setNoteModal]   = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [noteText, setNoteText]     = useState('');

  useEffect(() => {
    async function loadData() {
      const sess = await getSessions();
      setSessions(sess);
    }
    loadData();
  }, []);

  const filtered = sessions.filter(s => {
    if (filter === 'all')         return true;
    if (filter === 'completed')   return s.status === 'completed';
    if (filter === 'abandoned')   return s.status === 'abandoned';
    if (filter === 'in_progress') return s.status === 'in_progress';
    return true;
  });

  function formatDur(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await addNoteToSession(noteModal.id, noteText.trim());
    const sess = await getSessions();
    setSessions(sess);
    setNoteModal(null);
    setNoteText('');
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Session Log</h1>
          <p className="page-subtitle">All your focus sessions, goals, and notes.</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all',         label: 'All' },
            { key: 'in_progress', label: '⏱ Active' },
            { key: 'completed',   label: 'Completed' },
            { key: 'abandoned',   label: 'Abandoned' },
          ].map(f => (
            <button
              key={f.key}
              id={`filter-${f.key}`}
              className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state" style={{ minHeight: 300 }}>
          <div className="empty-state-icon">🍅</div>
          <h3>No sessions found</h3>
          <p>Start your first focus session to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map(session => {
            const cat     = session.category;
            const isLive  = session.status === 'in_progress';

            return (
              <div
                key={session.id}
                id={`session-row-${session.id}`}
                className="card"
                style={{
                  borderLeft: `4px solid ${cat?.color || 'var(--accent-primary)'}`,
                  padding: isLive ? '1.25rem' : undefined,
                }}
              >
                {isLive ? (
                  <Link
                    href="/timer"
                    id={`open-timer-${session.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <SessionContent session={session} cat={cat} formatDur={formatDur} isLive />
                  </Link>
                ) : (
                  <div 
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start', cursor: 'pointer' }}
                    onClick={() => setDetailsModal(session)}
                  >
                    <div style={{ pointerEvents: 'none' }}>
                      <SessionContent session={session} cat={cat} formatDur={formatDur} />
                    </div>
                    <button
                      id={`add-note-${session.id}`}
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); setNoteModal(session); setNoteText(''); }}
                      title="Add note"
                    >
                      + Note
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add note modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Note</h3>
              <button id="close-note-modal" className="btn btn-ghost btn-icon" onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              Adding to: <strong>{noteModal.goal?.text}</strong>
            </p>
            <div className="form-group">
              <label htmlFor="new-note-input">Note</label>
              <textarea
                id="new-note-input" className="input" rows={4}
                placeholder="What did you observe? Next steps? Blockers?"
                value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button id="cancel-note-btn" className="btn btn-secondary flex-1" onClick={() => setNoteModal(null)}>Cancel</button>
              <button
                id="save-note-btn" className="btn btn-primary flex-1"
                onClick={handleAddNote} disabled={!noteText.trim()}
              >Save Note</button>
            </div>
          </div>
        </div>
      )}
      {/* Session Details Modal */}
      {detailsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailsModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.25rem' }}>{detailsModal.category?.icon || '🍅'}</span>
                <h3 className="modal-title">Session Details</h3>
              </div>
              <button id="close-details-modal" className="btn btn-ghost btn-icon" onClick={() => setDetailsModal(null)}>✕</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="text-muted text-xs" style={{ marginBottom: '0.25rem' }}>Goal</div>
              <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{detailsModal.goal?.text || 'No goal set'}</div>
              <div className="mt-1" style={{ color: detailsModal.goal?.achieved ? 'var(--success)' : 'var(--text-muted)' }}>
                {detailsModal.goal?.achieved === true ? '✅ Goal Achieved' : detailsModal.goal?.achieved === false ? '❌ Goal Not Achieved' : 'No outcome recorded'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-xs text-muted">Category</div>
                <div style={{ fontWeight: 600, color: detailsModal.category?.color, marginTop: '0.25rem' }}>
                  {detailsModal.category?.name}
                </div>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div className="text-xs text-muted">Duration Focused</div>
                <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                  {formatDur(detailsModal.actualDurationSeconds)}
                </div>
              </div>
            </div>

            {detailsModal.notes?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="text-muted text-xs" style={{ marginBottom: '0.5rem' }}>Notes & Reflections</div>
                {detailsModal.notes.map(n => (
                  <div key={n.id} style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {n.text}
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted text-center" style={{ marginTop: '1rem' }}>
              Started: {new Date(detailsModal.startedAt).toLocaleString()}
              <br />
              Ended: {detailsModal.endedAt ? new Date(detailsModal.endedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
