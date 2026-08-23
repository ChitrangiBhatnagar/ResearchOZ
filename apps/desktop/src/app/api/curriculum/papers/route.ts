import { NextResponse } from 'next/server';
import { getPapers } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const papers = await getPapers(200);
    return NextResponse.json({ papers });
  } catch (error) {
    console.error('Failed to load papers', error);
    return NextResponse.json(
      { error: 'Failed to load papers', detail: String(error) },
      { status: 500 }
    );
  }
}
