'use client';

import { useState, useEffect } from 'react';

const FOCUS_INSIGHTS = [
  { type: 'stat', icon: '📊', title: 'The 23-Minute Rule', text: 'It takes an average of 23 minutes to return to deep focus after a single interruption.', source: 'UC Irvine' },
  { type: 'stat', icon: '📊', title: 'Context Switching', text: 'Toggling between different tasks can reduce your productivity by as much as 40%.', source: 'APA' },
  { type: 'stat', icon: '📊', title: 'The 500% Boost', text: 'Employees in a flow state are up to 5x more productive than their peers.', source: 'McKinsey & Co' },
  { type: 'stat', icon: '📊', title: 'Error Doubling', text: 'Even a 3-second interruption can double the error rate on complex tasks.', source: 'Michigan State' },
  { type: 'stat', icon: '📊', title: 'The 1,200 Switch', text: 'Average office workers switch apps over 1,000 times a day, fracturing focus.', source: 'Pegasystems' },
  { type: 'quote', icon: '💡', text: 'Focus on being productive instead of busy.', source: 'Tim Ferriss' },
  { type: 'quote', icon: '💡', text: 'Deep Work is the superpower of the 21st century.', source: 'Cal Newport' },
  { type: 'quote', icon: '💡', text: 'Goals set your direction; systems make your progress.', source: 'James Clear' },
];

export default function FocusInsightWidget({ className = '', style = {} }) {
  const [mounted, setMounted] = useState(false);
  const [insightIndex, setInsightIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Pick a random initial index on mount
    setInsightIndex(Math.floor(Math.random() * FOCUS_INSIGHTS.length));

    // Rotate every 10 minutes (600,000 ms)
    const interval = setInterval(() => {
      setInsightIndex((current) => (current + 1) % FOCUS_INSIGHTS.length);
    }, 600000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const currentInsight = FOCUS_INSIGHTS[insightIndex];

  return (
    <div key={insightIndex} className={`fade-in ${className}`} style={{ fontSize: '0.75rem', lineHeight: 1.6, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '1rem' }}>{currentInsight.icon}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.625rem' }}>
          {currentInsight.type === 'stat' ? 'Focus Stat' : 'Focus Quote'}
        </span>
      </div>
      
      {currentInsight.title && (
        <div style={{ fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: '0.125rem', fontSize: '0.8125rem' }}>
          {currentInsight.title}
        </div>
      )}
      
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.75rem', fontStyle: currentInsight.type === 'quote' ? 'italic' : 'normal' }}>
        "{currentInsight.text}"
      </p>
      
      <div style={{ marginTop: '0.5rem', fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        — {currentInsight.source}
      </div>
    </div>
  );
}
