import { appendDomainEvent, getDomainEvents, type StoredDomainEvent } from '@research-os/db';

export type ResearchEventType =
  | 'topic.updated'
  | 'habit.updated'
  | 'paper.updated'
  | 'graph.updated'
  | 'research.imported';

export type ResearchDomainEvent = Omit<StoredDomainEvent, 'type'> & {
  type: ResearchEventType;
};

export async function publishEvent(input: {
  type: ResearchEventType;
  aggregateId?: string;
  changedFields?: string[];
  payload?: Record<string, unknown>;
}): Promise<ResearchDomainEvent> {
  return appendDomainEvent({
    type: input.type,
    aggregateId: input.aggregateId,
    payload: {
      ...input.payload,
      changedFields: input.changedFields ?? [],
    },
  }) as Promise<ResearchDomainEvent>;
}

export async function readEvents(afterId = 0): Promise<ResearchDomainEvent[]> {
  return getDomainEvents(afterId) as Promise<ResearchDomainEvent[]>;
}
