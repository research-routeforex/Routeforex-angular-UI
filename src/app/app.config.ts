import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { routes } from './app.routes';

/**
 * Root application providers.
 *
 * Interceptor order (outermost → innermost):
 *   1. loadingInterceptor — global progress bar around every request
 *   2. errorInterceptor    — user-facing toast + authz routing for failures
 *   3. authInterceptor     — attaches the JWT and performs token refresh + retry
 *
 * The app is zoneless: change detection is driven entirely by Signals + OnPush.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Synchronous (not Async): with zoneless CD, provideAnimationsAsync() lazy-loads
    // the animations engine and the first Material-heavy lazy route can render before
    // it resolves, leaving interpolations unflushed until a click/refresh. Loading the
    // engine eagerly removes that first-paint gap.
    provideAnimations(),
    provideHttpClient(
      withInterceptors([loadingInterceptor, errorInterceptor, authInterceptor]),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
  ],
};
