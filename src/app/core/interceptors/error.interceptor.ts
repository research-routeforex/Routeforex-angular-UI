import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_TOAST } from './http-context.tokens';

/** Pulls the most useful message out of an error response body. */
function extractMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiResponse | string | undefined;

  if (body && typeof body === 'object') {
    // Prefer the first field-level validation error, else the envelope message.
    if (body.errors) {
      const first = Object.values(body.errors)[0]?.[0];
      if (first) return first;
    }
    if (body.message) return body.message;
  }

  switch (error.status) {
    case 0:
      return 'Cannot reach the server. Check your connection.';
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This operation conflicts with existing data.';
    case 422:
      return 'Validation failed. Please review your input.';
    case 500:
      return 'An unexpected server error occurred.';
    default:
      return `Request failed (${error.status}).`;
  }
}

/**
 * Centralized HTTP error handling: surfaces a user-friendly toast and routes
 * authz failures. Runs outside the auth interceptor, so a 401 reaching here
 * means a refresh has already failed. Callers can suppress the toast via the
 * SKIP_ERROR_TOAST context token and handle the error themselves.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SKIP_ERROR_TOAST)) {
        notify.error(extractMessage(error));
      }
      if (error.status === 403) {
        void router.navigate(['/forbidden']);
      }
      return throwError(() => error);
    }),
  );
};
