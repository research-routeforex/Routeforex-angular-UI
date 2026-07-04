import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

const AUTH_ENDPOINTS = ['Auth/login', 'Auth/refresh', 'Auth/logout'];

const isAuthEndpoint = (url: string): boolean => AUTH_ENDPOINTS.some((e) => url.includes(e));

const withBearer = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Attaches the JWT access token to outgoing requests and transparently handles
 * token expiry:
 *  1. On a 401 for a non-auth endpoint, calls the (de-duplicated) refresh flow.
 *  2. Retries the original request with the rotated access token.
 *  3. If refresh fails, logs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);

  // Never attach/refresh for the auth endpoints themselves.
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = storage.accessToken;
  const authReq = token ? withBearer(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRefresh =
        error.status === 401 && !!storage.refreshToken && !storage.isRefreshTokenExpired();

      if (!canRefresh) {
        return throwError(() => error);
      }

      return auth.refreshToken().pipe(
        switchMap((result) => next(withBearer(req, result.accessToken))),
        catchError((refreshError) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
