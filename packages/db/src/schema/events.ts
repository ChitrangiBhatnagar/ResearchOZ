import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const domainEvents = sqliteTable(
  'domain_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    aggregateId: text('aggregate_id'),
    payloadJson: text('payload_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('domain_events_created_idx').on(table.createdAt)]
);

export type DomainEventRow = typeof domainEvents.$inferSelect;
