import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema/index.js';
import { createLogger, APP_CONFIG } from '@research-os/shared';
import path from 'node:path';
import fs from 'node:fs';

const logger = createLogger('DatabaseClient');

let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let rawClient: Client | null = null;

export function getDatabase(dbPath?: string): LibSQLDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  const rawPath = dbPath || process.env.DATABASE_PATH || APP_CONFIG.DEFAULT_DB_FILE;
  const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Created database storage directory', { dir });
  }

  // Format file URL for LibSQL local driver
  const fileUrl = `file:${resolvedPath.replace(/\\/g, '/')}`;
  logger.info('Initializing SQLite database connection via LibSQL', { fileUrl });

  rawClient = createClient({
    url: fileUrl,
  });

  initDatabaseTables(rawClient);

  dbInstance = drizzle(rawClient, { schema });
  return dbInstance;
}

export function getRawClient(): Client {
  if (!rawClient) {
    getDatabase();
  }
  return rawClient!;
}

export function closeDatabase(): void {
  if (rawClient) {
    rawClient.close();
    rawClient = null;
    dbInstance = null;
    logger.info('SQLite database connection closed');
  }
}

function initDatabaseTables(client: Client): void {
  // Execute table definitions
  const statements = [
    `CREATE TABLE IF NOT EXISTS roadmaps (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      target_role TEXT,
      total_estimated_hours INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_file TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL,
      estimated_hours INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL DEFAULT 'intermediate',
      status TEXT NOT NULL DEFAULT 'not_started',
      order_index INTEGER NOT NULL,
      estimated_minutes INTEGER NOT NULL DEFAULT 60,
      actual_minutes INTEGER NOT NULL DEFAULT 0,
      mastery_score INTEGER NOT NULL DEFAULT 0,
      last_studied_at TEXT,
      notes_markdown TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS topic_prerequisites (
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      prerequisite_topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      is_required INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (topic_id, prerequisite_topic_id)
    );`,
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      habit_type TEXT NOT NULL,
      description TEXT,
      target_daily_units INTEGER NOT NULL DEFAULT 1,
      unit_label TEXT NOT NULL DEFAULT 'count',
      color TEXT NOT NULL DEFAULT '#6366f1',
      is_active INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      value INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(habit_id, log_date)
    );`,
    `CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      session_type TEXT NOT NULL DEFAULT 'deep_work',
      duration_minutes INTEGER NOT NULL,
      energy_level TEXT NOT NULL DEFAULT 'medium',
      focus_score INTEGER NOT NULL DEFAULT 8,
      notes TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      arxiv_id TEXT UNIQUE,
      doi TEXT,
      title TEXT NOT NULL,
      authors_json TEXT NOT NULL DEFAULT '[]',
      abstract TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'arxiv',
      pdf_url TEXT,
      local_pdf_path TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      primary_category TEXT,
      categories_json TEXT NOT NULL DEFAULT '[]',
      summary_markdown TEXT,
      key_contributions_json TEXT NOT NULL DEFAULT '[]',
      citation_count INTEGER,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paper_sections (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      order_index INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paper_highlights (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'yellow',
      note TEXT,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      paper_id TEXT REFERENCES papers(id) ON DELETE SET NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      code_snippet TEXT,
      state TEXT NOT NULL DEFAULT 'new',
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetition_number INTEGER NOT NULL DEFAULT 0,
      due_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id TEXT PRIMARY KEY,
      flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      node_type TEXT NOT NULL DEFAULT 'concept',
      description TEXT,
      importance REAL NOT NULL DEFAULT 0.5,
      source_paper_id TEXT REFERENCES papers(id) ON DELETE SET NULL,
      source_topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      properties_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS knowledge_edges (
      id TEXT PRIMARY KEY,
      source_node_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
      edge_type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      description TEXT,
      created_at TEXT NOT NULL
    );`
  ];

  for (const sql of statements) {
    client.execute(sql).catch((err) => {
      logger.error('Failed to execute init table statement', err);
    });
  }
}
