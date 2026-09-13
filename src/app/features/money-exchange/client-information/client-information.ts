import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { MeClient } from './client-information.model';
import { ClientInformationService } from './client-information.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

/**
 * Money Exchange — Client Information (Masters/Money Exchange). New-app rewrite
 * of the legacy screen. Add + edit a money-changing client with cascading
 * Region → Country → City dropdowns (off the shared TPO masters) and an
 * address. Backed by usp_RF_MCClient_* (MoneyChanging_ClientInformation).
 */
@Component({
  selector: 'app-client-information',
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
  templateUrl: './client-information.html',
  styleUrl: './client-information.scss',
})
export class ClientInformationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(ClientInformationService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<MeClient[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that ID. */
  protected readonly editingId = signal(0);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly regionOptions = signal<SelectOption[]>([]);
  protected readonly countryOptions = signal<SelectOption[]>([]);
  protected readonly cityOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterText = signal('');
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  /** Suppresses the cascade reset while we're programmatically loading an edit. */
  private hydrating = false;

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.control<string | null>(null, [Validators.required]),
    contactNo: this.fb.control<string | null>(null, [Validators.required]),
    alternateNo: this.fb.control<string | null>(null),
    emailID: this.fb.control<string | null>(null),
    regionID: this.fb.control<number | null>(null),
    countryID: this.fb.control<number | null>(null),
    cityID: this.fb.control<number | null>(null),
    addressLine1: this.fb.control<string | null>(null),
    addressLine2: this.fb.control<string | null>(null),
    pinCode: this.fb.control<string | null>(null),
    status: this.fb.control<string | null>('Active'),
  });

  ngOnInit(): void {
    this.service.getRegions().subscribe((o) => this.regionOptions.set(o));

    // Region change -> reload countries, clear country + city.
    this.form.controls.regionID.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regionId) => {
        if (this.hydrating) return;
        this.form.controls.countryID.setValue(null);
        this.form.controls.cityID.setValue(null);
        this.cityOptions.set([]);
        this.loadCountries(regionId);
      });

    // Country change -> reload cities, clear city.
    this.form.controls.countryID.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((countryId) => {
        if (this.hydrating) return;
        this.form.controls.cityID.setValue(null);
        this.loadCities(countryId);
      });

    this.load();
  }

  private loadCountries(regionId: number | null): void {
    this.service.getCountries(regionId).subscribe((o) => this.countryOptions.set(o));
  }
  private loadCities(countryId: number | null): void {
    this.service.getCities(countryId).subscribe((o) => this.cityOptions.set(o));
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterText() || null, this.filterStatus())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  /** Composed address for the list, matching the legacy layout. */
  protected address(r: MeClient): string {
    const parts = `${r.addressLine1 ?? ''} ,${r.addressLine2 ?? ''}, ${r.cityName ?? ''},${
      r.countryDescription ?? ''
    }-${r.pinCode ?? ''}`;
    return parts.replace(/^[\s,-]+|[\s,-]+$/g, '') || '—';
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterText(value: string): void {
    this.filterText.set(value);
  }
  protected onFilterStatus(value: string | null): void {
    this.filterStatus.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterText.set('');
    this.filterStatus.set(null);
    this.load();
  }

  // --- Add / edit form ------------------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.resetForm();
      this.showForm.set(true);
    }
  }

  protected edit(row: MeClient): void {
    this.editingId.set(row.id);
    // Load the dependent option lists first, then set values without triggering
    // the cascade resets (hydrating guard).
    this.hydrating = true;
    this.service.getCountries(row.regionID).subscribe((countries) => {
      this.countryOptions.set(countries);
      this.service.getCities(row.countryID).subscribe((cities) => {
        this.cityOptions.set(cities);
        this.form.reset({
          name: row.name ?? null,
          contactNo: row.contactNo ?? null,
          alternateNo: row.alternateNo ?? null,
          emailID: row.emailID ?? null,
          regionID: row.regionID ?? null,
          countryID: row.countryID ?? null,
          cityID: row.cityID ?? null,
          addressLine1: row.addressLine1 ?? null,
          addressLine2: row.addressLine2 ?? null,
          pinCode: row.pinCode ?? null,
          status: row.status ?? 'Active',
        });
        this.hydrating = false;
      });
    });
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.hydrating = true;
    this.form.reset({
      name: null,
      contactNo: null,
      alternateNo: null,
      emailID: null,
      regionID: null,
      countryID: null,
      cityID: null,
      addressLine1: null,
      addressLine2: null,
      pinCode: null,
      status: 'Active',
    });
    this.countryOptions.set([]);
    this.cityOptions.set([]);
    this.hydrating = false;
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    const editing = this.editingId() > 0;
    this.service
      .save({
        id: this.editingId(),
        name: v.name!,
        contactNo: v.contactNo,
        alternateNo: v.alternateNo,
        emailID: v.emailID,
        regionID: v.regionID,
        countryID: v.countryID,
        cityID: v.cityID,
        addressLine1: v.addressLine1,
        addressLine2: v.addressLine2,
        pinCode: v.pinCode,
        status: v.status,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Client updated.' : 'Client added.');
        this.closeForm();
        this.load();
      });
  }
}
