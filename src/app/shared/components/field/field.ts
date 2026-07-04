import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * shadcn / FLUX-style form field: a label above a projected native control,
 * with an inline error or hint below. Pair with a native input/select/textarea
 * carrying the `.rf-input` / `.rf-select` / `.rf-textarea` class and a
 * `formControlName`.
 *
 *   <app-field label="Customer Name" [control]="form.controls.name"
 *              error="Name is required." required>
 *     <input class="rf-input" formControlName="name" placeholder="e.g. Emma Wilson" />
 *   </app-field>
 */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rf-field">
      @if (label()) {
        <label class="rf-label" [attr.for]="for() || null">
          {{ label() }}@if (required()) {<span class="rf-req">*</span>}
        </label>
      }
      <div class="rf-control">
        <ng-content></ng-content>
      </div>
      @if (showError()) {
        <p class="rf-error">{{ error() }}</p>
      } @else if (hint()) {
        <p class="rf-hint">{{ hint() }}</p>
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input('');
  readonly hint = input('');
  /** Message shown when the bound control is invalid and touched/dirty. */
  readonly error = input('');
  readonly for = input('');
  readonly required = input(false, { transform: booleanAttribute });
  readonly control = input<AbstractControl | null>(null);

  protected readonly showError = computed(() => {
    const c = this.control();
    return !!this.error() && !!c && c.invalid && (c.touched || c.dirty);
  });
}
