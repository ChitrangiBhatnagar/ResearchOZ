import { NextResponse } from 'next/server';
import { getDashboardData } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load dashboard curriculum', error);
    return NextResponse.json(
      { error: 'Failed to load curriculum from database', detail: String(error) },
      { status: 500 }
    );
  }
}
