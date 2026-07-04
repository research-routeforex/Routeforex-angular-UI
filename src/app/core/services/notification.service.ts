import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/** Centralized toast/snackbar notifications with consistent styling. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);

  private readonly base: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
  };

  success(message: string): void {
    this.show(message, 'rf-snack--success');
  }

  error(message: string): void {
    this.show(message, 'rf-snack--error', 6000);
  }

  info(message: string): void {
    this.show(message, 'rf-snack--info');
  }

  private show(message: string, panelClass: string, duration?: number): void {
    this.snack.open(message, 'Dismiss', {
      ...this.base,
      duration: duration ?? this.base.duration,
      panelClass: [panelClass],
    });
  }
}
