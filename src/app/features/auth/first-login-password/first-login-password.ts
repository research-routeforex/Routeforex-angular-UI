import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';

/**
 * First-login forced password change. A user seeded with LastLoginDate = null is
 * routed here right after sign-in (see login + firstLoginGuard) to replace the
 * temporary credential with their own personal password before using the app.
 */
@Component({
  selector: 'app-first-login-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FieldComponent, MatButtonModule, MatIconModule],
  templateUrl: './first-login-password.html',
  styleUrl: '../reset-password/reset-password.scss',
})
export class FirstLoginPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly hideCurrent = signal(true);
  protected readonly hideNew = signal(true);
  protected readonly hideConfirm = signal(true);

  protected readonly userName = this.auth.user()?.userName ?? '';

  private readonly pwd = signal('');
  private readonly confirmPwd = signal('');

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, CustomValidators.strongPassword(8)]],
    confirmPassword: ['', [Validators.required, this.matchPassword]],
  });

  protected readonly ruleLen = computed(() => this.pwd().length >= 8);
  protected readonly ruleUpper = computed(() => /[A-Z]/.test(this.pwd()));
  protected readonly ruleLower = computed(() => /[a-z]/.test(this.pwd()));
  protected readonly ruleDigit = computed(() => /[0-9]/.test(this.pwd()));
  protected readonly passwordStrong = computed(
    () => this.pwd().length > 0 && this.ruleLen() && this.ruleUpper() && this.ruleLower() && this.ruleDigit(),
  );
  protected readonly confirmMatches = computed(
    () => this.confirmPwd().length > 0 && this.pwd() === this.confirmPwd(),
  );

  constructor() {
    this.form.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.pwd.set(v ?? '');
        this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
      });
    this.form.controls.confirmPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.confirmPwd.set(v ?? ''));
    // Clear a server-side "incorrect" error as soon as the user edits the field.
    this.form.controls.currentPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.currentPassword.hasError('server')) {
          this.form.controls.currentPassword.setErrors(null);
        }
      });
  }

  protected currentPasswordError(): string {
    const c = this.form.controls.currentPassword;
    return c.hasError('server') ? c.getError('server') : 'Current password is required.';
  }

  protected newPasswordError(): string {
    const c = this.form.controls.newPassword;
    if (c.hasError('server')) return c.getError('server');
    if (c.hasError('strongPassword')) return 'Password is not strong enough.';
    return 'New password is required.';
  }

  /** Cross-field: confirm-password must equal the new password. */
  private matchPassword(control: AbstractControl): ValidationErrors | null {
    const password = control.parent?.get('newPassword')?.value;
    if (!control.value) return null;
    return password === control.value ? null : { mismatch: true };
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.auth.clearMustChangePassword();
          this.notify.success('Password set. Welcome to RouteForex.');
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err: HttpErrorResponse) => this.applyServerErrors(err),
      });
  }

  /** Maps the API's field errors (422) onto the form, falling back to a toast. */
  private applyServerErrors(err: HttpErrorResponse): void {
    const body = err.error as ApiResponse<unknown> | undefined;
    const fieldErrors = body?.errors ?? null;
    let mapped = false;

    if (fieldErrors) {
      for (const [key, messages] of Object.entries(fieldErrors)) {
        const control =
          key.toLowerCase() === 'currentpassword'
            ? this.form.controls.currentPassword
            : key.toLowerCase() === 'newpassword'
              ? this.form.controls.newPassword
              : null;
        if (control) {
          control.setErrors({ server: messages[0] });
          control.markAsTouched();
          mapped = true;
        }
      }
    }

    if (!mapped) {
      this.notify.error(body?.message || 'Could not set your password. Please try again.');
    }
  }
}
