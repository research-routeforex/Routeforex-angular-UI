import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';

/** Full-screen status page (403 / 404) driven by route `data`. */
@Component({
  selector: 'app-status-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="status">
      <div class="status__code">{{ info().code }}</div>
      <mat-icon class="status__icon">{{ info().icon }}</mat-icon>
      <h1>{{ info().title }}</h1>
      <p class="rf-muted">{{ info().message }}</p>
      <a mat-flat-button color="primary" routerLink="/dashboard">Go to Dashboard</a>
    </div>
  `,
  styles: [
    `
      .status {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 24px;
        text-align: center;
        background: var(--rf-page-bg);
      }
      .status__code {
        font-size: 88px;
        font-weight: 800;
        line-height: 1;
        color: var(--mat-sys-primary);
        opacity: 0.85;
      }
      .status__icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--mat-sys-on-surface-variant);
      }
      h1 {
        margin: 6px 0 0;
      }
      p {
        max-width: 420px;
        margin: 0 0 12px;
      }
    `,
  ],
})
export class StatusPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly info = toSignal(
    this.route.data.pipe(
      map((d) => ({
        code: (d['code'] as string) ?? '404',
        title: (d['title'] as string) ?? 'Page not found',
        message: (d['message'] as string) ?? 'The page you are looking for does not exist.',
        icon: (d['icon'] as string) ?? 'search_off',
      })),
    ),
    {
      initialValue: {
        code: '404',
        title: 'Page not found',
        message: 'The page you are looking for does not exist.',
        icon: 'search_off',
      },
    },
  );
}
