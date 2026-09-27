import { readEvents } from '@research-os/application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const afterParam = new URL(request.url).searchParams.get('after') ?? request.headers.get('last-event-id');
  let cursor = Number.parseInt(afterParam ?? '', 10);
  if (!Number.isFinite(cursor) || cursor < 0) {
    // New subscribers only need events from now on; replaying history would re-trigger every page reload.
    const history = await readEvents(0).catch(() => []);
    cursor = history.at(-1)?.id ?? 0;
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown, id?: number) => {
        if (closed) return;
        if (id !== undefined) controller.enqueue(encoder.encode(`id: ${id}\n`));
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        try {
          const events = await readEvents(cursor);
          for (const event of events) {
            cursor = event.id;
            send(event.type, event, event.id);
          }
          if (events.length === 0) send('heartbeat', { timestamp: new Date().toISOString() });
        } catch (error) {
          send('error', { message: error instanceof Error ? error.message : 'Event stream failed' });
        }
      };

      void poll();
      timer = setInterval(() => void poll(), 1000);
      request.signal.addEventListener('abort', () => {
        closed = true;
        if (timer) clearInterval(timer);
        controller.close();
      });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
