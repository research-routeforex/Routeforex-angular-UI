import { DecimalPipe } from '@angular/common';
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
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { LmsClient, LmsContact } from './client-master.model';
import { LmsClientMasterService } from './client-master.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

/**
 * LMS — Client Master. A trimmed version of the main Client Master (no Industry
 * column — it isn't in TPO_LMS_ClientMaster). Add + edit + read-only view, with
 * cascading Region → Country → City dropdowns (shared TPO masters) and one
 * contact person. Backed by usp_RF_LMSClient_* (TPO_LMS_ClientMaster).
 */
@Component({
  selector: 'app-lms-client-master',
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
    DecimalPipe,
  ],
  templateUrl: './client-master.html',
  styleUrl: './client-master.scss',
})
export class LmsClientMasterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(LmsClientMasterService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<LmsClient[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that ClientID. */
  protected readonly editingId = signal(0);
  /** true = read-only view (all fields disabled, no submit). */
  protected readonly viewing = signal(false);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly regionOptions = signal<SelectOption[]>([]);
  protected readonly countryOptions = signal<SelectOption[]>([]);
  protected readonly cityOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterText = signal('');
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  /** Suppresses the cascade reset while programmatically loading a row. */
  private hydrating = false;

  protected readonly form = this.fb.nonNullable.group({
    clientName: this.fb.control<string | null>(null, [Validators.required]),
    regionCode: this.fb.control<number | null>(null),
    country: this.fb.control<number | null>(null),
    city: this.fb.control<number | null>(null),
    addressLine1: this.fb.control<string | null>(null),
    addressLine2: this.fb.control<string | null>(null),
    pin: this.fb.control<string | null>(null),
    exportFigure: this.fb.control<number | null>(null),
    importFigure: this.fb.control<number | null>(null),
    totalFigure: this.fb.control<number | null>(null),
    contacts: this.fb.array<ReturnType<LmsClientMasterComponent['newContact']>>([]),
    status: this.fb.control<string | null>('Active'),
  });

  protected get contacts(): FormArray {
    return this.form.controls.contacts;
  }

  private newContact(c?: LmsContact) {
    return this.fb.group({
      contactName: this.fb.control<string | null>(c?.contactName ?? null),
      email: this.fb.control<string | null>(c?.email ?? null),
      contactNumber: this.fb.control<string | null>(c?.contactNumber ?? null),
      designation: this.fb.control<string | null>(c?.designation ?? null),
    });
  }

  protected addContact(): void {
    this.contacts.push(this.newContact());
  }
  protected removeContact(i: number): void {
    this.contacts.removeAt(i);
  }

  /** Replace the contact rows from a saved list (at least one empty row). */
  private setContacts(list: LmsContact[]): void {
    this.contacts.clear();
    const rows = list.length
      ? list
      : [{ contactName: null, email: null, contactNumber: null, designation: null }];
    for (const c of rows) this.contacts.push(this.newContact(c));
  }

  ngOnInit(): void {
    this.service.getRegions().subscribe((o) => this.regionOptions.set(o));

    this.form.controls.regionCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regionId) => {
        if (this.hydrating) return;
        this.form.controls.country.setValue(null);
        this.form.controls.city.setValue(null);
        this.cityOptions.set([]);
        this.loadCountries(regionId);
      });

    this.form.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((countryId) => {
        if (this.hydrating) return;
        this.form.controls.city.setValue(null);
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

  /** Composed address for the list. */
  protected address(r: LmsClient): string {
    const parts = `${r.addressLine1 ?? ''} ${r.addressLine2 ?? ''}`.trim();
    return parts || '—';
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

  // --- Add / edit / view form ----------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.resetForm();
      this.showForm.set(true);
    }
  }

  protected edit(row: LmsClient): void {
    this.openRow(row, false);
  }

  /** Read-only view — same form pre-filled, all fields disabled, no submit. */
  protected view(row: LmsClient): void {
    this.openRow(row, true);
  }

  private openRow(row: LmsClient, readOnly: boolean): void {
    this.viewing.set(readOnly);
    this.editingId.set(row.clientID);
    this.hydrating = true;
    this.form.enable({ emitEvent: false });
    // Load dependent lists first, then set values without firing cascade resets.
    this.service.getCountries(row.regionCode).subscribe((countries) => {
      this.countryOptions.set(countries);
      this.service.getCities(row.country).subscribe((cities) => {
        this.cityOptions.set(cities);
        this.form.reset({
          clientName: row.clientName ?? null,
          regionCode: row.regionCode ?? null,
          country: row.country ?? null,
          city: row.city ?? null,
          addressLine1: row.addressLine1 ?? null,
          addressLine2: row.addressLine2 ?? null,
          pin: row.pin ?? null,
          exportFigure: row.exportFigure ?? null,
          importFigure: row.importFigure ?? null,
          totalFigure: row.totalFigure ?? null,
          status: row.status ?? 'Active',
        });
        this.setContacts(row.contacts ?? []);
        this.hydrating = false;
        if (readOnly) this.form.disable({ emitEvent: false });
      });
    });
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.viewing.set(false);
    this.hydrating = true;
    this.form.enable({ emitEvent: false });
    this.form.reset({
      clientName: null,
      regionCode: null,
      country: null,
      city: null,
      addressLine1: null,
      addressLine2: null,
      pin: null,
      exportFigure: null,
      importFigure: null,
      totalFigure: null,
      status: 'Active',
    });
    this.setContacts([]);
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
    if (this.viewing()) return;
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    const editing = this.editingId() > 0;
    this.service
      .save({
        clientID: this.editingId(),
        clientName: v.clientName!,
        regionCode: v.regionCode,
        country: v.country,
        city: v.city,
        addressLine1: v.addressLine1,
        addressLine2: v.addressLine2,
        pin: v.pin,
        exportFigure: v.exportFigure,
        importFigure: v.importFigure,
        totalFigure: v.totalFigure,
        contacts: (v.contacts as LmsContact[]).filter(
          (c) => c.contactName || c.email || c.contactNumber,
        ),
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
