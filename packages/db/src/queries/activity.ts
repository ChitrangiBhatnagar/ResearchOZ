import { ensureDatabaseReady } from '../client';
import { habitLogs } from '../schema/habits';
import { studySessions } from '../schema/sessions';
import { generatePastNDaysHeatmap } from '@research-os/shared';
import type { HeatmapDay } from '@research-os/types';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getActivityHeatmap(daysCount = 90): Promise<HeatmapDay[]> {
  const db = await ensureDatabaseReady();
  const [logs, sessions] = await Promise.all([
    db.select().from(habitLogs),
    db.select().from(studySessions),
  ]);

  const habitsByDate = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    habitsByDate.set(log.logDate, (habitsByDate.get(log.logDate) || 0) + 1);
  }

  const minutesByDate = new Map<string, number>();
  for (const s of sessions) {
    const date = s.startedAt.slice(0, 10);
    minutesByDate.set(date, (minutesByDate.get(date) || 0) + s.durationMinutes);
  }

  const today = new Date();
  const activityMap = new Map<string, { studyMinutes: number; habitsCompleted: number }>();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = isoDate(d);
    activityMap.set(dateStr, {
      studyMinutes: minutesByDate.get(dateStr) || 0,
      habitsCompleted: habitsByDate.get(dateStr) || 0,
    });
  }

  return generatePastNDaysHeatmap(daysCount, activityMap);
}
