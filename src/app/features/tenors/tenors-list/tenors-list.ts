import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AppRole } from '../../../core/enums/role.enum';
import { Tenor } from '../../../core/models/tenor.model';
import { AuthService } from '../../../core/services/auth.service';
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
import { TenorsService } from '../tenors.service';
import { TenorFormComponent, TenorFormData } from '../tenor-form/tenor-form';

@Component({
  selector: 'app-tenors-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, PageHeaderComponent, MatButtonModule, MatIconModule],
  templateUrl: './tenors-list.html',
})
export class TenorsListComponent implements OnInit {
  private readonly service = inject(TenorsService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly rows = signal<Tenor[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly canManage = this.auth.hasRole(AppRole.Admin);

  private query: TableQuery = {
    pageNumber: 1,
    pageSize: environment.defaultPageSize,
    sortColumn: 'SortOrder',
    sortDirection: 'Asc',
  };

  protected readonly columns: ColumnDef<Tenor>[] = [
    { key: 'code', header: 'Code', sortable: true, width: '120px' },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'daysToMaturity', header: 'Days to Maturity', type: 'number', align: 'right', sortable: true },
    { key: 'sortOrder', header: 'Sort Order', type: 'number', align: 'right', sortable: true },
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
  ] as ColumnDef<Tenor>[];

  protected readonly actions = computed<RowAction[]>(() =>
    this.canManage
      ? [
          { id: 'edit', icon: 'edit', tooltip: 'Edit', color: 'primary' },
          { id: 'delete', icon: 'delete', tooltip: 'Delete', color: 'warn' },
        ]
      : [],
  );

  ngOnInit(): void {
    this.load();
  }

  onQueryChange(query: TableQuery): void {
    this.query = query;
    this.load();
  }

  onAction(event: ActionEvent): void {
    const tenor = event.row as Tenor;
    if (event.action === 'edit') this.openForm('edit', tenor);
    if (event.action === 'delete') this.remove(tenor);
  }

  openForm(mode: 'create' | 'edit', tenor?: Tenor): void {
    this.dialog
      .open(TenorFormComponent, {
        data: { mode, tenor } satisfies TenorFormData,
        width: '560px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  private remove(tenor: Tenor): void {
    this.confirm.confirmDelete('Tenor').subscribe((ok) => {
      if (!ok) return;
      this.service.delete(tenor.id).subscribe(() => {
        this.notify.success('Tenor deleted.');
        this.load();
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getPaged({
        pageNumber: this.query.pageNumber,
        pageSize: this.query.pageSize,
        search: this.query.search,
        sortColumn: this.query.sortColumn,
        sortDirection: this.query.sortDirection,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((page) => {
        this.rows.set(page.items);
        this.total.set(page.totalCount);
      });
  }
}
