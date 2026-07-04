import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { SKIP_LOADING } from './http-context.tokens';

/**
 * Tracks in-flight requests on the global LoadingService so the shell can show a
 * top progress bar. Requests can opt out via the SKIP_LOADING context token
 * (e.g. background polling, autocomplete lookups).
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
