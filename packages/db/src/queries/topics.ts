import { eq } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { topics } from '../schema/roadmap';

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'review_needed';

function cycleStatus(current: TopicStatus): TopicStatus {
  if (current === 'completed') return 'not_started';
  if (current === 'in_progress') return 'completed';
  return 'in_progress';
}

export async function updateTopicStatus(
  topicId: string,
  status?: TopicStatus
): Promise<{ id: string; status: TopicStatus; actualMinutes: number } | null> {
  const db = await ensureDatabaseReady();
  const [row] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!row) return null;

  const nextStatus = status ?? cycleStatus(row.status as TopicStatus);
  const now = new Date().toISOString();
  let actualMinutes = row.actualMinutes;
  if (nextStatus === 'completed' && actualMinutes === 0) {
    actualMinutes = row.estimatedMinutes;
  }
  if (nextStatus === 'not_started') {
    actualMinutes = 0;
  }

  await db
    .update(topics)
    .set({
      status: nextStatus,
      actualMinutes,
      lastStudiedAt: nextStatus === 'completed' || nextStatus === 'in_progress' ? now : row.lastStudiedAt,
      masteryScore:
        nextStatus === 'completed' ? 100 : nextStatus === 'in_progress' ? Math.max(row.masteryScore, 40) : 0,
      updatedAt: now,
    })
    .where(eq(topics.id, topicId));

  return { id: topicId, status: nextStatus, actualMinutes };
}
