import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { topics } from './roadmap.js';

export const studySessions = sqliteTable(
  'study_sessions',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    sessionType: text('session_type', {
      enum: ['deep_work', 'reading', 'coding', 'revision', 'quiz'],
    })
      .default('deep_work')
      .notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    energyLevel: text('energy_level', { enum: ['low', 'medium', 'high', 'peak'] })
      .default('medium')
      .notNull(),
    focusScore: integer('focus_score').default(8).notNull(), // 1 to 10
    notes: text('notes'),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('sessions_topic_idx').on(table.topicId),
    index('sessions_started_idx').on(table.startedAt),
    index('sessions_type_idx').on(table.sessionType),
  ]
);
