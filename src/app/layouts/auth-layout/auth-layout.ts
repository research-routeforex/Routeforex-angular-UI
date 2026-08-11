import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';

/** Split-screen shell for unauthenticated pages (login, etc.). */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatIconModule, MatButtonModule],
  template: `
    <div class="auth">
      <aside class="auth__brand">
        <!-- Rotating hero images (cross-fade). Drop files in public/login-slides/. -->
        <div class="auth__slides" aria-hidden="true">
          @for (src of slides; track src; let i = $index) {
            <div
              class="auth__slide"
              [class.is-active]="i === current()"
              [style.background-image]="'url(' + src + ')'"
            ></div>
          }
        </div>
        <div class="auth__scrim" aria-hidden="true"></div>

        <div class="auth__brand-inner">
          <div class="auth__logo"><mat-icon>currency_exchange</mat-icon></div>
          <h1>RouteForex</h1>
          <p>Enterprise Forex Transaction Management</p>
          <ul class="auth__points">
            <li><mat-icon>verified_user</mat-icon> Secure JWT authentication</li>
            <li><mat-icon>insights</mat-icon> Real-time dealing &amp; analytics</li>
            <li><mat-icon>account_balance</mat-icon> End-to-end trade lifecycle</li>
          </ul>
        </div>
      </aside>
      <section class="auth__panel">
        <button
          mat-icon-button
          class="auth__theme"
          (click)="theme.toggle()"
          aria-label="Toggle theme"
        >
          <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
        <div class="auth__content">
          <router-outlet></router-outlet>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        min-height: 100vh;
      }
      .auth__brand {
        position: relative;
        overflow: hidden;
        display: grid;
        place-items: center;
        padding: 40px;
        color: #fff;
        /* Base purple — shown behind the slides, and as a fallback when no
           images are present. */
        background:
          radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.14), transparent 42%),
          linear-gradient(
            135deg,
            oklch(42% 0.22 285),
            oklch(55% 0.25 285) 55%,
            oklch(63% 0.24 285)
          );
      }
      /* Cross-fading image stack. */
      .auth__slides {
        position: absolute;
        inset: 0;
        z-index: 0;
      }
      .auth__slide {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: opacity 1.2s ease-in-out;
      }
      .auth__slide.is-active {
        opacity: 1;
      }
      /* Scrim keeps the brand text readable over any image. */
      .auth__scrim {
        position: absolute;
        inset: 0;
        z-index: 1;
        // background: linear-gradient(
        //   135deg,
        //   rgba(38, 22, 92, 0.78),
        //   rgba(64, 42, 132, 0.5) 55%,
        //   rgba(96, 64, 176, 0.42)
        // );
      }
      .auth__brand-inner {
        position: relative;
        z-index: 2;
        max-width: 420px;
      }
      .auth__logo {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.16);
        margin-bottom: 20px;
      }
      .auth__logo mat-icon {
        font-size: 34px;
        width: 34px;
        height: 34px;
      }
      .auth__brand h1 {
        font-size: 34px;
        margin: 0 0 8px;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
      }
      .auth__brand p {
        font-size: 16px;
        opacity: 0.92;
        margin: 0 0 28px;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
      }
      .auth__points {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .auth__points li {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        opacity: 0.95;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
      }
      .auth__panel {
        position: relative;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--rf-page-bg);
      }
      .auth__theme {
        position: absolute;
        top: 16px;
        right: 16px;
      }
      .auth__content {
        width: 100%;
        max-width: 400px;
      }
      @media (prefers-reduced-motion: reduce) {
        .auth__slide {
          transition: none;
        }
      }
      @media (max-width: 899px) {
        .auth {
          grid-template-columns: 1fr;
        }
        .auth__brand {
          display: none;
        }
      }
    `,
  ],
})
export class AuthLayoutComponent {
  protected readonly theme = inject(ThemeService);

  /**
   * Rotating hero images for the login brand panel. Put the image files in
   * `FrontEnd/public/login-slides/` (served at `/login-slides/…`) and edit this
   * list to match their names. Missing files simply fade to the purple base.
   */
  protected readonly slides = [
    '/login-slides/slide-1.jpg',
    '/login-slides/slide-2.jpg',
    '/login-slides/slide-3.jpg',
    '/login-slides/s4.jpg',
  ];

  /** Index of the currently visible slide. */
  protected readonly current = signal(0);

  constructor() {
    // Advance one slide at a time; stops automatically when the view is destroyed.
    if (this.slides.length > 1) {
      interval(2000)
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.current.update((i) => (i + 1) % this.slides.length));
    }
  }
}
