import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { HttpContext } from '@angular/common/http';
import {
  AuthResult,
  AuthUserInfo,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  StoredSession,
} from '../models/auth.model';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context.tokens';
import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Signal-based auth store and the single source of truth for the current session.
 *
 * Holds reactive state (`user`, `roles`, `isAuthenticated`) and owns the token
 * lifecycle: login, logout and refresh-token rotation. The refresh call is
 * de-duplicated via `shareReplay` so a burst of concurrent 401s triggers exactly
 * one network refresh.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly _session = signal<StoredSession | null>(this.storage.load());

  /** Reactive view of the current session. */
  readonly session = this._session.asReadonly();
  readonly user = computed<AuthUserInfo | null>(() => this._session()?.user ?? null);
  readonly roles = computed<string[]>(() => this._session()?.user.roles ?? []);
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly displayName = computed(() => {
    const u = this._session()?.user;
    return u?.fullName?.trim() || u?.userName || '';
  });

  /** In-flight refresh shared between concurrent callers. */
  private refresh$: Observable<AuthResult> | null = null;

  login(credentials: LoginRequest, rememberMe = true): Observable<AuthResult> {
    return this.api.post<AuthResult>(API.auth.login, credentials).pipe(
      tap((result) => this.setSession(result, rememberMe)),
    );
  }

  /**
   * Exchanges the stored refresh token for a fresh access/refresh pair.
   * Returns a shared stream so simultaneous callers reuse one request.
   */
  refreshToken(): Observable<AuthResult> {
    if (this.refresh$) return this.refresh$;

    const refreshToken = this.storage.refreshToken;
    if (!refreshToken || this.storage.isRefreshTokenExpired()) {
      return throwError(() => new Error('No valid refresh token.'));
    }

    this.refresh$ = this.api.post<AuthResult>(API.auth.refresh, { refreshToken }).pipe(
      tap((result) => this.setSession(result)),
      shareReplay(1),
      finalize(() => (this.refresh$ = null)),
    );
    return this.refresh$;
  }

  /** Requests a password-reset link. Response is generic (no account enumeration). */
  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.api.post<void>(API.auth.forgotPassword, request);
  }

  /** Completes a password reset using the token from the emailed link. */
  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>(API.auth.resetPassword, request);
  }

  /**
   * Changes the signed-in user's password. The auto error-toast is suppressed so the
   * dialog can surface field errors (e.g. wrong current password) inline.
   */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.post<void>(API.auth.changePassword, request, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  /** Revokes the refresh token server-side (best-effort) and clears local state. */
  logout(redirect = true): void {
    const refreshToken = this.storage.refreshToken;
    if (refreshToken) {
      this.api.post(API.auth.logout, { refreshToken }).pipe(catchError(() => of(null))).subscribe();
    }
    this.clearSession();
    if (redirect) {
      void this.router.navigate(['/auth/login']);
    }
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles.length) return true;
    const mine = this.roles();
    return roles.some((r) => mine.includes(r));
  }

  private setSession(result: AuthResult, persistent?: boolean): void {
    const session: StoredSession = { ...result };
    this.storage.save(session, persistent);
    this._session.set(session);
  }

  private clearSession(): void {
    this.storage.clear();
    this._session.set(null);
  }
}
