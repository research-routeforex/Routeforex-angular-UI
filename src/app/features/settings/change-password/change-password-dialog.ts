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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';

@Component({
  selector: 'app-change-password-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, FieldComponent],
  templateUrl: './change-password-dialog.html',
  styleUrl: './change-password-dialog.scss',
})
export class ChangePasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<ChangePasswordDialogComponent, boolean>);

  protected readonly saving = signal(false);
  protected readonly hideCurrent = signal(true);
  protected readonly hideNew = signal(true);
  protected readonly hideConfirm = signal(true);

  /** Live mirrors driving the strength checklist + confirm tick (signals, so computeds react). */
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

  /** Error text for the current-password field (server message takes precedence). */
  protected currentPasswordError(): string {
    const c = this.form.controls.currentPassword;
    return c.hasError('server') ? c.getError('server') : 'Current password is required.';
  }

  /** Error text for the new-password field. */
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

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.auth
      .changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notify.success('Your password has been changed.');
          this.ref.close(true);
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
      this.notify.error(body?.message || 'Could not change your password. Please try again.');
    }
  }
}
