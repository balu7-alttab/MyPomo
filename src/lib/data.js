'use client';

/**
 * Client-only storage layer for Phase 3
 * Stores the actively running timer across page navigation so 
 * the user can navigate away from /timer without losing state.
 */

const KEYS = {
  activeTimer: 'mypomo_active_timer',
};

function load(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Active Timer State ──────────────────────────────────────────────────────
// Shape: { sessionId, categoryId, goalText, totalSecs, wallClockStart, phase, elapsedAtPause }
export function saveActiveTimer(state) {
  save(KEYS.activeTimer, state);
}

export function loadActiveTimer() {
  return load(KEYS.activeTimer, null);
}

export function clearActiveTimer() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.activeTimer);
}
