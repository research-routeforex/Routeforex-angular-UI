import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';
import { PageHeaderComponent } from '../page-header/page-header';

interface PlaceholderData {
  title: string;
  description: string;
  icon: string;
  section: string;
}

/**
 * Generic "module coming soon" page for features whose backend endpoints are not
 * yet implemented. Content is driven by the route's `data` so a single component
 * serves every placeholder route.
 */
@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <app-page-header
      [title]="info().title"
      [subtitle]="info().description"
      [breadcrumbs]="[{ label: info().section || 'Modules' }, { label: info().title }]"
    />
    <div class="rf-card ph">
      <mat-icon class="ph__icon">{{ info().icon }}</mat-icon>
      <h2>{{ info().title }} module</h2>
      <p class="rf-muted">
        This module is scaffolded and ready. Its REST endpoints are not yet available on the
        RouteForex API — once the backend controller ships, wire a CRUD service (extending
        <code>CrudService</code>) and reuse the shared DataTable, exactly like the Cities and
        Tenors masters.
      </p>
      <a mat-flat-button color="primary" routerLink="/dashboard">
        <mat-icon>arrow_back</mat-icon>
        Back to Dashboard
      </a>
    </div>
  `,
  styles: [
    `
      .ph {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
        padding: 56px 24px;
        max-width: 640px;
        margin: 24px auto;
      }
      .ph__icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--mat-sys-primary);
      }
      .ph h2 {
        margin: 0;
      }
      .ph p {
        max-width: 520px;
        line-height: 1.6;
      }
      code {
        background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
        padding: 1px 6px;
        border-radius: 6px;
      }
    `,
  ],
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly info = toSignal(
    this.route.data.pipe(
      map(
        (d): PlaceholderData => ({
          title: (d['title'] as string) ?? 'Module',
          description: (d['description'] as string) ?? 'Coming soon.',
          icon: (d['icon'] as string) ?? 'construction',
          section: (d['section'] as string) ?? 'Modules',
        }),
      ),
    ),
    {
      initialValue: {
        title: 'Module',
        description: 'Coming soon.',
        icon: 'construction',
        section: 'Modules',
      } satisfies PlaceholderData,
    },
  );
}
