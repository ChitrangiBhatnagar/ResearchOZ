import { NextResponse } from 'next/server';
import { getHabitsWeek, toggleHabitLog } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getHabitsWeek();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { habitId?: string; date?: string };
    if (!body.habitId || !body.date) {
      return NextResponse.json({ error: 'habitId and date required' }, { status: 400 });
    }
    const result = await toggleHabitLog(body.habitId, body.date);
    const week = await getHabitsWeek();
    return NextResponse.json({ ...week, toggled: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
