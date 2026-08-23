import { NextResponse } from 'next/server';
import { getGraphNodeDetail } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getGraphNodeDetail(id);
    if (!detail) return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
