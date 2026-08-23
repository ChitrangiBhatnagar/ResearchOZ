import { NextResponse } from 'next/server';
import { generateDailyPlan } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      available_minutes?: number;
      energy_level?: 'low' | 'medium' | 'high' | 'peak';
    };
    const availableMinutes = Math.min(Math.max(body.available_minutes ?? 120, 15), 480);
    const energyLevel = body.energy_level ?? 'medium';
    const plan = await generateDailyPlan({ availableMinutes, energyLevel });
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: String(error) } },
      { status: 500 }
    );
  }
}
