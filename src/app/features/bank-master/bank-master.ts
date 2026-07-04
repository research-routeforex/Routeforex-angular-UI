import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Bank } from './bank-master.model';
import { BankMasterService } from './bank-master.service';
import { HeadOfficeListComponent } from './head-office-list/head-office-list';

type BankTab = 'bank' | 'head-office';

interface TabDef {
  key: BankTab;
  label: string;
  icon: string;
}

interface ColumnFilters {
  bankName: string;
  bankCategory: string;
  regionName: string;
  countryName: string;
  cityName: string;
  activeStatus: string;
}

@Component({
  selector: 'app-bank-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    HeadOfficeListComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './bank-master.html',
  styleUrl: './bank-master.scss',
})
export class BankMasterComponent implements OnInit {
  private readonly service = inject(BankMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs: TabDef[] = [
    { key: 'bank', label: 'Bank Master', icon: 'account_balance' },
    { key: 'head-office', label: 'Head Office', icon: 'apartment' },
  ];
  protected readonly active = signal<BankTab>('bank');
  protected select(key: BankTab): void {
    this.active.set(key);
  }

  protected readonly loading = signal(false);
  private readonly allRows = signal<Bank[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filters = signal<ColumnFilters>({
    bankName: '',
    bankCategory: '',
    regionName: '',
    countryName: '',
    cityName: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<Bank[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.bankName, f.bankName) &&
        has(r.bankCategory, f.bankCategory) &&
        has(r.regionName, f.regionName) &&
        has(r.countryName, f.countryName) &&
        has(r.cityName, f.cityName) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<Bank[]>(() => {
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
    // Return to the right tab after a routed form save (?tab=head-office).
    if (this.route.snapshot.queryParamMap.get('tab') === 'head-office') {
      this.active.set('head-office');
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getBanks()
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

  protected remove(row: Bank): void {
    this.confirm
      .confirm({
        title: 'Delete bank?',
        message: `Remove "${row.bankName}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteBank(row.bankID).subscribe(() => {
          this.notify.success('Bank deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
