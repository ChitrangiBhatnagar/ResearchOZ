import { NextResponse } from 'next/server';
import { updateTopicStatusCommand } from '@research-os/application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { status?: string };
    const allowedStatuses = ['not_started', 'in_progress', 'completed', 'review_needed'] as const;
    if (body.status !== undefined && !allowedStatuses.includes(body.status as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: 'Invalid topic status' }, { status: 400 });
    }
    const result = await updateTopicStatusCommand({
      topicId: id,
      status: body.status as 'not_started' | 'in_progress' | 'completed' | 'review_needed' | undefined,
    });
    if (!result) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
