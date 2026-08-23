import { NextResponse } from 'next/server';
import { getDueFlashcards, reviewFlashcard } from '@research-os/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cards = await getDueFlashcards(30);
    return NextResponse.json({ cards });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cardId?: string; rating?: number };
    if (!body.cardId || body.rating == null) {
      return NextResponse.json({ error: 'cardId and rating required' }, { status: 400 });
    }
    const result = await reviewFlashcard(body.cardId, body.rating);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
