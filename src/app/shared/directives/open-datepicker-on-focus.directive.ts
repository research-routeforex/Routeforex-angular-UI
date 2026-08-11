import { DestroyRef, Directive, HostListener, inject, input, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDatepicker } from '@angular/material/datepicker';

/**
 * Opens a Material datepicker calendar when its input is focused (e.g. by tabbing
 * in), so a date can be chosen with the arrow keys — no mouse required.
 *
 *   <input [matDatepicker]="d" [appOpenOnFocus]="d" … />
 *   <mat-datepicker #d />
 *
 * The calendar restores focus to the input when it closes; that would retrigger
 * `focus` and reopen it forever, so a short guard after `closedStream` swallows
 * exactly that follow-up focus.
 */
@Directive({
  selector: '[appOpenOnFocus]',
})
export class OpenDatepickerOnFocusDirective implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  /** The <mat-datepicker> to open when the host input gains focus. */
  readonly picker = input.required<MatDatepicker<unknown>>({ alias: 'appOpenOnFocus' });

  private suppress = false;
  private suppressTimer?: ReturnType<typeof setTimeout>;
  private subscribedTo?: MatDatepicker<unknown>;

  @HostListener('focus')
  protected onFocus(): void {
    const picker = this.picker();
    this.ensureCloseGuard(picker);
    if (this.suppress || picker.opened) return;
    picker.open();
  }

  /** Subscribe once to the picker's close stream to arm the reopen guard. */
  private ensureCloseGuard(picker: MatDatepicker<unknown>): void {
    if (this.subscribedTo === picker) return;
    this.subscribedTo = picker;
    picker.closedStream.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.suppress = true;
      clearTimeout(this.suppressTimer);
      this.suppressTimer = setTimeout(() => (this.suppress = false), 250);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.suppressTimer);
  }
}
