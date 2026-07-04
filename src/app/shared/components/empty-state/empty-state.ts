import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Friendly placeholder for empty lists / no-data states. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty">
      <mat-icon class="empty__icon">{{ icon() }}</mat-icon>
      <p class="empty__title">{{ message() }}</p>
      @if (hint()) {
        <p class="empty__hint rf-muted">{{ hint() }}</p>
      }
      @if (actionLabel()) {
        <button mat-flat-button color="primary" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 48px 16px;
        text-align: center;
      }
      .empty__icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: var(--mat-sys-on-surface-variant);
        opacity: 0.6;
      }
      .empty__title {
        margin: 0;
        font-size: 15px;
        font-weight: 500;
      }
      .empty__hint {
        margin: 0;
        font-size: 13px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly message = input('Nothing here yet.');
  readonly hint = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}
