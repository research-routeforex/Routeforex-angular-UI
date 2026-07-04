import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, forkJoin } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { CityMaster, Country, CountryRegion } from '../../common-master/common-master.model';
import { CommonMasterService } from '../../common-master/common-master.service';
import { BankMasterService } from '../bank-master.service';
import { HeadOfficeContact } from '../head-office.model';
import { HeadOfficeService } from '../head-office.service';

@Component({
  selector: 'app-head-office-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './head-office-form.html',
  styleUrl: './head-office-form.scss',
})
export class HeadOfficeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(HeadOfficeService);
  private readonly banks = inject(BankMasterService);
  private readonly common = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly recordId = signal(0);
  protected readonly isEdit = computed(() => this.recordId() > 0);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  /** Bank names (HeadOfficeName stores the bank NAME, not an id). */
  protected readonly bankOptions = signal<SelectOption[]>([]);

  // Raw Common Master lists (loaded once) that drive the cascade.
  private readonly regions = signal<CountryRegion[]>([]);
  private readonly countries = signal<Country[]>([]);
  private readonly cities = signal<CityMaster[]>([]);

  private readonly selRegion = signal<string | null>(null);
  private readonly selCountry = signal<string | null>(null);

  protected readonly regionOptions = computed<SelectOption[]>(() =>
    this.regions().map((r) => ({ value: String(r.countryRegionID), label: r.regionDescription })),
  );
  protected readonly countryOptions = computed<SelectOption[]>(() => {
    const code = this.regionCodeFor(this.selRegion());
    if (!code) return [];
    return this.countries()
      .filter((c) => (c.countryRegion ?? '') === code)
      .map((c) => ({ value: String(c.countryID), label: c.countryDescription }));
  });
  protected readonly cityOptions = computed<SelectOption[]>(() => {
    const code = this.countryCodeFor(this.selCountry());
    if (!code) return [];
    return this.cities()
      .filter((ci) => (ci.countryCode ?? '') === code)
      .map((ci) => ({ value: String(ci.cityID), label: ci.cityName }));
  });

  protected readonly form = this.fb.group({
    recordID: this.fb.nonNullable.control(0),
    headOfficeName: this.fb.nonNullable.control('', [Validators.required]),
    regionId: this.fb.control<string | null>(null, [Validators.required]),
    countryCode: this.fb.control<string | null>(null, [Validators.required]),
    cityCode: this.fb.control<string | null>(null, [Validators.required]),
    addressLine1: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
    addressLine2: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
    pin: this.fb.control<number | null>(null),
    landLineNo: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    activeStatus: this.fb.nonNullable.control('Active'),
    contacts: this.fb.array<FormGroup>([]),
  });

  protected get contacts(): FormArray<FormGroup> {
    return this.form.controls.contacts;
  }

  constructor() {
    this.form.controls.regionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.selRegion.set(v);
        this.form.controls.countryCode.setValue(null);
      });
    this.form.controls.countryCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.selCountry.set(v);
        this.form.controls.cityCode.setValue(null);
      });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    this.recordId.set(Number.isNaN(id) ? 0 : id);

    this.loading.set(true);
    forkJoin({
      banks: this.banks.getBanks(),
      regions: this.common.getCountryRegions(),
      countries: this.common.getCountries(),
      cities: this.common.getCities(),
    }).subscribe(({ banks, regions, countries, cities }) => {
      // Bank names can repeat across rows — show each distinct name once.
      const seen = new Set<string>();
      const distinctBanks: SelectOption[] = [];
      for (const b of banks) {
        const name = (b.bankName ?? '').trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        distinctBanks.push({ value: name, label: name });
      }
      distinctBanks.sort((a, b) => a.label.localeCompare(b.label));
      this.bankOptions.set(distinctBanks);
      this.regions.set(regions);
      this.countries.set(countries);
      this.cities.set(cities);

      if (this.isEdit()) {
        this.service
          .getHeadOffice(this.recordId())
          .pipe(finalize(() => this.loading.set(false)))
          .subscribe((ho) => {
            this.form.patchValue({
              recordID: ho.recordID,
              headOfficeName: ho.headOfficeName,
              addressLine1: ho.addressLine1 ?? '',
              addressLine2: ho.addressLine2 ?? '',
              pin: ho.pin ?? null,
              landLineNo: ho.landLineNo ?? '',
              activeStatus: ho.activeStatus || 'Active',
            });
            // Set the cascade top-down so each downstream reset happens before its value.
            this.form.controls.regionId.setValue(ho.regionCode ?? null);
            this.form.controls.countryCode.setValue(ho.countryCode ?? null);
            this.form.controls.cityCode.setValue(ho.cityCode ?? null);
            for (const c of ho.contacts ?? []) this.contacts.push(this.contactGroup(c));
          });
      } else {
        this.loading.set(false);
      }
    });
  }

  private regionCodeFor(id: string | null): string | null {
    if (!id) return null;
    return this.regions().find((r) => String(r.countryRegionID) === id)?.regionCode ?? null;
  }
  private countryCodeFor(id: string | null): string | null {
    if (!id) return null;
    return this.countries().find((c) => String(c.countryID) === id)?.countryCode ?? null;
  }

  private contactGroup(c?: HeadOfficeContact): FormGroup {
    return this.fb.group({
      id: this.fb.nonNullable.control(c?.id ?? 0),
      contactName: this.fb.nonNullable.control(c?.contactName ?? '', [
        Validators.required,
        Validators.maxLength(200),
      ]),
      contactNumber: this.fb.nonNullable.control(c?.contactNumber ?? '', [Validators.maxLength(200)]),
    });
  }

  protected addContact(): void {
    this.contacts.push(this.contactGroup());
  }
  protected removeContact(i: number): void {
    this.contacts.removeAt(i);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const contacts = (v.contacts as Array<Record<string, unknown>>)
      .map((c) => ({
        id: Number(c['id'] ?? 0),
        contactName: String(c['contactName'] ?? '').trim(),
        contactNumber: (c['contactNumber'] as string) || null,
      }))
      .filter((c) => c.contactName.length > 0);

    this.saving.set(true);
    this.service
      .saveHeadOffice({
        recordID: v.recordID,
        headOfficeName: v.headOfficeName,
        regionCode: v.regionId,
        countryCode: v.countryCode,
        cityCode: v.cityCode,
        addressLine1: v.addressLine1 || null,
        addressLine2: v.addressLine2 || null,
        pin: v.pin ?? null,
        landLineNo: v.landLineNo || null,
        activeStatus: v.activeStatus,
        contacts,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(`Head office ${this.isEdit() ? 'updated' : 'created'} successfully.`);
        this.backToList();
      });
  }

  protected cancel(): void {
    this.backToList();
  }

  private backToList(): void {
    this.router.navigate(['/bank-master'], { queryParams: { tab: 'head-office' } });
  }
}
