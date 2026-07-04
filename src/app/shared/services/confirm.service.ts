import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog';

/** Opens the reusable confirmation dialog and resolves to the user's choice. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, { data, autoFocus: false, restoreFocus: true })
      .afterClosed() as Observable<boolean>;
  }

  /** Shortcut for a destructive delete confirmation. */
  confirmDelete(entity: string): Observable<boolean> {
    return this.confirm({
      title: `Delete ${entity}?`,
      message: `This will remove the ${entity.toLowerCase()}. This action cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
      icon: 'delete_outline',
    });
  }
}
