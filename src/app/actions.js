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

  // SEQUENTIAL QUERIES: Prevent Vercel Serverless Connection Exhaustion
  // We execute these one by one to ensure we only use 1 connection from the Supabase pool.
  const sessions = await prisma.focusSession.findMany({ 
    where: { userId, status: 'completed', endedAt: { gte: startDate, lte: now } },
    select: {
      id: true,
      categoryId: true,
      actualDurationSeconds: true,
      endedAt: true,
      category: {
        select: { id: true, name: true, color: true, icon: true }
      },
      goal: { 
        select: { text: true, achieved: true } 
      }
    },
    orderBy: { endedAt: 'desc' }
  });

  const categories = await prisma.category.findMany({ 
    where: { userId },
    select: { id: true, name: true, color: true, icon: true }
  });

  const totalAgg = await prisma.focusSession.aggregate({
    _sum: { actualDurationSeconds: true },
    _count: { id: true },
    where: { userId, status: 'completed' }
  });

  const todayAgg = await prisma.focusSession.aggregate({
    _sum: { actualDurationSeconds: true },
    _count: { id: true },
    where: { userId, status: 'completed', endedAt: { gte: todayStart } }
  });

  const weekAgg = await prisma.focusSession.aggregate({
    _sum: { actualDurationSeconds: true },
    where: { userId, status: 'completed', endedAt: { gte: weekStart } }
  });
  
  const stats = {
    totalHours: ((totalAgg._sum.actualDurationSeconds || 0) / 3600).toFixed(1),
    todayMinutes: Math.floor((todayAgg._sum.actualDurationSeconds || 0) / 60),
    weekHours: ((weekAgg._sum.actualDurationSeconds || 0) / 3600).toFixed(1),
    totalSessions: totalAgg._count.id || 0,
    todaySessions: todayAgg._count.id || 0,
  };

  return { sessions, stats, categories };
}
