import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const habits = sqliteTable(
  'habits',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    habitType: text('habit_type', {
      enum: ['study', 'coding', 'paper', 'revision', 'sleep', 'exercise', 'meditation'],
    }).notNull(),
    description: text('description'),
    targetDailyUnits: integer('target_daily_units').default(1).notNull(),
    unitLabel: text('unit_label').default('count').notNull(),
    color: text('color').default('#6366f1').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('habits_active_idx').on(table.isActive),
    index('habits_type_idx').on(table.habitType),
  ]
);

export const habitLogs = sqliteTable(
  'habit_logs',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    logDate: text('log_date').notNull(), // YYYY-MM-DD
    completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
    value: integer('value').default(0).notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('habit_log_date_unique').on(table.habitId, table.logDate),
    index('habit_logs_date_idx').on(table.logDate),
    index('habit_logs_habit_idx').on(table.habitId),
  ]
);
