import { and, asc, eq } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { habits, habitLogs } from '../schema/habits';
import crypto from 'node:crypto';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return isoDate(d);
  });
}

export type HabitWeekRow = {
  id: string;
  name: string;
  habitType: string;
  color: string;
  targetDailyUnits: number;
  unitLabel: string;
  streakDays: number;
  weeklyLogs: boolean[];
};

export type HabitsWeekPayload = {
  weekStart: string;
  weekLabel: string;
  habits: HabitWeekRow[];
  stats: {
    consistencyPct: number;
    completedThisWeek: number;
    totalThisWeek: number;
    longestStreak: number;
    longestStreakName: string;
  };
};

function computeStreak(datesDone: Set<string>, today: string): number {
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);
  while (true) {
    const key = isoDate(cursor);
    if (!datesDone.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 400) break;
  }
  return streak;
}

export async function getHabitsWeek(): Promise<HabitsWeekPayload> {
  const db = await ensureDatabaseReady();
  const weekStart = startOfWeekMonday();
  const days = weekDates(weekStart);
  const today = isoDate(new Date());

  const habitRows = await db
    .select()
    .from(habits)
    .where(eq(habits.isActive, true))
    .orderBy(asc(habits.orderIndex));

  const logs = await db.select().from(habitLogs);
  const logsByHabit = new Map<string, typeof logs>();
  for (const log of logs) {
    const list = logsByHabit.get(log.habitId) || [];
    list.push(log);
    logsByHabit.set(log.habitId, list);
  }

  const mapped: HabitWeekRow[] = habitRows.map((h) => {
    const hLogs = logsByHabit.get(h.id) || [];
    const doneDates = new Set(hLogs.filter((l) => l.completed).map((l) => l.logDate));
    return {
      id: h.id,
      name: h.name,
      habitType: h.habitType,
      color: h.color,
      targetDailyUnits: h.targetDailyUnits,
      unitLabel: h.unitLabel,
      streakDays: computeStreak(doneDates, today),
      weeklyLogs: days.map((d) => doneDates.has(d)),
    };
  });

  const totalThisWeek = mapped.length * 7;
  const completedThisWeek = mapped.reduce(
    (sum, h) => sum + h.weeklyLogs.filter(Boolean).length,
    0
  );
  const longest = mapped.reduce(
    (best, h) => (h.streakDays > best.streak ? { streak: h.streakDays, name: h.name } : best),
    { streak: 0, name: '—' }
  );

  const weekNum = Math.ceil(
    ((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
  );

  return {
    weekStart: days[0]!,
    weekLabel: `Week ${weekNum}, ${weekStart.getFullYear()}`,
    habits: mapped,
    stats: {
      consistencyPct: totalThisWeek === 0 ? 0 : Math.round((completedThisWeek / totalThisWeek) * 1000) / 10,
      completedThisWeek,
      totalThisWeek,
      longestStreak: longest.streak,
      longestStreakName: longest.name,
    },
  };
}

export async function toggleHabitLog(habitId: string, date: string): Promise<{ completed: boolean }> {
  const db = await ensureDatabaseReady();
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.logDate, date)))
    .limit(1);

  if (existing) {
    const next = !existing.completed;
    await db
      .update(habitLogs)
      .set({ completed: next, value: next ? 1 : 0, updatedAt: now })
      .where(eq(habitLogs.id, existing.id));
    return { completed: next };
  }

  await db.insert(habitLogs).values({
    id: `hlog-${crypto.randomUUID()}`,
    habitId,
    logDate: date,
    completed: true,
    value: 1,
    createdAt: now,
    updatedAt: now,
  });
  return { completed: true };
}
