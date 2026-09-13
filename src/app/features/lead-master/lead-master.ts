import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { Lead } from './lead-master.model';
import { LeadMasterService } from './lead-master.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Done', label: 'Done' },
];

/**
 * Lead Master (Masters) — new-app version of the legacy screen. Leads are
 * captured by the public website (Subscribe / Request a Call Back / Contact Us)
 * and land in TPO_Mast_Lead; back-office users filter by Type / Status, browse
 * the list, and edit only two fields — Status + Remarks. Edit-only, no create.
 * Backed by usp_RF_Lead_* (TPO_Mast_Lead).
 */
@Component({
  selector: 'app-lead-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './lead-master.html',
  styleUrl: './lead-master.scss',
})
export class LeadMasterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LeadMasterService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<Lead[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = none; >0 = editing that RecordID. */
  protected readonly editingId = signal(0);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly typeOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterType = signal<string | null>(null);
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    remarks: this.fb.control<string | null>(null),
    status: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.service.getTypeOptions().subscribe((o) => this.typeOptions.set(o));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterType(), this.filterStatus())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterType(value: string | null): void {
    this.filterType.set(value);
  }
  protected onFilterStatus(value: string | null): void {
    this.filterStatus.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterType.set(null);
    this.filterStatus.set(null);
    this.load();
  }

  // --- Edit form ------------------------------------------------------------
  protected edit(row: Lead): void {
    this.editingId.set(row.recordID);
    this.form.reset({
      remarks: row.remarks ?? null,
      status: row.status ?? null,
    });
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.form.reset({ remarks: null, status: null });
  }

  protected save(): void {
    if (this.editingId() <= 0 || this.saving()) return;
    const v = this.form.getRawValue();
    if (!v.status) {
      this.notify.error('Select a status.');
      return;
    }
    this.saving.set(true);
    this.service
      .update({ recordID: this.editingId(), status: v.status, remarks: v.remarks })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Lead updated.');
        this.closeForm();
        this.load();
      });
  }
}
