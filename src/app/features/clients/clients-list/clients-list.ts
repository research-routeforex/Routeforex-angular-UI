import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { emptyPage, PagedResult } from '../../../core/models/pagination.model';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClientListItem } from '../client.model';
import { ClientsService } from '../clients.service';

interface ColumnFilters {
  clientName: string;
  group: string;
  location: string;
  status: string;
  onBoardDate: string;
}

@Component({
  selector: 'app-clients-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, MatButtonModule, MatIconModule, MatTooltipModule, DatePipe],
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.scss',
})
export class ClientsListComponent implements OnInit {
  private readonly service = inject(ClientsService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly page = signal<PagedResult<ClientListItem>>(emptyPage<ClientListItem>());
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** Per-column filter terms — sent to the server (searches the whole dataset). */
  protected readonly filters = signal<ColumnFilters>({
    clientName: '',
    group: '',
    location: '',
    status: '',
    onBoardDate: '',
  });

  private reloadTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    const f = this.filters();
    this.service
      .getPaged(
        {
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize(),
          search: null,
          sortColumn: 'ClientName',
          sortDirection: 'Asc',
        },
        {
          clientName: f.clientName || undefined,
          group: f.group || undefined,
          location: f.location || undefined,
          status: f.status || undefined,
          onBoardDate: f.onBoardDate || undefined,
        },
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((res) => this.page.set(res));
  }

  /** Update a column filter and reload from the server (debounced, back to page 1). */
  protected setFilter(key: keyof ColumnFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.pageNumber.set(1);
      this.load();
    }, 350);
  }

  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
    this.load();
  }

  /** Index of the first/last row shown on the current page (1-based, for the label). */
  protected readonly fromRow = () =>
    this.page().totalCount === 0 ? 0 : (this.page().pageNumber - 1) * this.page().pageSize + 1;
  protected readonly toRow = () =>
    Math.min(this.page().pageNumber * this.page().pageSize, this.page().totalCount);

  protected first(): void {
    if (this.page().hasPrevious) {
      this.pageNumber.set(1);
      this.load();
    }
  }

  protected prev(): void {
    if (this.page().hasPrevious) {
      this.pageNumber.update((n) => n - 1);
      this.load();
    }
  }

  protected next(): void {
    if (this.page().hasNext) {
      this.pageNumber.update((n) => n + 1);
      this.load();
    }
  }

  protected last(): void {
    if (this.page().hasNext) {
      this.pageNumber.set(this.page().totalPages || 1);
      this.load();
    }
  }

  protected remove(client: ClientListItem): void {
    this.confirm
      .confirm({
        title: 'Delete client?',
        message: `Remove "${client.clientName}"? This can be restored by an administrator.`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(client.clientId).subscribe(() => {
          this.notify.success('Client deleted.');
          this.load();
        });
      });
  }
}
