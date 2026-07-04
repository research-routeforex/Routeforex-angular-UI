import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TrendDirection = 'up' | 'down' | 'flat';

/** KPI card: icon, label, value and an optional trend delta. */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="stat rf-card">
      <div class="stat__icon" [style.background]="tintBg()" [style.color]="tint()">
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <div class="stat__body">
        <span class="stat__label rf-muted">{{ label() }}</span>
        <span class="stat__value">{{ value() }}</span>
        @if (trend() !== 'flat' && delta()) {
          <span class="stat__trend" [class.stat__trend--up]="trend() === 'up'" [class.stat__trend--down]="trend() === 'down'">
            <mat-icon>{{ trend() === 'up' ? 'trending_up' : 'trending_down' }}</mat-icon>
            {{ delta() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .stat {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
      }
      .stat__icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: 14px;
        flex: none;
      }
      .stat__icon mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .stat__body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .stat__label {
        font-size: 13px;
      }
      .stat__value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.1;
      }
      .stat__trend {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 12px;
        font-weight: 500;
        margin-top: 2px;
      }
      .stat__trend mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .stat__trend--up {
        color: var(--rf-success);
      }
      .stat__trend--down {
        color: var(--rf-danger);
      }
    `,
  ],
})
export class StatCardComponent {
  readonly icon = input('insights');
  readonly label = input('');
  readonly value = input<string | number>('');
  readonly delta = input('');
  readonly trend = input<TrendDirection>('flat');
  /** A CSS colour used to tint the icon chip (e.g. var(--rf-info)). */
  readonly color = input('var(--mat-sys-primary)');

  protected readonly tint = computed(() => this.color());
  protected readonly tintBg = computed(
    () => `color-mix(in srgb, ${this.color()} 14%, transparent)`,
  );
}
