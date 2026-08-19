import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const papers = sqliteTable(
  'papers',
  {
    id: text('id').primaryKey(),
    arxivId: text('arxiv_id').unique(),
    doi: text('doi'),
    title: text('title').notNull(),
    authorsJson: text('authors_json').default('[]').notNull(), // JSON array of string names
    abstract: text('abstract').notNull(),
    source: text('source', { enum: ['arxiv', 'nvidia', 'paperswithcode', 'manual_upload'] })
      .default('arxiv')
      .notNull(),
    pdfUrl: text('pdf_url'),
    localPdfPath: text('local_pdf_path'),
    status: text('status', { enum: ['inbox', 'reading', 'processed', 'archived'] })
      .default('inbox')
      .notNull(),
    primaryCategory: text('primary_category'),
    categoriesJson: text('categories_json').default('[]').notNull(),
    summaryMarkdown: text('summary_markdown'),
    keyContributionsJson: text('key_contributions_json').default('[]').notNull(),
    citationCount: integer('citation_count'),
    publishedAt: text('published_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('papers_status_idx').on(table.status),
    index('papers_arxiv_idx').on(table.arxivId),
    index('papers_published_idx').on(table.publishedAt),
  ]
);

export const paperSections = sqliteTable(
  'paper_sections',
  {
    id: text('id').primaryKey(),
    paperId: text('paper_id')
      .notNull()
      .references(() => papers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    pageNumber: integer('page_number').notNull(),
    orderIndex: integer('order_index').notNull(),
  },
  (table) => [
    index('sections_paper_idx').on(table.paperId),
    index('sections_order_idx').on(table.paperId, table.orderIndex),
  ]
);

export const paperHighlights = sqliteTable(
  'paper_highlights',
  {
    id: text('id').primaryKey(),
    paperId: text('paper_id')
      .notNull()
      .references(() => papers.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    text: text('text').notNull(),
    color: text('color', { enum: ['yellow', 'green', 'blue', 'purple', 'red'] })
      .default('yellow')
      .notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('highlights_paper_idx').on(table.paperId),
    index('highlights_page_idx').on(table.paperId, table.pageNumber),
  ]
);
