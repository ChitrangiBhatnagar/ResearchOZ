import type { ApiResponse, ApiError, ApiMeta } from '@research-os/types';

export function createSuccessResponse<T>(data: T, meta?: Partial<ApiMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  meta?: Partial<ApiMeta>
): ApiResponse<never> {
  const error: ApiError = {
    code,
    message,
    ...(details !== undefined && { details }),
  };

  return {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}
