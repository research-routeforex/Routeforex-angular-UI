import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { ServiceOffered } from './service-offered.model';
import { ServiceOfferedService } from './service-offered.service';

/** Status values in use across TPO_Mast_ServiceOffered. */
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Mobile', label: 'Mobile' },
];

/**
 * Service Offered (Masters) — new-app version of the legacy Service Offered
 * Master. Lists services with Name / Description / Status filters; the form
 * adds or edits a service. View opens the form read-only. Backed by
 * usp_RF_ServiceOffered_* (TPO_Mast_ServiceOffered).
 */
@Component({
  selector: 'app-service-offered',
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
  ],
  templateUrl: './service-offered.html',
  styleUrl: './service-offered.scss',
})
export class ServiceOfferedComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ServiceOfferedService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<ServiceOffered[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal(0);
  /** true when the form is opened read-only via the View action. */
  protected readonly viewing = signal(false);

  protected readonly statusOptions = STATUS_OPTIONS;

  // List filters
  protected readonly filterName = signal('');
  protected readonly filterDescription = signal('');
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    serviceName: ['', [Validators.required]],
    serviceDescription: [''],
    status: this.fb.control<string | null>('Active'),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterName() || null, this.filterDescription() || null, this.filterStatus())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterName(value: string): void {
    this.filterName.set(value);
  }
  protected onFilterDescription(value: string): void {
    this.filterDescription.set(value);
  }
  protected onFilterStatus(value: string | null): void {
    this.filterStatus.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterName.set('');
    this.filterDescription.set('');
    this.filterStatus.set(null);
    this.load();
  }

  // --- Form open / edit / view / close -------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.viewing.set(false);
      this.form.reset({ serviceName: '', serviceDescription: '', status: 'Active' });
      this.form.enable();
      this.showForm.set(true);
    }
  }

  protected edit(r: ServiceOffered): void {
    this.openWith(r, false);
  }
  protected view(r: ServiceOffered): void {
    this.openWith(r, true);
  }

  private openWith(r: ServiceOffered, readonly: boolean): void {
    this.editingId.set(r.serviceID);
    this.viewing.set(readonly);
    this.form.reset({
      serviceName: r.serviceName ?? '',
      serviceDescription: r.serviceDescription ?? '',
      status: r.status ?? 'Active',
    });
    if (readonly) this.form.disable();
    else this.form.enable();
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.viewing.set(false);
    this.form.enable();
    this.form.reset({ serviceName: '', serviceDescription: '', status: 'Active' });
  }

  protected save(): void {
    if (this.viewing() || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const editing = this.editingId() > 0;
    this.service
      .save({
        serviceID: this.editingId(),
        serviceName: v.serviceName,
        serviceDescription: v.serviceDescription || null,
        status: v.status,
        serviceIcon: null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Service updated.' : 'Service added.');
        this.closeForm();
        this.load();
      });
  }
}
