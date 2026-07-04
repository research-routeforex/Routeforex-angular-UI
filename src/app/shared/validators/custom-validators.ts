import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Reusable, framework-agnostic reactive-form validators. */
export class CustomValidators {
  /** Rejects values that are only whitespace. */
  static notBlank(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value == null || value === '') return null;
    return String(value).trim().length === 0 ? { notBlank: true } : null;
  }

  /** Strong-ish password: min length, upper, lower and a digit. */
  static strongPassword(min = 8): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '');
      if (!value) return null;
      const errors: Record<string, boolean> = {};
      if (value.length < min) errors['minlength'] = true;
      if (!/[A-Z]/.test(value)) errors['upper'] = true;
      if (!/[a-z]/.test(value)) errors['lower'] = true;
      if (!/[0-9]/.test(value)) errors['digit'] = true;
      return Object.keys(errors).length ? { strongPassword: errors } : null;
    };
  }

  /** Cross-field: confirms two controls match (apply to the form group). */
  static matchFields(field: string, confirmField: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const a = group.get(field)?.value;
      const b = group.get(confirmField)?.value;
      return a === b ? null : { fieldsMismatch: true };
    };
  }

  /** Allows only A–Z, 0–9, dash and underscore (typical for codes). */
  static code(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    if (!value) return null;
    return /^[A-Za-z0-9_-]+$/.test(value) ? null : { code: true };
  }
}
