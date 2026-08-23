import { NextResponse } from 'next/server';
import { searchAndIngestPapers, type PaperSource } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; source?: PaperSource; maxResults?: number };
    if (!body.query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    const result = await searchAndIngestPapers({
      query: body.query,
      source: body.source,
      maxResults: body.maxResults,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
