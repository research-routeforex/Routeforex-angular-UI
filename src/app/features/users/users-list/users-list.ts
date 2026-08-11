import { DatePipe } from '@angular/common';
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
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { UsersService } from '../users.service';

interface ColumnFilters {
  userName: string;
  fullName: string;
  email: string;
  roles: string;
  status: string;
  lastLogin: string;
}

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(UsersService);
  private readonly dropdowns = inject(DropdownService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);

  /** null = form hidden (list only); 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);
  protected readonly isEditing = computed(() => (this.editingId() ?? 0) > 0);
  private editingUser: User | null = null;

  protected readonly pageSize = signal(20);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** Roles + Clients from USP_RF_BINDDROPDOWN (type=ROLES / type=Client). */
  protected readonly roleOptions = signal<SelectOption[]>([]);
  protected readonly clientOptions = signal<SelectOption[]>([]);

  /** Live mirror of the password for the strength checklist. */
  private readonly pwd = signal('');
  /** Live mirror of the selected role id (drives the Client field). */
  private readonly roleIdSig = signal<number | null>(null);
  /** Role name to preselect once the ROLES options resolve (edit). */
  private pendingRoleName: string | null = null;
  /** Client id to restore once the role is applied (edit) — see applyPendingRole. */
  private pendingClientId: number | null = null;

  /** Full user set (admin users are few); filtered + paged on the client. */
  private readonly allRows = signal<User[]>([]);

  protected readonly filters = signal<ColumnFilters>({
    userName: '',
    fullName: '',
    email: '',
    roles: '',
    status: '',
    lastLogin: '',
  });

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    confirmPassword: [''],
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
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.pwd.set(v ?? '');
        this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
      });

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
      if (this.pendingRoleName) this.applyPendingRole();
    });
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.load();
  }

  // --- Rows / filtering / paging --------------------------------------------
  protected readonly filtered = computed<User[]>(() => {
    const f = this.filters();
    return this.allRows().filter((u) => {
      const lastLogin = u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleString() : '';
      return (
        has(u.userName, f.userName) &&
        has(u.fullName, f.fullName) &&
        has(u.email, f.email) &&
        has(u.roles.join(', '), f.roles) &&
        has(this.statusLabel(u), f.status) &&
        has(lastLogin, f.lastLogin)
      );
    });
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<User[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  private load(): void {
    this.loading.set(true);
    this.service
      .getPaged({ pageNumber: 1, pageSize: 1000, search: null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((page) => {
        this.allRows.set(page.items);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected setFilter(key: keyof ColumnFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pageNumber.set(1);
  }
  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }
  protected first(): void {
    this.pageNumber.set(1);
  }
  protected prev(): void {
    this.pageNumber.update((n) => Math.max(1, n - 1));
  }
  protected next(): void {
    this.pageNumber.update((n) => Math.min(this.totalPages(), n + 1));
  }
  protected last(): void {
    this.pageNumber.set(this.totalPages());
  }

  protected statusLabel(u: User): string {
    return u.isLockedOut ? 'Locked' : u.isActive ? 'Active' : 'Inactive';
  }
  protected statusClass(u: User): string {
    return u.isLockedOut ? 'rf-chip--danger' : u.isActive ? 'rf-chip--success' : 'rf-chip--warn';
  }

  // --- Inline form ----------------------------------------------------------
  protected startAdd(): void {
    this.editingUser = null;
    this.pendingRoleName = null;
    this.form.reset({
      userName: '', email: '', password: '', confirmPassword: '', fullName: '', phoneNumber: '',
      roleId: null, clientId: null, isActive: true, isLockedOut: false,
    });
    this.form.controls.userName.enable();
    // Password is required (and must be strong) on create.
    this.form.controls.password.setValidators([Validators.required, CustomValidators.strongPassword(8)]);
    this.form.controls.confirmPassword.setValidators([Validators.required, this.matchPassword]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.confirmPassword.updateValueAndValidity();
    this.editingId.set(0);
  }

  protected startEdit(user: User): void {
    this.editingUser = user;
    this.form.reset({
      userName: user.userName, email: user.email, password: '', confirmPassword: '',
      fullName: user.fullName ?? '', phoneNumber: user.phoneNumber ?? '',
      roleId: null, clientId: null, isActive: user.isActive, isLockedOut: user.isLockedOut,
    });
    // No password change on edit.
    this.form.controls.password.clearValidators();
    this.form.controls.confirmPassword.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.confirmPassword.updateValueAndValidity();
    this.form.controls.userName.disable();
    // Preselect the user's role by name and their saved client once the options
    // are available (both dropdowns load async).
    this.pendingRoleName = user.roles[0] ?? null;
    this.pendingClientId = user.clientId ?? null;
    this.applyPendingRole();
    this.editingId.set(user.id);
  }

  private applyPendingRole(): void {
    const name = this.pendingRoleName;
    if (!name) return;
    const match = this.roleOptions().find(
      (o) => o.label.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (match) {
      this.form.controls.roleId.setValue(Number(match.value));
      this.pendingRoleName = null;
      // Restore the saved client AFTER the role is set: showClient() is now true,
      // so the clientId-clearing effect won't wipe it.
      if (this.pendingClientId != null) {
        this.form.controls.clientId.setValue(this.pendingClientId);
        this.pendingClientId = null;
      }
    }
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);

    if (this.isEditing() && this.editingUser) {
      const id = this.editingUser.id;
      this.service
        .update(id, {
          email: v.email,
          fullName: v.fullName || null,
          phoneNumber: v.phoneNumber || null,
          isActive: v.isActive,
          isLockedOut: v.isLockedOut,
          roleId: v.roleId,
          clientId: this.showClient() ? v.clientId : null,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => this.done('updated'));
    } else {
      this.service
        .create({
          userName: v.userName,
          email: v.email,
          password: v.password,
          fullName: v.fullName || null,
          phoneNumber: v.phoneNumber || null,
          roleId: v.roleId,
          clientId: this.showClient() ? v.clientId : null,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe(() => this.done('created'));
    }
  }

  private done(verb: string): void {
    this.notify.success(`User ${verb} successfully.`);
    this.editingId.set(null);
    this.load();
  }

  /** Cross-field: confirm-password must equal password (create only). */
  private matchPassword(control: AbstractControl): import('@angular/forms').ValidationErrors | null {
    const password = control.parent?.get('password')?.value;
    if (!control.value) return null;
    return password === control.value ? null : { mismatch: true };
  }

  protected remove(user: User): void {
    this.confirm
      .confirm({
        title: 'Delete user?',
        message: `Remove "${user.userName}"? This can be restored by an administrator.`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(user.id).subscribe(() => {
          this.notify.success('User deleted.');
          this.load();
        });
      });
  }
}

/** Case-insensitive "contains" for a column filter (empty term matches all). */
function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
