'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { auth } from '@/lib/auth';

// ─── User (Auth.js) ───────────────────────────────────────────────────────
const getUserId = cache(async () => {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  let finalUserId = session.user.id;

  // Fallback: If Auth.js beta drops the JWT user.id, retrieve it securely via their Google Email!
  if (!finalUserId && session.user.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (dbUser) finalUserId = dbUser.id;
  }

  if (!finalUserId) {
    throw new Error('Unauthorized: Could not resolve strict User ID');
  }
  
  return finalUserId;
});

// ─── Categories ─────────────────────────────────────────────────────────────
export async function getCategories() {
  const userId = await getUserId();
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  
  if (categories.length === 0) {
    // Seed default categories as fallback
    await prisma.category.createMany({
      data: [
        { userId, name: 'Work', color: '#3b82f6', icon: '💼' },
        { userId, name: 'Study', color: '#8b5cf6', icon: '📚' },
        { userId, name: 'Personal', color: '#10b981', icon: '🧘' }
      ]
    });
    return prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }
  
  return categories;
}

export async function saveCategory(catForm) {
  const userId = await getUserId();
  if (catForm.id) {
    await prisma.category.update({ 
      where: { userId_id: { id: catForm.id, userId } }, 
      data: { name: catForm.name, color: catForm.color, icon: catForm.icon } 
    });
  } else {
    await prisma.category.create({ 
      data: { userId, name: catForm.name, color: catForm.color, icon: catForm.icon } 
    });
  }
  revalidatePath('/');
  revalidatePath('/categories');
  revalidatePath('/analytics');
}

export async function deleteCategory(id) {
  const userId = await getUserId();
  await prisma.category.delete({ where: { userId_id: { id, userId } } });
  revalidatePath('/');
  revalidatePath('/categories');
  revalidatePath('/analytics');
}

// ─── Sessions ───────────────────────────────────────────────────────────────
export async function getSessions() {
  const userId = await getUserId();
  return prisma.focusSession.findMany({ 
    where: { userId }, 
    select: {
      id: true,
      categoryId: true,
      status: true,
      actualDurationSeconds: true,
      startedAt: true,
      endedAt: true,
      goal: { 
        select: { text: true, achieved: true } 
      },
      notes: {
        select: { id: true, text: true }
      },
      category: {
        select: { id: true, name: true, color: true, icon: true }
      }
    },
    orderBy: { startedAt: 'desc' } 
  });
}

export async function createSession({ id, categoryId, goalText, durationMinutes }) {
  const userId = await getUserId();

  // Enforce single-active-session constraint
  const existingActive = await prisma.focusSession.findFirst({
    where: { userId, status: 'in_progress' }
  });
  if (existingActive) {
    return { error: 'An active focus session already exists. Please complete or abandon it first.' };
  }

  const session = await prisma.focusSession.create({
    data: {
      id, // Client-provided exact UUID for perfect Optimistic UI tracking!
      userId,
      categoryId,
      durationMinutes,
      status: 'in_progress',
      goal: {
        create: { text: goalText }
      }
    },
    include: { goal: true }
  });
  revalidatePath('/');
  revalidatePath('/sessions');
  revalidatePath('/analytics');
  return session;
}

export async function completeSession(id, { actualDurationSeconds, goalAchieved, note }) {
  try {
    const userId = await getUserId();
    const session = await prisma.focusSession.update({
      where: { userId_id: { id, userId } },
      data: {
        status: 'completed',
        actualDurationSeconds,
        endedAt: new Date(),
        goal: {
          update: { achieved: goalAchieved }
        },
        notes: note ? {
          create: { text: note }
        } : undefined
      }
    });
    revalidatePath('/');
    revalidatePath('/sessions');
    revalidatePath('/analytics');
    return session;
  } catch (error) {
    console.error("completeSession error:", error);
    return { error: error.message || "Database update failed" };
  }
}

export async function abandonSession(id, actualDurationSeconds) {
  const userId = await getUserId();
  const session = await prisma.focusSession.update({
    where: { userId_id: { id, userId } },
    data: {
      status: 'abandoned',
      actualDurationSeconds,
      endedAt: new Date(),
    }
  });
  revalidatePath('/');
  revalidatePath('/sessions');
  revalidatePath('/analytics');
  return session;
}

export async function addNoteToSession(sessionId, text) {
  const userId = await getUserId();
  const session = await prisma.focusSession.findUnique({ where: { id: sessionId, userId }});
  if (!session) throw new Error("Unauthorized");
  
  await prisma.note.create({
    data: { focusSessionId: sessionId, text }
  });
  revalidatePath('/sessions');
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export async function getAnalyticsData(range = 'week') {
  const userId = await getUserId();
  const now = new Date();
  
  let startDate = new Date(0); 
  if (range === 'week') {
    const day = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // 1. Fetch categories
  // 2. Fetch all completed sessions for this user
  const [allCompletedSessions, categories] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId, status: 'completed' },
      select: {
        id: true,
        categoryId: true,
        actualDurationSeconds: true,
        endedAt: true,
        goal: { 
          select: { text: true, achieved: true } 
        }
      },
      orderBy: { endedAt: 'desc' }
    }),
    getCategories()
  ]);

  // Compute sessions in selected range
  const sessions = allCompletedSessions
    .filter(s => s.endedAt && s.endedAt >= startDate && s.endedAt <= now)
    .map(s => {
      // Map category object locally to avoid duplicate DB joins
      const cat = categories.find(c => c.id === s.categoryId);
      return {
        ...s,
        category: cat ? { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } : null
      };
    });

  // Compute aggregates in memory
  let totalDurationSec = 0;
  let totalSessionsCount = 0;
  let todayDurationSec = 0;
  let todaySessionsCount = 0;
  let weekDurationSec = 0;

  for (const s of allCompletedSessions) {
    const duration = s.actualDurationSeconds || 0;
    const endedAtMs = s.endedAt ? new Date(s.endedAt).getTime() : 0;

    // Total stats
    totalDurationSec += duration;
    totalSessionsCount += 1;

    // Today stats
    if (endedAtMs >= todayStart.getTime()) {
      todayDurationSec += duration;
      todaySessionsCount += 1;
    }

    // Week stats
    if (endedAtMs >= weekStart.getTime()) {
      weekDurationSec += duration;
    }
  }
  
  const stats = {
    totalHours: (totalDurationSec / 3600).toFixed(1),
    todayMinutes: Math.floor(todayDurationSec / 60),
    weekHours: (weekDurationSec / 3600).toFixed(1),
    totalSessions: totalSessionsCount,
    todaySessions: todaySessionsCount,
  };

  return { sessions, stats, categories };
}

// ─── Timer Sync (Server-Driven) ───────────────────────────────────────────
export async function getActiveSession() {
  const userId = await getUserId();
  return prisma.focusSession.findFirst({
    where: { 
      userId, 
      status: { in: ['in_progress', 'paused'] } 
    },
    include: {
      category: true,
      goal: true
    }
  });
}

export async function pauseSession(id, elapsedSeconds) {
  const userId = await getUserId();
  const session = await prisma.focusSession.update({
    where: { id, userId },
    data: {
      status: 'paused',
      actualDurationSeconds: elapsedSeconds
    }
  });
  return session;
}

export async function resumeSession(id) {
  const userId = await getUserId();
  
  const existing = await prisma.focusSession.findUnique({ where: { id, userId } });
  if (!existing || existing.status !== 'paused') return existing;

  // Slide startedAt forward by the exact paused duration
  const newStartedAt = new Date(Date.now() - (existing.actualDurationSeconds * 1000));

  const session = await prisma.focusSession.update({
    where: { id, userId },
    data: {
      status: 'in_progress',
      startedAt: newStartedAt
    }
  });
  return session;
}

// ─── User Preferences ──────────────────────────────────────────────────────
export async function getPreferences() {
  const userId = await getUserId();
  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  return pref ?? { startSound: 'none', ambientSound: 'none', endSound: 'chime' };
}

export async function savePreferences({ startSound, ambientSound, endSound }) {
  const userId = await getUserId();
  await prisma.userPreference.upsert({
    where:  { userId },
    update: { startSound, ambientSound, endSound },
    create: { userId, startSound, ambientSound, endSound },
  });
  revalidatePath('/settings');
}
