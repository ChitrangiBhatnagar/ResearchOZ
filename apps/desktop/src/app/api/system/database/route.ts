import { NextResponse } from 'next/server';
import { ensureDatabaseReady, getRawClient, resolveDatabasePath } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function describeLocation(): { mode: 'local' | 'remote' | 'demo'; location: string } {
  const remote = process.env.DATABASE_URL;
  if (remote && /^(libsql|https?|wss?):\/\//.test(remote)) {
    return { mode: 'remote', location: new URL(remote).host };
  }
  if (process.env.VERCEL) return { mode: 'demo', location: 'Bundled demo snapshot (resets periodically)' };
  return { mode: 'local', location: resolveDatabasePath() };
}

export async function GET() {
  return NextResponse.json(describeLocation());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'vacuum') {
    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  }
  try {
    await ensureDatabaseReady();
    const started = Date.now();
    await getRawClient().execute('VACUUM');
    return NextResponse.json({ ok: true, durationMs: Date.now() - started });
  } catch (error) {
    return NextResponse.json({ ok: false, error: `VACUUM failed: ${String(error)}` }, { status: 500 });
  }
}
