import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { papers } from './research';
import { topics } from './roadmap';

export const knowledgeNodes = sqliteTable(
  'knowledge_nodes',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull().unique(),
    nodeType: text('node_type', {
      enum: [
        'concept',
        'model_architecture',
        'algorithm',
        'technique',
        'paper',
        'benchmark',
        'framework',
        'hardware',
      ],
    })
      .default('concept')
      .notNull(),
    description: text('description'),
    importance: real('importance').default(0.5).notNull(), // 0.0 to 1.0
    sourcePaperId: text('source_paper_id').references(() => papers.id, { onDelete: 'set null' }),
    sourceTopicId: text('source_topic_id').references(() => topics.id, { onDelete: 'set null' }),
    propertiesJson: text('properties_json').default('{}').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('nodes_label_idx').on(table.label),
    index('nodes_type_idx').on(table.nodeType),
  ]
);

export const knowledgeEdges = sqliteTable(
  'knowledge_edges',
  {
    id: text('id').primaryKey(),
    sourceNodeId: text('source_node_id')
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: 'cascade' }),
    targetNodeId: text('target_node_id')
      .notNull()
      .references(() => knowledgeNodes.id, { onDelete: 'cascade' }),
    edgeType: text('edge_type', {
      enum: [
        'improves',
        'uses',
        'replaces',
        'cites',
        'implements',
        'prerequisite_of',
        'evaluated_on',
      ],
    }).notNull(),
    weight: real('weight').default(1.0).notNull(),
    description: text('description'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('edges_source_idx').on(table.sourceNodeId),
    index('edges_target_idx').on(table.targetNodeId),
    index('edges_type_idx').on(table.edgeType),
  ]
);
