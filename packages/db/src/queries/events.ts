import { asc, gt } from 'drizzle-orm';
import { ensureDatabaseReady } from '../client';
import { domainEvents } from '../schema/events';

export type StoredDomainEvent = {
  id: number;
  type: string;
  aggregateId: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
};

export async function appendDomainEvent(input: {
  type: string;
  aggregateId?: string;
  payload?: Record<string, unknown>;
}): Promise<StoredDomainEvent> {
  const db = await ensureDatabaseReady();
  const timestamp = new Date().toISOString();
  const [row] = await db
    .insert(domainEvents)
    .values({
      type: input.type,
      aggregateId: input.aggregateId,
      payloadJson: JSON.stringify(input.payload ?? {}),
      createdAt: timestamp,
    })
    .returning();

  return {
    id: row!.id,
    type: row!.type,
    aggregateId: row!.aggregateId,
    payload: JSON.parse(row!.payloadJson) as Record<string, unknown>,
    timestamp: row!.createdAt,
  };
}

export async function getDomainEvents(afterId = 0, limit = 100): Promise<StoredDomainEvent[]> {
  const db = await ensureDatabaseReady();
  const rows = await db
    .select()
    .from(domainEvents)
    .where(gt(domainEvents.id, afterId))
    .orderBy(asc(domainEvents.id))
    .limit(Math.min(Math.max(limit, 1), 500));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    aggregateId: row.aggregateId,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    timestamp: row.createdAt,
  }));
}
