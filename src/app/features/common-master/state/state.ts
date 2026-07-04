import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { State } from '../common-master.model';
import { CommonMasterService } from '../common-master.service';

interface ColumnFilters {
  countryCode: string;
  stateCode: string;
  stateName: string;
  activeStatus: string;
}

@Component({
  selector: 'app-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './state.html',
  styleUrl: './state.scss',
})
export class StateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<State[]>([]);
  protected readonly countryOptions = signal<SelectOption[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    stateId: [0],
    countryCode: this.fb.control<string | null>(null, [Validators.required]),
    stateCode: ['', [Validators.required, Validators.maxLength(20)]],
    stateName: ['', [Validators.required, Validators.maxLength(200)]],
    activeStatus: ['Active'],
  });

  protected readonly filters = signal<ColumnFilters>({
    countryCode: '',
    stateCode: '',
    stateName: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<State[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(this.countryLabel(r.countryCode), f.countryCode) &&
        has(r.stateCode, f.stateCode) &&
        has(r.stateName, f.stateName) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<State[]>(() => {
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
    this.service.getCountries().subscribe((countries) =>
      this.countryOptions.set(
        countries.map((c) => ({ value: c.countryCode, label: c.countryDescription || c.countryCode })),
      ),
    );
    this.load();
  }

  protected countryLabel(code: string | null): string {
    if (!code) return '';
    return this.countryOptions().find((o) => o.value === code)?.label ?? code;
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getStates()
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

  protected startAdd(): void {
    this.form.reset({
      stateId: 0,
      countryCode: null,
      stateCode: '',
      stateName: '',
      activeStatus: 'Active',
    });
    this.editingId.set(0);
  }

  protected startEdit(row: State): void {
    this.form.reset({
      stateId: row.stateId,
      countryCode: row.countryCode,
      stateCode: row.stateCode,
      stateName: row.stateName,
      activeStatus: row.activeStatus || 'Active',
    });
    this.editingId.set(row.stateId);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .saveState({
        stateId: v.stateId,
        countryCode: v.countryCode ?? '',
        stateCode: v.stateCode,
        stateName: v.stateName,
        statezone: null,
        activeStatus: v.activeStatus,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('State saved.');
        this.editingId.set(null);
        this.load();
      });
  }

  protected remove(row: State): void {
    this.confirm
      .confirm({
        title: 'Delete state?',
        message: `Remove "${row.stateName}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteState(row.stateId).subscribe(() => {
          this.notify.success('State deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
