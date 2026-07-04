import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/app.constants';

export type ThemeMode = 'light' | 'dark';

/**
 * Runtime light/dark theme switching with persistence. Toggles the
 * `theme-dark` class on <html>, which flips the M3 `color-scheme` (see
 * styles.scss). Falls back to the OS preference on first load.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _mode = signal<ThemeMode>(this.initialMode());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    // Keep the DOM + storage in sync whenever the mode signal changes.
    effect(() => {
      const mode = this._mode();
      const root = this.document.documentElement;
      root.classList.toggle('theme-dark', mode === 'dark');
      localStorage.setItem(STORAGE_KEYS.theme, mode);
    });
  }

  toggle(): void {
    this._mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  private initialMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEYS.theme) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
