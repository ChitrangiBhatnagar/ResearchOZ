import { NextResponse } from 'next/server';
import { APP_CONFIG } from '@research-os/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIDECAR_URL = (
  process.env.RESEARCHOS_API_URL || `http://${APP_CONFIG.DEFAULT_API_HOST}:${APP_CONFIG.DEFAULT_API_PORT}`
).replace(/\/$/, '');

export async function GET() {
  try {
    const res = await fetch(`${SIDECAR_URL}/api/v1/agent/status`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ sidecar: false, llm: false });
    const json = (await res.json()) as { data?: { ollama_available?: boolean } };
    return NextResponse.json({ sidecar: true, llm: Boolean(json.data?.ollama_available) });
  } catch {
    return NextResponse.json({ sidecar: false, llm: false });
  }
}
