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
  /** Use warn (red) styling for destructive actions. */
  destructive?: boolean;
  /** Use warning (amber) styling for cautionary / alert messages. */
  warning?: boolean;
  /** Hide the Cancel button — single-action acknowledgement (alert) mode. */
  hideCancel?: boolean;
  icon?: string;
}

/** Reusable yes/no confirmation modal. Returns `true` when confirmed. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm">
      <div
        class="confirm__head"
        [class.confirm__head--warn]="data.destructive"
        [class.confirm__head--warning]="data.warning"
      >
        <mat-icon>{{
          data.icon || (data.destructive || data.warning ? 'warning' : 'help_outline')
        }}</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      <mat-dialog-content>
        <p class="confirm__msg">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (!data.hideCancel) {
          <button mat-button (click)="close(false)">{{ data.cancelText || 'Cancel' }}</button>
        }
        <button
          mat-flat-button
          [color]="data.destructive ? 'warn' : data.warning ? undefined : 'primary'"
          [class.confirm__ok--warning]="data.warning"
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
        padding: 19px 0px 0px 23px;
        color: var(--mat-sys-primary);
      }
      .confirm__head mat-icon {
        flex: none;
        width: 26px;
        height: 26px;
        font-size: 26px;
        line-height: 26px;
      }
      .confirm__head--warn {
        color: var(--rf-danger);
      }
      .confirm__head--warning {
        color: #e0a200; // amber warning
      }
      .confirm__head h2 {
        margin: 0;
        padding: 0;
        font-size: 20px;
        line-height: 26px;
      }
      // Material adds a 40px-tall ::before spacer to the dialog title, which
      // throws off vertical centring of the leading icon — remove it.
      .confirm__head h2::before {
        display: none;
      }
      // Amber (warning) confirm button — filled yellow with dark text.
      .confirm__ok--warning {
        --mdc-filled-button-container-color: #f5c518;
        background-color: #e0a200;
        --mdc-filled-button-label-text-color: #1b1b1b;
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
