import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AppRole } from '../../../core/enums/role.enum';
import { City } from '../../../core/models/city.model';
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
import { CitiesService } from '../cities.service';
import { CityFormComponent, CityFormData } from '../city-form/city-form';

@Component({
  selector: 'app-cities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, PageHeaderComponent, MatButtonModule, MatIconModule],
  templateUrl: './cities-list.html',
})
export class CitiesListComponent implements OnInit {
  private readonly service = inject(CitiesService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly rows = signal<City[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);

  protected readonly canManage = this.auth.hasRole(AppRole.Admin);

  private query: TableQuery = {
    pageNumber: 1,
    pageSize: environment.defaultPageSize,
    sortColumn: 'Name',
    sortDirection: 'Asc',
  };

  protected readonly columns: ColumnDef<City>[] = [
    { key: 'code', header: 'Code', sortable: true, width: '120px' },
    { key: 'name', header: 'City', sortable: true },
    { key: 'stateName', header: 'State', sortable: true },
    { key: 'countryName', header: 'Country', sortable: true },
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
    { key: 'createdDate', header: 'Created', type: 'date', sortable: true },
  ] as ColumnDef<City>[];

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
    const city = event.row as City;
    if (event.action === 'edit') this.openForm('edit', city);
    if (event.action === 'delete') this.remove(city);
  }

  openForm(mode: 'create' | 'edit', city?: City): void {
    this.dialog
      .open(CityFormComponent, {
        data: { mode, city } satisfies CityFormData,
        width: '560px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  private remove(city: City): void {
    this.confirm.confirmDelete('City').subscribe((ok) => {
      if (!ok) return;
      this.service.delete(city.id).subscribe(() => {
        this.notify.success('City deleted.');
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
