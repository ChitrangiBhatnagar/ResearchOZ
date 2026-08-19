export interface ApiMeta {
  timestamp: string;
  durationMs?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Study' | 'Research' | 'AI' | 'Roadmap';
  shortcut?: string;
  icon?: string;
  action: () => void | Promise<void>;
}
