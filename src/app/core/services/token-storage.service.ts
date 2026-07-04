import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '../constants/app.constants';
import { StoredSession } from '../models/auth.model';

/**
 * Persists the authenticated session.
 *
 * "Remember me" controls the storage scope: when enabled the session lives in
 * `localStorage` and survives a browser restart; when disabled it lives in
 * `sessionStorage` and is cleared when the tab/browser closes. `load` reads from
 * whichever store holds the session, and refresh-token rotation keeps the session
 * in the store it already occupies.
 *
 * Security note: tokens are kept in web storage for SPA convenience. The hardened
 * production option is HttpOnly cookies set by the API; this service is the single
 * seam to swap that in without touching the rest of the app.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private memory: StoredSession | null = null;

  load(): StoredSession | null {
    if (this.memory) return this.memory;
    try {
      const raw =
        localStorage.getItem(STORAGE_KEYS.session) ??
        sessionStorage.getItem(STORAGE_KEYS.session);
      this.memory = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      this.memory = null;
    }
    return this.memory;
  }

  /**
   * Persists the session. `persistent` selects the storage scope; when omitted
   * (e.g. token-refresh rotation) the session is kept in whichever store it
   * currently occupies, defaulting to `localStorage`.
   */
  save(session: StoredSession, persistent?: boolean): void {
    const usePersistent =
      persistent ?? sessionStorage.getItem(STORAGE_KEYS.session) === null;
    const target = usePersistent ? localStorage : sessionStorage;
    const other = usePersistent ? sessionStorage : localStorage;
    this.memory = session;
    target.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    other.removeItem(STORAGE_KEYS.session);
  }

  clear(): void {
    this.memory = null;
    localStorage.removeItem(STORAGE_KEYS.session);
    sessionStorage.removeItem(STORAGE_KEYS.session);
  }

  get accessToken(): string | null {
    return this.load()?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.load()?.refreshToken ?? null;
  }

  /** True when the access token is past (or within `skewSeconds` of) expiry. */
  isAccessTokenExpired(skewSeconds = 0): boolean {
    const session = this.load();
    if (!session) return true;
    const expiresAt = new Date(session.accessTokenExpiresAtUtc).getTime();
    return Date.now() >= expiresAt - skewSeconds * 1000;
  }

  isRefreshTokenExpired(): boolean {
    const session = this.load();
    if (!session) return true;
    return Date.now() >= new Date(session.refreshTokenExpiresAtUtc).getTime();
  }
}
