import { NextResponse } from 'next/server';
import { getActivityHeatmap } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get('days') || 90), 7), 365);
    const heatmap = await getActivityHeatmap(days);
    return NextResponse.json({ heatmap });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
