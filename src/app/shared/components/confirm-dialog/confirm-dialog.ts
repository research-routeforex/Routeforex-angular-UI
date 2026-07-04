import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Use warn styling for destructive actions. */
  destructive?: boolean;
  icon?: string;
}

/** Reusable yes/no confirmation modal. Returns `true` when confirmed. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm">
      <div class="confirm__head" [class.confirm__head--warn]="data.destructive">
        <mat-icon>{{ data.icon || (data.destructive ? 'warning' : 'help_outline') }}</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      <mat-dialog-content>
        <p class="confirm__msg">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="close(false)">{{ data.cancelText || 'Cancel' }}</button>
        <button
          mat-flat-button
          [color]="data.destructive ? 'warn' : 'primary'"
          (click)="close(true)"
        >
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm {
        min-width: 320px;
        max-width: 420px;
      }
      .confirm__head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 0;
        color: var(--mat-sys-primary);
      }
      .confirm__head--warn {
        color: var(--rf-danger);
      }
      .confirm__head h2 {
        margin: 0;
        padding: 0;
      }
      .confirm__msg {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  close(result: boolean): void {
    this.ref.close(result);
  }
}
