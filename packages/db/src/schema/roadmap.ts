import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const roadmaps = sqliteTable(
  'roadmaps',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    targetRole: text('target_role'),
    totalEstimatedHours: integer('total_estimated_hours').default(0).notNull(),
    status: text('status', { enum: ['draft', 'active', 'completed', 'archived'] })
      .default('active')
      .notNull(),
    sourceType: text('source_type', { enum: ['manual', 'excel_import', 'ai_generated'] })
      .default('manual')
      .notNull(),
    sourceFile: text('source_file'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('roadmaps_status_idx').on(table.status),
    index('roadmaps_slug_idx').on(table.slug),
  ]
);

export const milestones = sqliteTable(
  'milestones',
  {
    id: text('id').primaryKey(),
    roadmapId: text('roadmap_id')
      .notNull()
      .references(() => roadmaps.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull(),
    estimatedHours: integer('estimated_hours').default(0).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('milestones_roadmap_idx').on(table.roadmapId),
    index('milestones_order_idx').on(table.roadmapId, table.orderIndex),
  ]
);

export const topics = sqliteTable(
  'topics',
  {
    id: text('id').primaryKey(),
    milestoneId: text('milestone_id')
      .notNull()
      .references(() => milestones.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    difficulty: text('difficulty', { enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
      .default('intermediate')
      .notNull(),
    status: text('status', { enum: ['not_started', 'in_progress', 'completed', 'review_needed'] })
      .default('not_started')
      .notNull(),
    orderIndex: integer('order_index').notNull(),
    estimatedMinutes: integer('estimated_minutes').default(60).notNull(),
    actualMinutes: integer('actual_minutes').default(0).notNull(),
    masteryScore: integer('mastery_score').default(0).notNull(),
    lastStudiedAt: text('last_studied_at'),
    notesMarkdown: text('notes_markdown'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('topics_milestone_idx').on(table.milestoneId),
    index('topics_status_idx').on(table.status),
    index('topics_slug_idx').on(table.slug),
  ]
);

export const topicPrerequisites = sqliteTable(
  'topic_prerequisites',
  {
    topicId: text('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    prerequisiteTopicId: text('prerequisite_topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    isRequired: integer('is_required', { mode: 'boolean' }).default(true).notNull(),
  },
  (table) => [
    index('prereq_topic_idx').on(table.topicId),
    index('prereq_target_idx').on(table.prerequisiteTopicId),
  ]
);
