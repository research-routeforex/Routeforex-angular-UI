import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Company } from './company-master.model';
import { CompanyMasterService } from './company-master.service';

interface ColumnFilters {
  companyName: string;
  cityName: string;
  stateName: string;
  countryName: string;
  gstn: string;
  activeStatus: string;
}

@Component({
  selector: 'app-company-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './company-master.html',
  styleUrl: './company-master.scss',
})
export class CompanyMasterComponent implements OnInit {
  private readonly service = inject(CompanyMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  private readonly allRows = signal<Company[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filters = signal<ColumnFilters>({
    companyName: '',
    cityName: '',
    stateName: '',
    countryName: '',
    gstn: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<Company[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.companyName, f.companyName) &&
        has(r.cityName, f.cityName) &&
        has(r.stateName, f.stateName) &&
        has(r.countryName, f.countryName) &&
        has(r.gstn, f.gstn) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<Company[]>(() => {
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
    this.service
      .getCompanies()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
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

  protected remove(row: Company): void {
    this.confirm
      .confirm({
        title: 'Delete company?',
        message: `Remove "${row.companyName}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteCompany(row.companyId).subscribe(() => {
          this.notify.success('Company deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
