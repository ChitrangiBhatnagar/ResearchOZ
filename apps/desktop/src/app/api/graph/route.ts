import { NextResponse } from 'next/server';
import { buildKnowledgeGraph, getGraphPayload } from '@research-os/db';
import { rebuildGraphCommand } from '@research-os/application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let data = await getGraphPayload();
    if (data.nodes.length === 0) {
      await buildKnowledgeGraph();
      data = await getGraphPayload();
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await rebuildGraphCommand();
    const data = await getGraphPayload();
    return NextResponse.json({ ok: true, ...result, ...data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
