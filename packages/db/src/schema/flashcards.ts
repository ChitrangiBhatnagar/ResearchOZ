import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { topics } from './roadmap';
import { papers } from './research';

export const flashcards = sqliteTable(
  'flashcards',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    paperId: text('paper_id').references(() => papers.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    codeSnippet: text('code_snippet'),
    state: text('state', { enum: ['new', 'learning', 'review', 'relearning'] })
      .default('new')
      .notNull(),
    easeFactor: real('ease_factor').default(2.5).notNull(),
    intervalDays: integer('interval_days').default(0).notNull(),
    repetitionNumber: integer('repetition_number').default(0).notNull(),
    dueAt: text('due_at').notNull(),
    lastReviewedAt: text('last_reviewed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('flashcards_due_idx').on(table.dueAt),
    index('flashcards_topic_idx').on(table.topicId),
    index('flashcards_paper_idx').on(table.paperId),
    index('flashcards_state_idx').on(table.state),
  ]
);

export const flashcardReviews = sqliteTable(
  'flashcard_reviews',
  {
    id: text('id').primaryKey(),
    flashcardId: text('flashcard_id')
      .notNull()
      .references(() => flashcards.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 0 to 5
    reviewedAt: text('reviewed_at').notNull(),
    durationMs: integer('duration_ms').default(0).notNull(),
  },
  (table) => [
    index('reviews_card_idx').on(table.flashcardId),
    index('reviews_date_idx').on(table.reviewedAt),
  ]
);
