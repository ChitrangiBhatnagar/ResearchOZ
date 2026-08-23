import { asc, eq, lte, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { ensureDatabaseReady } from '../client';
import { flashcards, flashcardReviews } from '../schema/flashcards';
import { topics } from '../schema/roadmap';
import { calculateSM2NextReview } from '@research-os/shared';

export type FlashcardItem = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  codeSnippet: string | null;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
};

export async function getDueFlashcards(limit = 20): Promise<FlashcardItem[]> {
  const db = await ensureDatabaseReady();
  const now = new Date().toISOString();
  const rows = await db
    .select({
      card: flashcards,
      topicTitle: topics.title,
    })
    .from(flashcards)
    .leftJoin(topics, eq(flashcards.topicId, topics.id))
    .where(or(eq(flashcards.state, 'new'), lte(flashcards.dueAt, now)))
    .orderBy(asc(flashcards.dueAt))
    .limit(limit);

  return rows.map(({ card, topicTitle }) => ({
    id: card.id,
    topic: topicTitle || 'General',
    question: card.question,
    answer: card.answer,
    codeSnippet: card.codeSnippet,
    repetitions: card.repetitionNumber,
    intervalDays: card.intervalDays,
    easeFactor: card.easeFactor,
  }));
}

export async function reviewFlashcard(
  cardId: string,
  rating: number
): Promise<{ ok: true; dueAt: string } | { ok: false; error: string }> {
  const db = await ensureDatabaseReady();
  const [card] = await db.select().from(flashcards).where(eq(flashcards.id, cardId)).limit(1);
  if (!card) return { ok: false, error: 'Flashcard not found' };

  const sm2 = calculateSM2NextReview(
    rating,
    card.repetitionNumber,
    card.intervalDays,
    card.easeFactor
  );
  const now = new Date().toISOString();

  await db
    .update(flashcards)
    .set({
      repetitionNumber: sm2.repetitionNumber,
      intervalDays: sm2.intervalDays,
      easeFactor: sm2.easeFactor,
      dueAt: sm2.dueAt,
      lastReviewedAt: now,
      state: sm2.repetitionNumber === 0 ? 'relearning' : sm2.intervalDays <= 1 ? 'learning' : 'review',
      updatedAt: now,
    })
    .where(eq(flashcards.id, cardId));

  await db.insert(flashcardReviews).values({
    id: `frev-${crypto.randomUUID()}`,
    flashcardId: cardId,
    rating,
    reviewedAt: now,
    durationMs: 0,
  });

  return { ok: true, dueAt: sm2.dueAt };
}
