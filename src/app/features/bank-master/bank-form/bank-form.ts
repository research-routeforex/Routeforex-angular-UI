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
import { BankContact } from '../bank-master.model';
import { BankMasterService } from '../bank-master.service';

@Component({
  selector: 'app-bank-form',
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
  templateUrl: './bank-form.html',
  styleUrl: './bank-form.scss',
})
export class BankFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(BankMasterService);
  private readonly common = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly bankId = signal(0);
  protected readonly isEdit = computed(() => this.bankId() > 0);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly categoryOptions: SelectOption[] = [
    { value: 'Private Bank LOU', label: 'Private Bank LOU' },
    { value: 'PSU Bank LOU', label: 'PSU Bank LOU' },
  ];
  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  // Raw Common Master lists (loaded once) that drive the cascade.
  private readonly regions = signal<CountryRegion[]>([]);
  private readonly countries = signal<Country[]>([]);
  private readonly cities = signal<CityMaster[]>([]);

  // Current cascade selections (mirrored as signals so the option lists react).
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
    bankID: this.fb.nonNullable.control(0),
    bankName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    bankCategory: this.fb.nonNullable.control('', [Validators.required]),
    regionId: this.fb.control<string | null>(null, [Validators.required]),
    countryCode: this.fb.control<string | null>(null, [Validators.required]),
    cityCode: this.fb.control<string | null>(null, [Validators.required]),
    activeStatus: this.fb.nonNullable.control('Active'),
    contacts: this.fb.array<FormGroup>([]),
  });

  protected get contacts(): FormArray<FormGroup> {
    return this.form.controls.contacts;
  }

  constructor() {
    // Cascade: changing region resets country + city; changing country resets city.
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
    this.bankId.set(Number.isNaN(id) ? 0 : id);

    this.loading.set(true);
    forkJoin({
      regions: this.common.getCountryRegions(),
      countries: this.common.getCountries(),
      cities: this.common.getCities(),
    }).subscribe(({ regions, countries, cities }) => {
      this.regions.set(regions);
      this.countries.set(countries);
      this.cities.set(cities);

      if (this.isEdit()) {
        this.service
          .getBank(this.bankId())
          .pipe(finalize(() => this.loading.set(false)))
          .subscribe((bank) => {
            // Set the cascade top-down so each downstream reset happens before its value.
            this.form.patchValue({
              bankID: bank.bankID,
              bankName: bank.bankName,
              bankCategory: bank.bankCategory ?? '',
              activeStatus: bank.activeStatus || 'Active',
            });
            this.form.controls.regionId.setValue(bank.regionId ?? null);
            this.form.controls.countryCode.setValue(bank.countryCode ?? null);
            this.form.controls.cityCode.setValue(bank.cityCode ?? null);
            for (const c of bank.contacts ?? []) this.contacts.push(this.contactGroup(c));
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

  private contactGroup(c?: BankContact): FormGroup {
    return this.fb.group({
      rmContactDetailID: this.fb.nonNullable.control(c?.rmContactDetailID ?? 0),
      rmName: this.fb.nonNullable.control(c?.rmName ?? '', [
        Validators.required,
        Validators.maxLength(150),
      ]),
      rmContactNo: this.fb.nonNullable.control(c?.rmContactNo ?? '', [Validators.maxLength(200)]),
      rmEmail: this.fb.nonNullable.control(c?.rmEmail ?? '', [
        Validators.email,
        Validators.maxLength(200),
      ]),
      rmLandLine: this.fb.nonNullable.control(c?.rmLandLine ?? '', [Validators.maxLength(200)]),
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
        rmContactDetailID: Number(c['rmContactDetailID'] ?? 0),
        rmName: String(c['rmName'] ?? '').trim(),
        rmContactNo: (c['rmContactNo'] as string) || null,
        rmEmail: (c['rmEmail'] as string) || null,
        rmLandLine: (c['rmLandLine'] as string) || null,
      }))
      .filter((c) => c.rmName.length > 0);

    this.saving.set(true);
    this.service
      .saveBank({
        bankID: v.bankID,
        bankName: v.bankName,
        bankCategory: v.bankCategory,
        regionId: v.regionId,
        countryCode: v.countryCode,
        cityCode: v.cityCode,
        activeStatus: v.activeStatus,
        contacts,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(`Bank ${this.isEdit() ? 'updated' : 'created'} successfully.`);
        void this.router.navigate(['/bank-master']);
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/bank-master']);
  }
}
