/**
 * Mirrors the backend `ApiResponse` envelope returned by every endpoint.
 * @see RouteForex.Application.Common.Models.ApiResponse
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  errorCode?: string | null;
  /** Field-level validation errors keyed by property name. */
  errors?: Record<string, string[]> | null;
  /** Correlation id echoed back for support/tracing. */
  traceId?: string | null;
  timestamp: string;
  data?: T;
}

/** Convenience guard for narrowing a response to its success payload. */
export function isSuccess<T>(res: ApiResponse<T>): res is ApiResponse<T> & { data: T } {
  return res.success === true;
}
