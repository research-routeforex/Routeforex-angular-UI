import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../core/services/theme.service';

/** Split-screen shell for unauthenticated pages (login, etc.). */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatIconModule, MatButtonModule],
  template: `
    <div class="auth">
      <aside class="auth__brand">
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
        display: grid;
        place-items: center;
        padding: 40px;
        color: #fff;
        background:
          radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.14), transparent 42%),
          linear-gradient(
            135deg,
            oklch(42% 0.22 285),
            oklch(55% 0.25 285) 55%,
            oklch(63% 0.24 285)
          );
      }
      .auth__brand-inner {
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
      }
      .auth__brand p {
        font-size: 16px;
        opacity: 0.9;
        margin: 0 0 28px;
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
}
