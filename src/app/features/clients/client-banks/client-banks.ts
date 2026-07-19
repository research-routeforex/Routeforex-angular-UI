import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClientBank } from '../client.model';
import { ClientsService } from '../clients.service';

@Component({
  selector: 'app-client-banks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './client-banks.html',
  styleUrl: './client-child.scss',
})
export class ClientBanksComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientsService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  readonly clientId = input.required<number>();
  /** Client name — shown in the tab header. */
  readonly clientName = input<string>('');

  protected readonly banks = signal<ClientBank[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** ClientBankId currently being edited (0 = adding a new bank). */
  protected readonly editingId = signal(0);

  // Cascade dropdowns: Region → Country → City → Bank.
  protected readonly regionOptions = signal<SelectOption[]>([]);
  protected readonly countryOptions = signal<SelectOption[]>([]);
  protected readonly cityOptions = signal<SelectOption[]>([]);
  protected readonly bankOptions = signal<SelectOption[]>([]);
  protected readonly statusOptions = signal<SelectOption[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    region: this.fb.control<number | null>(null),
    country: this.fb.control<number | null>(null),
    city: this.fb.control<number | null>(null),
    bankId: this.fb.control<number | null>(null, [Validators.required]),
    status: this.fb.control<string | null>('Active'),
    accountNo: [''],
    ifscCode: [''],
    swiftCode: [''],
    bankBranch: [''],
    branchCode: [''],
    bankMargin: this.fb.control<number | null>(null),
    address1: [''],
    address2: [''],
    pin: this.fb.control<number | null>(null),
    rmName: [''],
    rmContactNo: [''],
    rmEmail: ['', [Validators.email]],
  });

  constructor() {
    // Region → Country → City → Bank cascade. A user change resets the children.
    this.form.controls.region.valueChanges.pipe(takeUntilDestroyed()).subscribe((regionId) => {
      this.form.controls.country.setValue(null, { emitEvent: false });
      this.form.controls.city.setValue(null, { emitEvent: false });
      this.form.controls.bankId.setValue(null, { emitEvent: false });
      this.cityOptions.set([]);
      this.bankOptions.set([]);
      this.loadCountries(regionId);
    });
    this.form.controls.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((countryId) => {
      this.form.controls.city.setValue(null, { emitEvent: false });
      this.form.controls.bankId.setValue(null, { emitEvent: false });
      this.bankOptions.set([]);
      this.loadCities(countryId);
    });
    this.form.controls.city.valueChanges.pipe(takeUntilDestroyed()).subscribe((cityId) => {
      this.form.controls.bankId.setValue(null, { emitEvent: false });
      this.loadBanks(cityId);
    });

    // Load the region + status lookups once.
    this.service.getLookups().subscribe((l) => {
      this.regionOptions.set(toIdOptions(l.regions));
      this.statusOptions.set(toNameOptions(l.statuses));
    });

    effect(() => {
      const id = this.clientId();
      if (id > 0) this.load(id);
    });
  }

  private loadCountries(regionId: number | null): void {
    if (!regionId) {
      this.countryOptions.set([]);
      return;
    }
    this.service.getCountries(regionId).subscribe((l) => this.countryOptions.set(toIdOptions(l)));
  }

  private loadCities(countryId: number | null): void {
    if (!countryId) {
      this.cityOptions.set([]);
      return;
    }
    this.service.getCities(countryId).subscribe((l) => this.cityOptions.set(toIdOptions(l)));
  }

  private loadBanks(cityId: number | null): void {
    if (!cityId) {
      this.bankOptions.set([]);
      return;
    }
    this.service.getBankOptions(cityId).subscribe((l) => this.bankOptions.set(toIdOptions(l)));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.service
      .getBanks(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.banks.set(rows));
  }

  /** Open the form for a new bank (resets any in-progress edit). */
  protected toggleForm(): void {
    if (this.showForm()) {
      this.closeForm();
    } else {
      this.editingId.set(0);
      this.resetForm();
      this.showForm.set(true);
    }
  }

  private resetForm(): void {
    this.form.reset({ status: 'Active' });
    this.countryOptions.set([]);
    this.cityOptions.set([]);
    this.bankOptions.set([]);
  }

  /** Load an existing bank into the form for editing (restores the cascade). */
  protected edit(bank: ClientBank): void {
    this.editingId.set(bank.clientBankId);
    this.resetForm();
    this.form.patchValue(
      {
        status: bank.activeStatus ?? 'Active',
        accountNo: bank.accountNo ?? '',
        ifscCode: bank.ifscCode ?? '',
        swiftCode: bank.swiftCode ?? '',
        bankBranch: bank.bankBranch ?? '',
        branchCode: bank.branchCode ?? '',
        bankMargin: bank.bankMargin ?? null,
        address1: bank.address1 ?? '',
        address2: bank.address2 ?? '',
        pin: bank.pin ?? null,
        rmName: bank.rmName ?? '',
        rmContactNo: bank.rmContactNo ?? '',
        rmEmail: bank.rmEmail ?? '',
      },
      { emitEvent: false },
    );

    // Restore Region → Country → City → Bank in order without firing the reset cascade.
    const regionId = toNum(bank.region);
    const countryId = toNum(bank.country);
    const cityId = toNum(bank.city);
    this.form.controls.region.setValue(regionId, { emitEvent: false });
    if (regionId) {
      this.service.getCountries(regionId).subscribe((countries) => {
        this.countryOptions.set(toIdOptions(countries));
        this.form.controls.country.setValue(countryId, { emitEvent: false });
        if (countryId) {
          this.service.getCities(countryId).subscribe((cities) => {
            this.cityOptions.set(toIdOptions(cities));
            this.form.controls.city.setValue(cityId, { emitEvent: false });
            if (cityId) {
              this.service.getBankOptions(cityId).subscribe((banks) => {
                this.bankOptions.set(toIdOptions(banks));
                this.form.controls.bankId.setValue(bank.bankId ?? null, { emitEvent: false });
              });
            }
          });
        }
      });
    }
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  /** Insert (editingId = 0) or update the bank. */
  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const editing = this.editingId() > 0;
    this.service
      .saveBank(this.clientId(), {
        clientBankId: this.editingId(),
        bankId: v.bankId,
        accountNo: v.accountNo || null,
        ifscCode: v.ifscCode || null,
        swiftCode: v.swiftCode || null,
        bankBranch: v.bankBranch || null,
        branchCode: v.branchCode || null,
        bankMargin: v.bankMargin,
        address1: v.address1 || null,
        address2: v.address2 || null,
        region: toStr(v.region),
        city: toStr(v.city),
        state: null,
        pin: v.pin,
        country: toStr(v.country),
        rmName: v.rmName || null,
        rmContactNo: v.rmContactNo || null,
        rmEmail: v.rmEmail || null,
        status: v.status || 'Active',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Bank updated.' : 'Bank added.');
        this.closeForm();
        this.load(this.clientId());
      });
  }

  protected remove(bank: ClientBank): void {
    this.confirm
      .confirm({
        title: 'Remove bank?',
        message: `Remove ${bank.bankName || 'this bank'} from the client?`,
        confirmText: 'Remove',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteBank(bank.clientBankId).subscribe(() => {
          this.notify.success('Bank removed.');
          this.load(this.clientId());
        });
      });
  }
}

/** Lookup items → options whose value is the numeric id. */
function toIdOptions(items?: { id: number; name: string }[]): SelectOption[] {
  return (items ?? []).map((i) => ({ value: i.id, label: i.name }));
}

/** Lookup items → options whose value is the name (used for Status → ActiveStatus). */
function toNameOptions(items?: { id: number; name: string }[]): SelectOption[] {
  return (items ?? []).map((i) => ({ value: i.name, label: i.name }));
}

/** Stored id-text → numeric control value. */
function toNum(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Numeric control value → id-text for the payload (varchar columns). */
function toStr(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}
