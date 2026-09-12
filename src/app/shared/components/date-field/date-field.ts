import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  forwardRef,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../directives/open-datepicker-on-focus.directive';

/**
 * The single, reusable date control for the web app: the same `dd-MMM-yyyy`
 * Material datepicker used on FTP Order Entry — calendar opens on focus (keyboard
 * friendly) or click, branded `rf-datepicker` popup, calendar-toggle button.
 *
 * It is a `ControlValueAccessor` whose model value is a plain `yyyy-MM-dd` string
 * (empty string when blank), so it is a drop-in replacement for a native
 * `<input type="date">` — screens keep storing/submitting the same string value.
 *
 *   <app-date-field formControlName="onBoardDate" />                 (form field)
 *   <app-date-field variant="filter" (valueChange)="setFrom($event)" /> (grid filter)
 *
 * `variant="form"` (default) matches the `.rf-input` form look; `variant="filter"`
 * matches the compact white `.colfilter` look used inside coloured grid headers.
 */
@Component({
  selector: 'app-date-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDatepickerModule, OpenDatepickerOnFocusDirective],
  // dd-MMM-yyyy datepicker, scoped to this control so hosts need no providers.
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div class="df-wrap" [class.df-wrap--filter]="variant() === 'filter'" (click)="picker.open()">
      <input
        [class]="inputClass()"
        [formControl]="dateCtrl"
        [matDatepicker]="picker"
        [appOpenOnFocus]="picker"
        [placeholder]="placeholder()"
        readonly
      />
      @if (showToggle()) {
        <mat-datepicker-toggle class="df-toggle" [for]="picker" />
      }
      <mat-datepicker #picker panelClass="rf-datepicker" />
    </div>
  `,
  styles: [
    `
      .df-wrap {
        position: relative;
        display: block;
      }
      .df-wrap .rf-input {
        width: 100%;
        padding-right: 38px;
        cursor: pointer;
      }
      /* Compact inline variant (no toggle): normal padding, 28px row height. */
      .df-wrap .rf-input.df-input--compact {
        height: 28px;
        padding: 2px 8px;
        font-size: 12px;
      }
      .df-toggle {
        position: absolute;
        top: 50%;
        right: 2px;
        transform: translateY(-50%);
        color: var(--rf-muted-fg);
      }
      .df-toggle :is(button, .mat-mdc-icon-button) {
        width: 34px;
        height: 34px;
        padding: 0;
      }
      .df-toggle .mat-mdc-button-touch-target {
        width: 34px;
        height: 34px;
      }

      /* Compact white variant for coloured grid header filter rows. */
      .df-input--filter {
        display: block;
        width: 100%;
        min-width: 80px;
        height: 28px;
        padding: 2px 9px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.16);
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
        color: #fff;
        outline: none;
        cursor: pointer;
      }
      .df-input--filter::placeholder {
        color: rgba(255, 255, 255, 0.75);
        font-weight: 400;
      }
      .df-input--filter:focus {
        background: #fff;
        color: var(--mat-sys-on-surface);
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.45);
      }
    `,
  ],
})
export class DateFieldComponent implements ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);

  /** `form` (default) = `.rf-input` look; `filter` = compact `.colfilter` look. */
  readonly variant = input<'form' | 'filter'>('form');
  /** Shrinks the `form` variant to a 28px inline height and drops the toggle. */
  readonly compact = input(false, { transform: booleanAttribute });
  readonly placeholder = input('dd-MMM-yyyy');

  /** Class applied to the inner input for the current variant. */
  protected inputClass(): string {
    if (this.variant() === 'filter') return 'df-input df-input--filter';
    return this.compact() ? 'rf-input df-input--compact' : 'rf-input';
  }
  /** Toggle button only for the roomy `form` variant. */
  protected showToggle(): boolean {
    return this.variant() === 'form' && !this.compact();
  }

  /** Emits the selected date as a `yyyy-MM-dd` string ('' when cleared). */
  readonly valueChange = output<string>();

  /** Internal control the Material datepicker binds to (holds a `Date`). */
  protected readonly dateCtrl = new FormControl<Date | null>(null);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private writing = false;

  constructor() {
    this.dateCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((date) => {
      if (this.writing) return;
      const value = toIsoDate(date);
      this.onChange(value);
      this.onTouched();
      this.valueChange.emit(value);
    });
  }

  writeValue(value: unknown): void {
    this.writing = true;
    this.dateCtrl.setValue(parseIsoDate(value), { emitEvent: false });
    this.writing = false;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.dateCtrl.disable({ emitEvent: false }) : this.dateCtrl.enable({ emitEvent: false });
  }
}

/** Format a Date as local `yyyy-MM-dd`; '' when null. */
function toIsoDate(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a `yyyy-MM-dd` (or ISO datetime) model value into a local Date. */
function parseIsoDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}
