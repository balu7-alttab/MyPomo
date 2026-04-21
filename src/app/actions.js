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
  return prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
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
    include: { goal: true, notes: true, category: true },
    orderBy: { startedAt: 'desc' } 
  });
}

export async function createSession({ categoryId, goalText, durationMinutes }) {
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

  // DEEP PRUNING AND NATIVE AGGREGATIONS
  // We use parallel queries to let the DB do the math instantly, returning only bytes instead of megabytes.
  const [
    sessions,
    categories,
    totalAgg,
    todayAgg,
    weekAgg
  ] = await Promise.all([
    prisma.focusSession.findMany({ 
      where: { userId, status: 'completed', endedAt: { gte: startDate, lte: now } },
      select: {
        categoryId: true,
        actualDurationSeconds: true,
        endedAt: true,
        goal: { select: { achieved: true } }
      },
      orderBy: { endedAt: 'desc' }
    }),
    prisma.category.findMany({ 
      where: { userId },
      select: { id: true, name: true, color: true, icon: true }
    }),
    prisma.focusSession.aggregate({
      _sum: { actualDurationSeconds: true },
      _count: { id: true },
      where: { userId, status: 'completed' }
    }),
    prisma.focusSession.aggregate({
      _sum: { actualDurationSeconds: true },
      _count: { id: true },
      where: { userId, status: 'completed', endedAt: { gte: todayStart } }
    }),
    prisma.focusSession.aggregate({
      _sum: { actualDurationSeconds: true },
      where: { userId, status: 'completed', endedAt: { gte: weekStart } }
    })
  ]);
  
  const stats = {
    totalHours: ((totalAgg._sum.actualDurationSeconds || 0) / 3600).toFixed(1),
    todayMinutes: Math.floor((todayAgg._sum.actualDurationSeconds || 0) / 60),
    weekHours: ((weekAgg._sum.actualDurationSeconds || 0) / 3600).toFixed(1),
    totalSessions: totalAgg._count.id || 0,
    todaySessions: todayAgg._count.id || 0,
  };

  return { sessions, stats, categories };
}
