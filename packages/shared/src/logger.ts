type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  durationMs?: number;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private write(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error, durationMs?: number) {
    const payload: LogPayload = {
      level,
      module: this.module,
      message,
      timestamp: new Date().toISOString(),
      ...(durationMs !== undefined && { durationMs }),
      ...(data && { data }),
      ...(error && {
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
    };

    const formatted = `[${payload.timestamp}] [${payload.level}] [${payload.module}] ${payload.message}${
      durationMs !== undefined ? ` (${durationMs}ms)` : ''
    }${data ? ` ${JSON.stringify(data)}` : ''}${payload.error ? ` - Error: ${payload.error.message}` : ''}`;

    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      this.write('DEBUG', message, data);
    }
  }

  info(message: string, data?: Record<string, unknown>, durationMs?: number) {
    this.write('INFO', message, data, undefined, durationMs);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.write('WARN', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.write('ERROR', message, data, err);
  }

  async time<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.info(`${operationName} completed`, undefined, durationMs);
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`${operationName} failed after ${durationMs}ms`, error);
      throw error;
    }
  }
}

export const createLogger = (module: string) => new Logger(module);
