import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role } from '../../../core/models/role.model';
import { NotificationService } from '../../../core/services/notification.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import {
  ActionEvent,
  ColumnDef,
  RowAction,
  TableQuery,
} from '../../../shared/components/data-table/data-table.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { RolesService } from '../roles.service';
import { RoleFormComponent, RoleFormData } from '../role-form/role-form';

/**
 * Roles list. The /Roles endpoint returns the full set (cached), so this view
 * applies search, sort and paging client-side over `allRoles` — demonstrating
 * the DataTable in client-driven mode.
 */
@Component({
  selector: 'app-roles-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, PageHeaderComponent, MatButtonModule, MatIconModule],
  templateUrl: './roles-list.html',
})
export class RolesListComponent implements OnInit {
  private readonly service = inject(RolesService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  private readonly allRoles = signal<Role[]>([]);
  protected readonly loading = signal(false);
  private readonly query = signal<TableQuery>({
    pageNumber: 1,
    pageSize: environment.defaultPageSize,
  });

  /** Filtered + sorted view used for the total count. */
  private readonly filtered = computed<Role[]>(() => {
    const q = this.query();
    let data = [...this.allRoles()];

    if (q.search) {
      const term = q.search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          (r.description ?? '').toLowerCase().includes(term),
      );
    }
    if (q.sortColumn) {
      const col = q.sortColumn as keyof Role;
      const dir = q.sortDirection === 'Desc' ? -1 : 1;
      data.sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * dir);
    }
    return data;
  });

  protected readonly total = computed(() => this.filtered().length);

  /** Current page slice. */
  protected readonly rows = computed<Role[]>(() => {
    const q = this.query();
    const start = (q.pageNumber - 1) * q.pageSize;
    return this.filtered().slice(start, start + q.pageSize);
  });

  protected readonly columns: ColumnDef<Role>[] = [
    { key: 'name', header: 'Role', sortable: true },
    { key: 'description', header: 'Description' },
    {
      key: 'isActive',
      header: 'Status',
      type: 'badge',
      align: 'center',
      badge: (row) =>
        row.isActive
          ? { label: 'Active', variant: 'success' }
          : { label: 'Inactive', variant: 'danger' },
    },
  ] as ColumnDef<Role>[];

  protected readonly actions: RowAction[] = [
    { id: 'edit', icon: 'edit', tooltip: 'Edit', color: 'primary' },
    { id: 'delete', icon: 'delete', tooltip: 'Delete', color: 'warn' },
  ];

  ngOnInit(): void {
    this.load();
  }

  onQueryChange(query: TableQuery): void {
    this.query.set(query);
  }

  onAction(event: ActionEvent): void {
    const role = event.row as Role;
    if (event.action === 'edit') this.openForm('edit', role);
    if (event.action === 'delete') this.remove(role);
  }

  openForm(mode: 'create' | 'edit', role?: Role): void {
    this.dialog
      .open(RoleFormComponent, {
        data: { mode, role } satisfies RoleFormData,
        width: '520px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  private remove(role: Role): void {
    this.confirm.confirmDelete('Role').subscribe((ok) => {
      if (!ok) return;
      this.service.delete(role.id).subscribe(() => {
        this.notify.success('Role deleted.');
        this.load();
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((roles) => this.allRoles.set(roles));
  }
}
