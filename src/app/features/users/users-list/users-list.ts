import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { UsersService } from '../users.service';
import { UserFormComponent, UserFormData } from '../user-form/user-form';

interface ColumnFilters {
  userName: string;
  fullName: string;
  email: string;
  roles: string;
  status: string;
  lastLogin: string;
}

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatButtonModule, MatIconModule, MatTooltipModule, DatePipe],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersListComponent implements OnInit {
  private readonly service = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly pageSize = signal(20);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** Full user set (admin users are few); filtered + paged on the client. */
  private readonly allRows = signal<User[]>([]);

  /** Per-column filter terms — match across the whole dataset. */
  protected readonly filters = signal<ColumnFilters>({
    userName: '',
    fullName: '',
    email: '',
    roles: '',
    status: '',
    lastLogin: '',
  });

  /** Rows matching every active column filter. */
  protected readonly filtered = computed<User[]>(() => {
    const f = this.filters();
    return this.allRows().filter((u) => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleString() : '';
      return (
        has(u.userName, f.userName) &&
        has(u.fullName, f.fullName) &&
        has(u.email, f.email) &&
        has(u.roles.join(', '), f.roles) &&
        has(this.statusLabel(u), f.status) &&
        has(lastLogin, f.lastLogin)
      );
    });
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  /** The current page slice. */
  protected readonly pagedRows = computed<User[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // Pull the full set (page 1, large size) and page on the client.
    this.service
      .getPaged({ pageNumber: 1, pageSize: 1000, search: null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((page) => {
        this.allRows.set(page.items);
        this.clampPage();
      });
  }

  protected setFilter(key: keyof ColumnFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pageNumber.set(1);
  }

  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }

  protected first(): void {
    this.pageNumber.set(1);
  }
  protected prev(): void {
    this.pageNumber.update((n) => Math.max(1, n - 1));
  }
  protected next(): void {
    this.pageNumber.update((n) => Math.min(this.totalPages(), n + 1));
  }
  protected last(): void {
    this.pageNumber.set(this.totalPages());
  }

  /** Keep the current page in range after a reload/filter shrinks the set. */
  private clampPage(): void {
    if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
  }

  protected statusLabel(u: User): string {
    return u.isLockedOut ? 'Locked' : u.isActive ? 'Active' : 'Inactive';
  }

  protected statusClass(u: User): string {
    return u.isLockedOut
      ? 'rf-chip--danger'
      : u.isActive
        ? 'rf-chip--success'
        : 'rf-chip--warn';
  }

  protected openForm(mode: 'create' | 'edit', user?: User): void {
    this.dialog
      .open(UserFormComponent, {
        data: { mode, user } satisfies UserFormData,
        width: '820px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  protected remove(user: User): void {
    this.confirm
      .confirm({
        title: 'Delete user?',
        message: `Remove "${user.userName}"? This can be restored by an administrator.`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(user.id).subscribe(() => {
          this.notify.success('User deleted.');
          this.load();
        });
      });
  }
}

/** Case-insensitive "contains" for a column filter (empty term matches all). */
function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
