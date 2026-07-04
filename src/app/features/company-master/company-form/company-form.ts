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
import { CompanyMasterService } from '../company-master.service';

@Component({
  selector: 'app-company-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './company-form.html',
  styleUrl: './company-form.scss',
})
export class CompanyFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(CompanyMasterService);
  private readonly common = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly companyId = signal(0);
  protected readonly isEdit = computed(() => this.companyId() > 0);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  // Common Master lists (loaded once) that drive the Country → State / City cascade.
  private readonly countries = signal<Country[]>([]);
  private readonly states = signal<State[]>([]);
  private readonly cities = signal<CityMaster[]>([]);

  /** Selected country ID (Country/State/City columns store the ids). */
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

  protected readonly form = this.fb.nonNullable.group({
    companyId: [0],
    companyName: ['', [Validators.required, Validators.maxLength(200)]],
    website: ['', [Validators.maxLength(200)]],
    gstn: ['', [Validators.maxLength(50)]],
    pan: ['', [Validators.maxLength(50)]],
    cin: ['', [Validators.maxLength(50)]],
    addressLine1: ['', [Validators.maxLength(200)]],
    addressLine2: ['', [Validators.maxLength(200)]],
    country: this.fb.control<string | null>(null),
    state: this.fb.control<string | null>(null),
    city: this.fb.control<string | null>(null),
    gsStateCode: ['', [Validators.maxLength(100)]],
    pin: this.fb.control<number | null>(null),
    contact1: ['', [Validators.maxLength(50)]],
    contact2: ['', [Validators.maxLength(50)]],
    emailId: ['', [Validators.email, Validators.maxLength(250)]],
    contactName: ['', [Validators.maxLength(50)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(250)]],
    contactNumber: ['', [Validators.maxLength(50)]],
    activeStatus: ['Active'],
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
    this.companyId.set(Number.isNaN(id) ? 0 : id);

    this.loading.set(true);
    forkJoin({
      countries: this.common.getCountries(),
      states: this.common.getStates(),
      cities: this.common.getCities(),
    }).subscribe(({ countries, states, cities }) => {
      this.countries.set(countries);
      this.states.set(states);
      this.cities.set(cities);

      if (this.isEdit()) {
        this.service
          .getCompany(this.companyId())
          .pipe(finalize(() => this.loading.set(false)))
          .subscribe((c) => {
            this.form.patchValue({
              companyId: c.companyId,
              companyName: c.companyName,
              website: c.website ?? '',
              gstn: c.gstn ?? '',
              pan: c.pan ?? '',
              cin: c.cin ?? '',
              addressLine1: c.addressLine1 ?? '',
              addressLine2: c.addressLine2 ?? '',
              gsStateCode: c.gsStateCode ?? '',
              pin: c.pin ?? null,
              contact1: c.contact1 ?? '',
              contact2: c.contact2 ?? '',
              emailId: c.emailId ?? '',
              contactName: c.contactName ?? '',
              contactEmail: c.contactEmail ?? '',
              contactNumber: c.contactNumber ?? '',
              activeStatus: c.activeStatus || 'Active',
            });
            // Set country first so State/City option lists exist before selecting them.
            this.form.controls.country.setValue(c.country ?? null);
            this.form.controls.state.setValue(c.state ?? null);
            this.form.controls.city.setValue(c.city ?? null);
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
      .saveCompany({
        companyId: v.companyId,
        companyName: v.companyName,
        addressLine1: s(v.addressLine1),
        addressLine2: s(v.addressLine2),
        city: s(v.city),
        state: s(v.state),
        country: s(v.country),
        gsStateCode: s(v.gsStateCode),
        pin: v.pin ?? null,
        contact1: s(v.contact1),
        contact2: s(v.contact2),
        emailId: s(v.emailId),
        website: s(v.website),
        gstn: s(v.gstn),
        pan: s(v.pan),
        cin: s(v.cin),
        contactName: s(v.contactName),
        contactEmail: s(v.contactEmail),
        contactNumber: s(v.contactNumber),
        activeStatus: v.activeStatus,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(`Company ${this.isEdit() ? 'updated' : 'created'} successfully.`);
        this.router.navigate(['/company-master']);
      });
  }

  protected cancel(): void {
    this.router.navigate(['/company-master']);
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
