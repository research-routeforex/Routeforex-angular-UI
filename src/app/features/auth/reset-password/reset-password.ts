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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { CustomValidators } from '../../../shared/validators/custom-validators';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FieldComponent, MatButtonModule, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Raw token from the emailed link (?token=...). */
  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly hasToken = this.token.length > 0;

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);

  /** Live mirrors of the two password fields (signals drive the checklist + ticks). */
  private readonly pwd = signal('');
  private readonly confirmPwd = signal('');

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, CustomValidators.strongPassword(8)]],
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
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.pwd.set(v ?? '');
        this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
      });
    this.form.controls.confirmPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.confirmPwd.set(v ?? ''));
  }

  /** Cross-field: confirm-password must equal password. */
  private matchPassword(control: AbstractControl): ValidationErrors | null {
    const password = control.parent?.get('password')?.value;
    if (!control.value) return null;
    return password === control.value ? null : { mismatch: true };
  }

  submit(): void {
    if (this.form.invalid || this.submitting() || !this.hasToken) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth
      .resetPassword({ token: this.token, newPassword: this.form.getRawValue().password })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe(() => {
        this.done.set(true);
        this.notify.success('Password reset. Please sign in with your new password.');
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/auth/login');
  }
}
