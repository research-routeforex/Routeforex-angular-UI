import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../shared/directives/open-datepicker-on-focus.directive';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { ResearchPermissionRow } from './research-report-permission.model';
import { ResearchReportPermissionService } from './research-report-permission.service';

/**
 * Research Report Permission (Administration) — grant a client the right to view
 * a paid research type (only Premium for now) for a validity window. The public
 * /publications/research page enforces this for non-admin users.
 */
@Component({
  selector: 'app-research-report-permission',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './research-report-permission.html',
  styleUrl: './research-report-permission.scss',
})
export class ResearchReportPermissionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ResearchReportPermissionService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<ResearchPermissionRow[]>([]);

  /** Client options ({ value: id, label: name }) from the common dropdown proc. */
  protected readonly clientOptions = signal<SelectOption[]>([]);

  /** Research Type — only Premium for now. */
  protected readonly researchTypeOptions: SelectOption[] = [
    { value: 'P', label: 'Premium Research' },
  ];

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** Applied server-side filters (set from the search section on Search). */
  private readonly searchClient = signal('');
  private readonly searchFrom = signal('');
  private readonly searchTo = signal('');

  /** Separate search section form. */
  protected readonly filterForm = this.fb.group({
    clientID: this.fb.control<number | null>(null),
    from: this.fb.control<Date | null>(null),
    to: this.fb.control<Date | null>(null),
  });

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    id: [0],
    clientID: [null as number | null, [Validators.required]],
    researchType: ['P', [Validators.required]],
    validityFrom: this.fb.control<Date | null>(null, [Validators.required]),
    validityTo: this.fb.control<Date | null>(null, [Validators.required]),
  });

  protected readonly total = computed(() => this.allRows().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<ResearchPermissionRow[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.allRows().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const client = this.searchClient().trim();
    this.service
      .search(client === '' ? null : Number(client), this.searchFrom() || null, this.searchTo() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  /** Apply the search section's filters to the list. */
  protected applyFilters(): void {
    const f = this.filterForm.getRawValue();
    this.searchClient.set(f.clientID == null ? '' : String(f.clientID));
    this.searchFrom.set(f.from ? toIsoDate(f.from) : '');
    this.searchTo.set(f.to ? toIsoDate(f.to) : '');
    this.pageNumber.set(1);
    this.load();
  }

  /** Reset the search section and reload the full list. */
  protected clearFilters(): void {
    this.filterForm.reset({ clientID: null, from: null, to: null });
    this.searchClient.set('');
    this.searchFrom.set('');
    this.searchTo.set('');
    this.pageNumber.set(1);
    this.load();
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
    this.form.reset({ id: 0, clientID: null, researchType: 'P', validityFrom: null, validityTo: null });
    this.editingId.set(0);
  }

  protected startEdit(row: ResearchPermissionRow): void {
    this.form.reset({
      id: row.id,
      clientID: row.clientID,
      researchType: row.researchType ?? 'P',
      validityFrom: parseIsoDate((row.validityFrom ?? '').slice(0, 10)),
      validityTo: parseIsoDate((row.validityTo ?? '').slice(0, 10)),
    });
    this.editingId.set(row.id);
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
    if (v.validityFrom && v.validityTo && v.validityTo < v.validityFrom) {
      this.notify.error('Validity Till cannot be before Validity From.');
      return;
    }
    this.saving.set(true);
    this.service
      .save({
        id: v.id,
        clientID: Number(v.clientID),
        researchType: v.researchType,
        validityFrom: toIsoDate(v.validityFrom!),
        validityTo: toIsoDate(v.validityTo!),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Research report permission saved.');
        this.editingId.set(null);
        this.load();
      });
  }
}

/** ISO yyyy-MM-dd → local Date (midnight), avoiding the UTC shift of `new Date('yyyy-MM-dd')`. */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** Local Date → ISO yyyy-MM-dd (no timezone shift). */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
