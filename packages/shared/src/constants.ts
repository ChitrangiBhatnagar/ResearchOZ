export const APP_CONFIG = {
  APP_NAME: 'ResearchOS',
  VERSION: '0.1.0',
  DEFAULT_API_PORT: 8765,
  DEFAULT_API_HOST: '127.0.0.1',
  DEFAULT_DB_FILE: 'storage/researchos.db',
  DEFAULT_OLLAMA_URL: 'http://127.0.0.1:11434',
  PERFORMANCE_TARGETS: {
    MAX_STARTUP_MS: 2000,
    MAX_MEMORY_MB: 400,
    MAX_SEARCH_LATENCY_MS: 100,
    MAX_PDF_LOAD_MS: 500,
  },
  STORAGE: {
    PAPERS_DIR: 'storage/papers',
    NOTES_DIR: 'storage/notes',
    CACHE_DIR: 'storage/cache',
    EMBEDDINGS_DIR: 'storage/embeddings',
  },
} as const;

export const SM2_DEFAULTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MINIMUM_EASE_FACTOR: 1.3,
  INITIAL_INTERVAL_DAYS: 1,
  SECOND_INTERVAL_DAYS: 6,
} as const;

export const DEFAULT_HABITS = [
  { name: 'Deep Study', habitType: 'study', targetDailyUnits: 120, unitLabel: 'mins', color: '#10b981' },
  { name: 'Research Paper', habitType: 'paper', targetDailyUnits: 1, unitLabel: 'paper', color: '#6366f1' },
  { name: 'CUDA / PyTorch Coding', habitType: 'coding', targetDailyUnits: 60, unitLabel: 'mins', color: '#f59e0b' },
  { name: 'Spaced Flashcards', habitType: 'revision', targetDailyUnits: 15, unitLabel: 'cards', color: '#ec4899' },
  { name: 'Exercise', habitType: 'exercise', targetDailyUnits: 45, unitLabel: 'mins', color: '#06b6d4' },
  { name: 'Mindfulness / Reflection', habitType: 'meditation', targetDailyUnits: 10, unitLabel: 'mins', color: '#8b5cf6' },
] as const;
