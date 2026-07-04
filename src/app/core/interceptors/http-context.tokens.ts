import { HttpContext, HttpContextToken } from '@angular/common/http';

/** When true, the loading interceptor will not show the global progress bar. */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** When true, the error interceptor will not show a toast (caller handles it). */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** Convenience builder for a quiet request (no loader, no auto toast). */
export function silentContext(): HttpContext {
  return new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_TOAST, true);
}
