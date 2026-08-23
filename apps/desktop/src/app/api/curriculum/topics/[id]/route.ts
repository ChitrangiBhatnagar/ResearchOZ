import { NextResponse } from 'next/server';
import { updateTopicStatus } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { status?: string };
    const result = await updateTopicStatus(
      id,
      body.status as 'not_started' | 'in_progress' | 'completed' | 'review_needed' | undefined
    );
    if (!result) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
