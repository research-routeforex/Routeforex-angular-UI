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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, forkJoin } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { CityMaster, Country, State } from '../../common-master/common-master.model';
import { CommonMasterService } from '../../common-master/common-master.service';
import { BankMasterService } from '../../bank-master/bank-master.service';
import { CompBankService } from '../comp-bank.service';

@Component({
  selector: 'app-comp-bank-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './comp-bank-form.html',
  styleUrl: './comp-bank-form.scss',
})
export class CompBankFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(CompBankService);
  private readonly banks = inject(BankMasterService);
  private readonly common = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly compBankId = signal(0);
  protected readonly isEdit = computed(() => this.compBankId() > 0);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  /** Bank options — label is "Bank Name (City)", value is the bank id. */
  protected readonly bankOptions = signal<SelectOption[]>([]);

  // Common Master lists (loaded once) that drive the Country → State / City cascade.
  private readonly countries = signal<Country[]>([]);
  private readonly states = signal<State[]>([]);
  private readonly cities = signal<CityMaster[]>([]);

  /** Selected country ID (city/state/countryId columns store the ids). */
  private readonly selCountry = signal<string>('');

  protected readonly countryOptions = computed<SelectOption[]>(() =>
    distinct(
      this.countries().map((c) => ({
        value: String(c.countryID),
        label: c.countryDescription || c.countryCode,
      })),
    ),
  );
  protected readonly stateOptions = computed<SelectOption[]>(() => {
    const cc = this.countryCodeForId(this.selCountry());
    if (!cc) return [];
    return distinct(
      this.states()
        .filter((s) => (s.countryCode ?? '') === cc)
        .map((s) => ({ value: String(s.stateId), label: s.stateName })),
    );
  });
  protected readonly cityOptions = computed<SelectOption[]>(() => {
    const cc = this.countryCodeForId(this.selCountry());
    if (!cc) return [];
    return distinct(
      this.cities()
        .filter((ci) => (ci.countryCode ?? '') === cc)
        .map((ci) => ({ value: String(ci.cityID), label: ci.cityName })),
    );
  });

  /** Resolve a country ID to its code (State/City lists are linked by country code). */
  private countryCodeForId(id: string): string {
    if (!id) return '';
    return this.countries().find((c) => String(c.countryID) === id)?.countryCode ?? '';
  }

  protected readonly form = this.fb.group({
    compBankId: this.fb.nonNullable.control(0),
    bankId: this.fb.control<string | null>(null, [Validators.required]),
    accountNo: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
    ifscCode: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
    swiftCode: this.fb.nonNullable.control('', [Validators.maxLength(50)]),
    address1: this.fb.nonNullable.control('', [Validators.maxLength(200)]),
    address2: this.fb.nonNullable.control('', [Validators.maxLength(200)]),
    country: this.fb.control<string | null>(null),
    state: this.fb.control<string | null>(null),
    city: this.fb.control<string | null>(null),
    pin: this.fb.control<number | null>(null),
    activeStatus: this.fb.nonNullable.control('Active'),
  });

  constructor() {
    // Country drives both State and City; changing it clears the two below it.
    this.form.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.selCountry.set(v ?? '');
        this.form.controls.state.setValue(null);
        this.form.controls.city.setValue(null);
      });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    this.compBankId.set(Number.isNaN(id) ? 0 : id);

    this.loading.set(true);
    forkJoin({
      banks: this.banks.getBanks(),
      countries: this.common.getCountries(),
      states: this.common.getStates(),
      cities: this.common.getCities(),
    }).subscribe(({ banks, countries, states, cities }) => {
      // Show "Bank Name (City)" so identically-named banks are distinguishable.
      this.bankOptions.set(
        banks
          .map((b) => {
            const name = (b.bankName ?? '').trim();
            const city = (b.cityName ?? '').trim();
            return {
              value: String(b.bankID),
              label: city ? `${name} (${city})` : name,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      this.countries.set(countries);
      this.states.set(states);
      this.cities.set(cities);

      if (this.isEdit()) {
        this.service
          .getCompBank(this.compBankId())
          .pipe(finalize(() => this.loading.set(false)))
          .subscribe((cb) => {
            this.form.patchValue({
              compBankId: cb.compBankId,
              bankId: cb.bankId != null ? String(cb.bankId) : null,
              accountNo: cb.accountNo ?? '',
              ifscCode: cb.ifscCode ?? '',
              swiftCode: cb.swiftCode ?? '',
              address1: cb.address1 ?? '',
              address2: cb.address2 ?? '',
              pin: cb.pin ?? null,
              activeStatus: cb.activeStatus || 'Active',
            });
            // Set country first so State/City option lists exist before selecting them.
            this.form.controls.country.setValue(cb.countryId ?? null);
            this.form.controls.state.setValue(cb.state ?? null);
            this.form.controls.city.setValue(cb.city ?? null);
          });
      } else {
        this.loading.set(false);
      }
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const s = (x: string | null) => (x && x.trim().length ? x.trim() : null);

    this.saving.set(true);
    this.service
      .saveCompBank({
        compBankId: v.compBankId,
        bankId: v.bankId != null ? Number(v.bankId) : null,
        accountNo: s(v.accountNo),
        ifscCode: s(v.ifscCode),
        address1: s(v.address1),
        address2: s(v.address2),
        city: s(v.city),
        state: s(v.state),
        pin: v.pin ?? null,
        countryId: s(v.country),
        swiftCode: s(v.swiftCode),
        activeStatus: v.activeStatus,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(`Company bank ${this.isEdit() ? 'updated' : 'created'} successfully.`);
        this.backToList();
      });
  }

  protected cancel(): void {
    this.backToList();
  }

  private backToList(): void {
    this.router.navigate(['/company-master'], { queryParams: { tab: 'comp-bank' } });
  }
}

/** Distinct select options by value (case-insensitive), preserving first occurrence. */
function distinct(options: SelectOption[]): SelectOption[] {
  const seen = new Set<string>();
  const out: SelectOption[] = [];
  for (const o of options) {
    const key = String(o.value ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}
