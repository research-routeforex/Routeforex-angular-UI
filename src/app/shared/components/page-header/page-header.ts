import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface Crumb {
  label: string;
  link?: string;
}

/** Page title + breadcrumb + projected action slot, used at the top of features. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="ph">
      <div class="ph__text">
        @if (breadcrumbs().length) {
          <nav class="ph__crumbs rf-muted">
            @for (crumb of breadcrumbs(); track $index; let last = $last) {
              @if (crumb.link && !last) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
              } @else {
                <span [class.ph__crumb--active]="last">{{ crumb.label }}</span>
              }
              @if (!last) {
                <mat-icon class="ph__sep">chevron_right</mat-icon>
              }
            }
          </nav>
        }
        @if (subtitle()) {
          <p class="ph__subtitle rf-muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="ph__actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .ph {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        min-height: 48px;
        margin-bottom: var(--rf-gap);
      }
      .ph__crumbs {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 13px;
        margin-bottom: 4px;
      }
      .ph__crumbs a {
        color: inherit;
        text-decoration: none;
      }
      .ph__crumbs a:hover {
        color: var(--mat-sys-primary);
      }
      .ph__crumb--active {
        color: var(--mat-sys-on-surface);
        font-weight: 500;
      }
      .ph__sep {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .ph__title {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .ph__subtitle {
        margin: 4px 0 0;
        font-size: 14px;
      }
      .ph__actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    `,
  ],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly breadcrumbs = input<Crumb[]>([]);
}
