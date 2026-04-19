'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getAnalyticsData } from '@/app/actions';

export default function DashboardPage() {
  const [stats, setStats]         = useState(null);
  const [categories, setCategories] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [weekBreakdown, setWeekBreakdown] = useState([]);
  const [greeting, setGreeting]   = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    async function loadData() {
      // Load Analytics for 'week' to get the week breakdown
      const weeklyData = await getAnalyticsData('week');

      setCategories(weeklyData.categories);
      setStats(weeklyData.stats);

      // Separate out today's sessions vs week breakdown
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todays = weeklyData.sessions.filter(s => new Date(s.endedAt) >= todayStart);
      setTodaySessions(todays.slice(0, 5));

      // Build week breakdown by category
      const breakdownMap = {};
      weeklyData.sessions.forEach(s => {
        if (!breakdownMap[s.categoryId]) breakdownMap[s.categoryId] = 0;
        breakdownMap[s.categoryId] += s.actualDurationSeconds;
      });
      const breakdown = weeklyData.categories
        .map(c => ({ ...c, minutes: Math.floor((breakdownMap[c.id] || 0) / 60) }))
        .filter(c => c.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);
        
      setWeekBreakdown(breakdown);
    }
    loadData();
  }, []);

  const formatTime = (mins) => {
    if (mins >= 60) return `${(mins / 60).toFixed(1)}h`;
    return `${mins}m`;
  };

  const getCategory = (id) => categories.find(c => c.id === id);

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-muted text-sm" style={{ marginBottom: '0.25rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="page-title">{greeting} 👋</h1>
          <p className="page-subtitle">What will you focus on today?</p>
        </div>
        <Link href="/timer" id="start-session-btn" className="btn btn-primary btn-lg">
          <span>⏱️</span> Start Focus Session
        </Link>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-label">Today's Focus</span>
            <span className="stat-value mono">{stats.todayMinutes}m</span>
            <span className="stat-sub">{stats.todaySessions} sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">This Week</span>
            <span className="stat-value mono">{stats.weekHours}h</span>
            <span className="stat-sub">focused time</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">All Time</span>
            <span className="stat-value mono">{stats.totalHours}h</span>
            <span className="stat-sub">{stats.totalSessions} sessions total</span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>



          {/* Recent Sessions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3>📋 Recent Sessions</h3>
              <Link href="/sessions" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {todaySessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍅</div>
                <p>No sessions today yet. Start your first one!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {todaySessions.map(session => {
                  const cat = session.category;
                  const mins = Math.floor(session.actualDurationSeconds / 60);
                  return (
                    <div key={session.id} id={`session-card-${session.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.875rem 1rem',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `3px solid ${cat?.color || 'var(--accent-primary)'}`,
                      }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat?.icon || '🍅'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {session.goal?.text || 'Untitled session'}
                        </div>
                        <div className="text-xs text-muted">{cat?.name} · {mins}m</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="text-xs" style={{ color: session.goal?.achieved ? 'var(--success)' : 'var(--text-muted)' }}>
                          {session.goal?.achieved === true ? '✅' : session.goal?.achieved === false ? '❌' : '—'}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick Start */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(124,90,240,0.15) 0%, rgba(164,139,250,0.08) 100%)',
            border: '1px solid rgba(124,90,240,0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🍅</div>
            <h3 style={{ marginBottom: '0.5rem' }}>Ready to focus?</h3>
            <p className="text-sm" style={{ marginBottom: '1.25rem' }}>
              Set your intention, pick a category, and get into flow.
            </p>
            <Link href="/timer" id="quick-start-btn" className="btn btn-primary w-full">
              ▶ Start Session
            </Link>
          </div>

          {/* Weekly Breakdown */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>📊 This Week</h3>
            {weekBreakdown.length === 0 ? (
              <p className="text-sm text-muted text-center" style={{ padding: '1rem' }}>
                Complete sessions to see your breakdown
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {weekBreakdown.map(cat => {
                  const totalWeekMins = weekBreakdown.reduce((a, c) => a + c.minutes, 0);
                  const pct = totalWeekMins > 0 ? Math.round((cat.minutes / totalWeekMins) * 100) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2 text-sm">
                          <span>{cat.icon}</span> {cat.name}
                        </span>
                        <span className="text-sm" style={{ color: cat.color, fontWeight: 600 }}>
                          {formatTime(cat.minutes)}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
