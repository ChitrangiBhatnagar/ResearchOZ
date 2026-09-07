'use client';

import * as React from 'react';

type DomainEvent = {
  id: number;
  type: string;
  aggregateId: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
};

export function useDomainEvents(listener: (event: DomainEvent) => void) {
  const listenerRef = React.useRef(listener);
  listenerRef.current = listener;

  React.useEffect(() => {
    const electronApi = (window as Window & {
      electronAPI?: { onDomainEvent?: (callback: (event: unknown) => void) => () => void };
    }).electronAPI;
    if (electronApi?.onDomainEvent) {
      return electronApi.onDomainEvent((event) => listenerRef.current(event as DomainEvent));
    }

    const source = new EventSource('/api/events');
    const eventTypes = ['topic.updated', 'habit.updated', 'paper.updated', 'graph.updated', 'research.imported'];
    const handlers = eventTypes.map((eventType) => {
      const handler = (event: MessageEvent<string>) => {
        try {
          listenerRef.current(JSON.parse(event.data) as DomainEvent);
        } catch {
          // Ignore malformed events and keep the stream alive.
        }
      };
      source.addEventListener(eventType, handler);
      return [eventType, handler] as const;
    });

    return () => {
      for (const [eventType, handler] of handlers) source.removeEventListener(eventType, handler);
      source.close();
    };
  }, []);
}

export function DomainEventListener() {
  useDomainEvents((event) => {
    window.dispatchEvent(new CustomEvent('researchos:domain-event', { detail: event }));
  });
  return null;
}
