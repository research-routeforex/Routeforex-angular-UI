import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
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
  /** Selected city from the profile — filters the Bank dropdown. */
  readonly cityId = input<number | null>(null);

  protected readonly banks = signal<ClientBank[]>([]);
  protected readonly bankOptions = signal<SelectOption[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** ClientBankId currently being edited (0 = adding a new bank). */
  protected readonly editingId = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    bankId: this.fb.control<number | null>(null, [Validators.required]),
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
    // Reload bank options whenever the selected city changes (city → bank cascade).
    effect(() => {
      const city = this.cityId();
      this.service
        .getBankOptions(city)
        .subscribe((opts) => this.bankOptions.set(opts.map((o) => ({ value: o.id, label: o.name }))));
    });

    effect(() => {
      const id = this.clientId();
      if (id > 0) this.load(id);
    });
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
      this.form.reset();
      this.showForm.set(true);
    }
  }

  /** Load an existing bank into the form for editing. */
  protected edit(bank: ClientBank): void {
    this.editingId.set(bank.clientBankId);
    this.form.reset();
    this.form.patchValue({
      bankId: bank.bankId ?? null,
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
    });
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.form.reset();
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
        region: null,
        city: null,
        state: null,
        pin: v.pin,
        country: null,
        rmName: v.rmName || null,
        rmContactNo: v.rmContactNo || null,
        rmEmail: v.rmEmail || null,
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
