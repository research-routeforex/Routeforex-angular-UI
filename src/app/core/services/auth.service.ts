import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
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
  private readonly http = inject(HttpClient);

  private readonly _session = signal<StoredSession | null>(this.storage.load());

  /** Object URL of the current user's profile photo (null = none → initials avatar). */
  private readonly _profileImageUrl = signal<string | null>(null);
  readonly profileImageUrl = this._profileImageUrl.asReadonly();

  constructor() {
    // Restore the avatar image for an already-signed-in session (page refresh).
    // Deferred to a microtask so this service finishes constructing first: firing
    // the HTTP GET synchronously here would re-enter the interceptor chain, whose
    // authInterceptor calls inject(AuthService) while AuthService is still being
    // built — a circular-DI throw that leaves the global loading bar stuck on and
    // the request never completing (so the avatar never loads on refresh).
    if (this.user()?.profileImagePath) {
      queueMicrotask(() => this.loadProfileImage());
    }
  }

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

  /**
   * Re-reads the authoritative `mustChangePassword` from the server so a stale
   * cached flag can't trap the user on the first-login screen forever. Uses the
   * refresh endpoint, which returns the fresh flag from the DB and (via
   * `setSession`) updates the stored session — so once the server says the
   * password has been changed, the cached flag self-heals. Falls back to the
   * cached value if the server can't be reached, so behaviour is never worse
   * than today.
   */
  reconcileMustChangePassword(): Observable<boolean> {
    return this.refreshToken().pipe(
      map((result) => result.user.mustChangePassword),
      catchError(() => of(this.user()?.mustChangePassword ?? false)),
    );
  }

  /**
   * Clears the first-login "must change password" flag on the stored session,
   * called after the forced change succeeds so the guard/redirect stops firing.
   */
  clearMustChangePassword(): void {
    const current = this._session();
    if (!current || !current.user.mustChangePassword) return;
    const updated: StoredSession = {
      ...current,
      user: { ...current.user, mustChangePassword: false },
    };
    this.storage.save(updated);
    this._session.set(updated);
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
    this.loadProfileImage();
  }

  private clearSession(): void {
    this.storage.clear();
    this._session.set(null);
    this.setProfileImageUrl(null);
  }

  // ---- Profile photo -------------------------------------------------------

  /**
   * Fetches the current user's profile photo (authenticated blob) into an object
   * URL exposed via `profileImageUrl`. No-ops to a null avatar when none is set.
   */
  loadProfileImage(): void {
    if (!this.user()?.profileImagePath) {
      this.setProfileImageUrl(null);
      return;
    }
    const url = `${environment.apiBaseUrl}${environment.apiPrefix}/${API.auth.profileImage}`;
    // SKIP_ERROR_TOAST: a missing/empty avatar must never surface a global error toast.
    this.http
      .get(url, {
        responseType: 'blob',
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({
        // 204 No Content (no photo) yields an empty/absent blob — treat as no avatar.
        next: (blob) =>
          this.setProfileImageUrl(blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
        error: () => this.setProfileImageUrl(null),
      });
  }

  /**
   * Uploads a new profile photo (base64/data-URL), then updates the stored session
   * and reloads the avatar. Returns the saved relative path.
   */
  uploadProfileImage(imageBase64: string, fileName: string): Observable<string> {
    return this.api.post<string>(API.auth.profileImage, { imageBase64, fileName }).pipe(
      tap((path) => {
        this.setProfileImagePath(path);
        this.loadProfileImage();
      }),
    );
  }

  /** Updates the stored session user's profileImagePath (persisted). */
  private setProfileImagePath(path: string | null): void {
    const current = this._session();
    if (!current) return;
    const updated: StoredSession = {
      ...current,
      user: { ...current.user, profileImagePath: path },
    };
    this.storage.save(updated);
    this._session.set(updated);
  }

  /** Swaps the avatar object URL, revoking the previous one to avoid leaks. */
  private setProfileImageUrl(url: string | null): void {
    const prev = this._profileImageUrl();
    if (prev) URL.revokeObjectURL(prev);
    this._profileImageUrl.set(url);
  }
}
