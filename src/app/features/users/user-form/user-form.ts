import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize, switchMap } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { UsersService } from '../users.service';

export interface UserFormData {
  mode: 'create' | 'edit';
  user?: User;
}

@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    FieldComponent,
    SelectComponent,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(UsersService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<UserFormComponent, boolean>);
  protected readonly data = inject<UserFormData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);
  protected readonly isEdit = this.data.mode === 'edit';

  /** Roles + Clients from USP_RF_BINDDROPDOWN (type=ROLES / type=Client). */
  protected readonly roleOptions = signal<SelectOption[]>([]);
  protected readonly clientOptions = signal<SelectOption[]>([]);

  /** Live mirror of the password for the strength checklist. */
  private readonly pwd = signal('');
  /** Live mirror of the selected role id (drives the Client field). */
  private readonly roleIdSig = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.isEdit ? [] : [Validators.required, CustomValidators.strongPassword(8)]],
    confirmPassword: ['', this.isEdit ? [] : [Validators.required, this.matchPassword]],
    fullName: ['', [Validators.maxLength(100)]],
    phoneNumber: ['', [Validators.maxLength(20)]],
    roleId: this.fb.control<number | null>(null, [Validators.required]),
    clientId: this.fb.control<number | null>(null),
    isActive: [true],
    isLockedOut: [false],
  });

  // --- Strong-password checklist --------------------------------------------
  protected readonly ruleLen = computed(() => this.pwd().length >= 8);
  protected readonly ruleUpper = computed(() => /[A-Z]/.test(this.pwd()));
  protected readonly ruleLower = computed(() => /[a-z]/.test(this.pwd()));
  protected readonly ruleDigit = computed(() => /[0-9]/.test(this.pwd()));
  /** All rules satisfied → the field shows the green "strong" state. */
  protected readonly passwordStrong = computed(
    () => this.pwd().length > 0 && this.ruleLen() && this.ruleUpper() && this.ruleLower() && this.ruleDigit(),
  );
  protected readonly confirmMatches = computed(
    () =>
      this.form.controls.confirmPassword.value.length > 0 &&
      this.form.controls.password.value === this.form.controls.confirmPassword.value,
  );

  /** Show the Client dropdown when the chosen role is "Client". */
  protected readonly showClient = computed(() => {
    const id = this.roleIdSig();
    const opt = this.roleOptions().find((o) => Number(o.value) === id);
    return !!opt && /^client$/i.test(opt.label.trim());
  });

  constructor() {
    // Keep the strength checklist and confirm validity in sync with the password.
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.pwd.set(v ?? '');
        this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
      });

    // Mirror the selected role, and require a Client only when the Client role is chosen.
    this.form.controls.roleId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.roleIdSig.set(v));

    effect(() => {
      const client = this.form.controls.clientId;
      if (this.showClient()) {
        client.addValidators(Validators.required);
      } else {
        client.removeValidators(Validators.required);
        if (client.value !== null) client.setValue(null);
      }
      client.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.dropdowns.get('ROLES').subscribe((opts) => {
      this.roleOptions.set(opts);
      // Edit: preselect the user's (first) role by matching its name.
      if (this.isEdit && this.data.user?.roles.length) {
        const name = this.data.user.roles[0];
        const match = opts.find((o) => o.label.trim().toLowerCase() === name.trim().toLowerCase());
        if (match) this.form.controls.roleId.setValue(Number(match.value));
      }
    });
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));

    if (this.isEdit && this.data.user) {
      const u = this.data.user;
      this.form.patchValue({
        userName: u.userName,
        email: u.email,
        fullName: u.fullName ?? '',
        phoneNumber: u.phoneNumber ?? '',
        isActive: u.isActive,
        isLockedOut: u.isLockedOut,
      });
      this.form.controls.userName.disable();
    }
  }

  /** Cross-field: confirm-password must equal password (create only). */
  private matchPassword(control: AbstractControl): import('@angular/forms').ValidationErrors | null {
    const password = control.parent?.get('password')?.value;
    if (!control.value) return null;
    return password === control.value ? null : { mismatch: true };
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const roleIds = v.roleId != null ? [v.roleId] : [];
    this.saving.set(true);

    if (this.isEdit && this.data.user) {
      const id = this.data.user.id;
      this.service
        .update(id, {
          email: v.email,
          fullName: v.fullName || null,
          phoneNumber: v.phoneNumber || null,
          isActive: v.isActive,
          isLockedOut: v.isLockedOut,
        })
        .pipe(
          switchMap(() => this.service.assignRoles(id, { roleIds })),
          finalize(() => this.saving.set(false)),
        )
        .subscribe(() => this.done('updated'));
    } else {
      this.service
        .create({
          userName: v.userName,
          email: v.email,
          password: v.password,
          fullName: v.fullName || null,
          phoneNumber: v.phoneNumber || null,
          roleIds,
          clientId: this.showClient() ? v.clientId : null,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => this.done('created'));
    }
  }

  private done(verb: string): void {
    this.notify.success(`User ${verb} successfully.`);
    this.ref.close(true);
  }
}
