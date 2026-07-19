import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { CompBank } from '../comp-bank.model';
import { CompBankService } from '../comp-bank.service';

interface ColumnFilters {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  cityName: string;
  activeStatus: string;
}

@Component({
  selector: 'app-comp-bank-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, DatePipe],
  templateUrl: './comp-bank-list.html',
  styleUrl: './comp-bank-list.scss',
})
export class CompBankListComponent implements OnInit {
  private readonly service = inject(CompBankService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  private readonly allRows = signal<CompBank[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filters = signal<ColumnFilters>({
    bankName: '',
    accountNo: '',
    ifscCode: '',
    cityName: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<CompBank[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.bankName, f.bankName) &&
        has(r.accountNo, f.accountNo) &&
        has(r.ifscCode, f.ifscCode) &&
        has(r.cityName, f.cityName) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<CompBank[]>(() => {
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
      .getCompBanks()
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

  protected remove(row: CompBank): void {
    this.confirm
      .confirm({
        title: 'Delete company bank?',
        message: `Remove account "${row.accountNo || row.bankName || ''}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteCompBank(row.compBankId).subscribe(() => {
          this.notify.success('Company bank deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
