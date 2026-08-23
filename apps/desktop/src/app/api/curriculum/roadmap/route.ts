import { NextResponse } from 'next/server';
import { getActiveRoadmapTree } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roadmap = await getActiveRoadmapTree();
    if (!roadmap) {
      return NextResponse.json(
        { error: 'No curriculum loaded. Run: pnpm --filter @research-os/db import:master' },
        { status: 404 }
      );
    }
    return NextResponse.json(roadmap);
  } catch (error) {
    console.error('Failed to load roadmap', error);
    return NextResponse.json(
      { error: 'Failed to load roadmap', detail: String(error) },
      { status: 500 }
    );
  }
}
