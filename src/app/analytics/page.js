'use client';

import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { getAnalyticsData } from '@/app/actions';

export default function AnalyticsPage() {
  const [range, setRange]           = useState('week');
  const [sessions, setSessions]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [breakdown, setBreakdown]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [dailyData, setDailyData]   = useState([]);
  const donutRef = useRef(null);

  async function loadRange(r) {
    setRange(r);
    const data = await getAnalyticsData(r);
    
    setSessions(data.sessions);
    setCategories(data.categories);
    setStats(data.stats); // Actually stats returns total, which is good enough, Though maybe we want slightly different stats. Wait, the server returns full stats object.

    // Compute breakdown manually here since we have sessions
    const bMap = {};
    data.sessions.forEach(s => {
      if (!bMap[s.categoryId]) bMap[s.categoryId] = 0;
      bMap[s.categoryId] += s.actualDurationSeconds;
    });
    
    const bd = data.categories
      .map(c => ({ ...c, seconds: bMap[c.id] || 0, minutes: Math.floor((bMap[c.id] || 0) / 60) }))
      .filter(c => c.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);
      
    setBreakdown(bd);
    setDailyData(buildDailyData(data.sessions, r));
  }

  useEffect(() => {
    loadRange('week');
  }, []);

  function buildDailyData(sess, r) {
    const now   = new Date();
    const days  = r === 'week' ? 7 : r === 'month' ? 30 : 14;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key  = d.toDateString();
      const mins = sess
        .filter(s => new Date(s.endedAt).toDateString() === key)
        .reduce((a, s) => a + Math.floor(s.actualDurationSeconds / 60), 0);
      result.push({
        date: d,
        label: d.toLocaleDateString('en-US', { weekday: r === 'week' ? 'short' : undefined, month: 'short', day: 'numeric' }),
        shortLabel: r === 'week'
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : `${d.getDate()}`,
        mins,
      });
    }
    return result;
  }

  const totalSecs = sessions.reduce((a, s) => a + s.actualDurationSeconds, 0);
  const maxDayMins = Math.max(...dailyData.map(d => d.mins), 1);

  // Donut chart
  const DONUT_R = 70;
  const DONUT_C = 2 * Math.PI * DONUT_R;
  let cumOffset = 0;
  const donutSlices = breakdown.map(cat => {
    const frac   = totalSecs > 0 ? cat.seconds / totalSecs : 0;
    const dash   = frac * DONUT_C;
    const gap    = DONUT_C - dash;
    const offset = -cumOffset;
    cumOffset   += dash;
    return { ...cat, dash, gap, offset: DONUT_C / 4 - cumOffset + dash };
  });

  const formatTime = (mins) => {
    if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
    return `${mins}m`;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Analytics</h1>
          <p className="page-subtitle">Visualize where your time and energy goes.</p>
        </div>
        {/* Range selector */}
        <div className="flex gap-2">
          {['week', 'month', 'all'].map(r => (
            <button
              key={r}
              id={`range-${r}`}
              className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadRange(r)}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value mono">{stats.totalSessions}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Focus Time</span>
            <span className="stat-value mono">{stats.totalHours}h</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg. Session</span>
            <span className="stat-value mono">
              {stats.totalSessions > 0 ? Math.floor((stats.totalHours * 60) / stats.totalSessions) : 0}m
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today's Focus</span>
            <span className="stat-value mono">{stats.todayMinutes}m</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Donut chart */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Focus by Category</h3>
          {breakdown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🍩</div>
              <p>No sessions in this range.</p>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {donutSlices.map((cat, i) => (
                    <circle
                      key={cat.id}
                      cx="90" cy="90"
                      r={DONUT_R}
                      fill="none"
                      stroke={cat.color}
                      strokeWidth="28"
                      strokeDasharray={`${cat.dash} ${cat.gap}`}
                      strokeDashoffset={DONUT_C / 4 - (donutSlices.slice(0, i).reduce((a, c) => a + c.dash, 0))}
                      style={{ transition: 'all 0.6s ease' }}
                    />
                  ))}
                  {breakdown.length === 0 && (
                    <circle cx="90" cy="90" r={DONUT_R} fill="none" stroke="var(--bg-elevated)" strokeWidth="28" />
                  )}
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column',
                }}>
                  <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {(totalSecs / 3600).toFixed(1)}h
                  </span>
                  <span className="text-xs text-muted">range</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1.25rem', textAlign: 'left' }}>
                {breakdown.map(cat => {
                  const pct = totalSecs > 0 ? Math.round((cat.seconds / totalSecs) * 100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                        <span className="text-sm">{cat.icon} {cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: cat.color, fontWeight: 600 }}>
                          {formatTime(cat.minutes)}
                        </span>
                        <span className="text-xs text-muted">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bar chart — daily breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Daily Focus Time</h3>
          {dailyData.every(d => d.mins === 0) ? (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <p>Complete sessions to see your daily trend.</p>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '0.5rem', paddingBottom: '2rem', position: 'relative' }}>
              {/* Y-axis labels */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: '2rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                {[maxDayMins, Math.round(maxDayMins * 0.5), 0].map(v => (
                  <span key={v} className="text-xs text-muted">{formatTime(v)}</span>
                ))}
              </div>
              {/* Bars */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '0.375rem', paddingLeft: '2.5rem' }}>
                {dailyData.map((day, i) => {
                  const h = maxDayMins > 0 ? (day.mins / maxDayMins) * 160 : 0;
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                      {day.mins > 0 && (
                        <span className="text-xs text-muted">{formatTime(day.mins)}</span>
                      )}
                      <div
                        id={`bar-day-${i}`}
                        title={`${day.label}: ${formatTime(day.mins)}`}
                        style={{
                          width: '100%',
                          height: Math.max(h, day.mins > 0 ? 4 : 0),
                          background: isToday
                            ? 'linear-gradient(180deg, var(--accent-primary), var(--accent-secondary))'
                            : 'var(--bg-elevated)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease',
                          minHeight: day.mins > 0 ? 4 : 0,
                          border: isToday ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                        }}
                      />
                      <span className="text-xs text-muted" style={{
                        marginTop: '0.25rem',
                        color: isToday ? 'var(--accent-secondary)' : 'var(--text-muted)',
                        fontWeight: isToday ? 700 : 400,
                      }}>
                        {day.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category detail table */}
      {breakdown.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Category Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Category', 'Sessions', 'Focus Time', 'Avg Session', 'Goals Hit', 'Share'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map(cat => {
                const catSessions = sessions.filter(s => s.categoryId === cat.id);
                const avgMins = catSessions.length > 0
                  ? Math.floor(cat.seconds / catSessions.length / 60)
                  : 0;
                const goalsHit = catSessions.filter(s => s.goal?.achieved).length;
                const pct = totalSecs > 0 ? Math.round((cat.seconds / totalSecs) * 100) : 0;
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '0.875rem 0.75rem' }}>
                      <span className="flex items-center gap-2">
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: cat.color, flexShrink: 0,
                        }} />
                        {cat.icon} {cat.name}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-secondary)' }}>{catSessions.length}</td>
                    <td style={{ padding: '0.875rem 0.75rem', fontWeight: 700, color: cat.color }}>{formatTime(cat.minutes)}</td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-secondary)' }}>{avgMins}m</td>
                    <td style={{ padding: '0.875rem 0.75rem', color: 'var(--text-secondary)' }}>{goalsHit}/{catSessions.length}</td>
                    <td style={{ padding: '0.875rem 0.75rem', minWidth: 120 }}>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                        <span className="text-xs text-muted">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
