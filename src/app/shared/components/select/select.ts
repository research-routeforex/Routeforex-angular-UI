import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface SelectOption {
  value: unknown;
  label: string;
}

type OptionInput = string | SelectOption;

/**
 * FLUX-style searchable select / combobox. A bordered trigger (matching
 * `.rf-input`) opens a panel with a filter box and the option list. Implements
 * ControlValueAccessor, so it drops into reactive forms via `formControlName`
 * exactly like a native control.
 *
 *   <app-select formControlName="bank" [options]="banks" placeholder="Select bank" />
 *
 * Every dropdown shows a leading "Select" option that clears the control back to
 * null (the app-wide "no selection" convention). Turn it off with
 * `[nullable]="false"` for the rare control that must always hold a value.
 *
 * Keyboard-first: tabbing onto the trigger opens the panel and focuses the
 * filter box; type to filter, Up/Down move the highlight, Enter selects, Escape
 * closes, Tab moves on — no mouse required. Mouse click behaves identically.
 */
@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class SelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly options = input<OptionInput[]>([]);
  readonly placeholder = input('Select…');
  readonly searchable = input(true, { transform: booleanAttribute });
  readonly searchPlaceholder = input('Search…');
  /** Show a leading "Select" option that clears the control to null. On by default. */
  readonly nullable = input(true, { transform: booleanAttribute });
  /** Label of the null / clear option. */
  readonly nullLabel = input('Select');

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly open = signal(false);
  /** True when the panel opens above the trigger (not enough room below). */
  protected readonly dropUp = signal(false);
  protected readonly search = signal('');
  protected readonly value = signal<unknown>(null);
  protected readonly disabled = signal(false);
  /** Index into filtered() for the arrow-key highlight. */
  protected readonly highlighted = signal(0);

  /** Set when a pointer opened the panel, so the filter box is auto-focused. */
  private wantSearchFocus = false;
  /** True between mousedown and the resulting focus, so a click doesn't double-open. */
  private pointerFocus = false;
  /** Suppresses the trigger's open-on-focus when we return focus after a deliberate close. */
  private suppressReopen = false;

  /** The caller-supplied options, normalized to { value, label } (no null option). */
  protected readonly realOptions = computed<SelectOption[]>(() =>
    this.options().map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
  );

  /** The synthetic leading "Select" option (value = null). */
  private readonly nullOption = computed<SelectOption>(() => ({ value: null, label: this.nullLabel() }));

  protected readonly normalized = computed<SelectOption[]>(() =>
    this.nullable() ? [this.nullOption(), ...this.realOptions()] : this.realOptions(),
  );

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    // While filtering, match only the real options — the "Select" row is a clear
    // action, not something you search for.
    if (term) return this.realOptions().filter((o) => o.label.toLowerCase().includes(term));
    return this.normalized();
  });

  /** Trigger label — empty for the null value so the placeholder (muted) shows instead. */
  protected readonly selectedLabel = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || v === '') return '';
    return this.realOptions().find((o) => this.sameValue(o.value, v))?.label ?? '';
  });

  /** True when an option is the current value — tolerant of number-vs-string ids. */
  protected isSelected(optValue: unknown): boolean {
    return this.sameValue(optValue, this.value());
  }

  /** Loose value match: a stored id resolves whether it arrives as a number or a string. */
  private sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
  }

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Focus the filter box once the panel has rendered. Both pointer and keyboard
    // opens request this (see openPanel), so tabbing in lands the cursor in the
    // filter box; `onFocusOut` keeps Tab-out clean.
    effect(() => {
      if (this.open() && this.searchable() && this.wantSearchFocus) {
        this.wantSearchFocus = false;
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      }
    });
  }

  // --- Open / close ----------------------------------------------------------
  private openPanel(withSearchFocus: boolean): void {
    if (this.disabled()) return;
    this.wantSearchFocus = withSearchFocus;
    // Highlight the current value (or the first row) so Up/Down start from there.
    const sel = this.filtered().findIndex((o) => this.isSelected(o.value));
    this.highlighted.set(sel >= 0 ? sel : 0);
    this.dropUp.set(this.shouldDropUp());
    this.open.set(true);
  }

  /**
   * Open the panel upward when it wouldn't fit below the trigger inside the nearest
   * clipping ancestor (e.g. a scrollable dialog body) — otherwise the panel gets cut
   * off and its options can't be clicked. Falls back to the viewport bounds.
   */
  private shouldDropUp(): boolean {
    const trigger = this.trigger()?.nativeElement;
    if (!trigger) return false;
    const rect = trigger.getBoundingClientRect();
    // Only flip up when there's barely any room below (enough for the filter box +
    // a couple of options). Opening down and slightly overlapping the fields below
    // is fine and is the normal case — don't flip for it.
    const minSpaceBelow = 150;

    let top = 0;
    let bottom = window.innerHeight;
    let el = this.host.nativeElement.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') {
        const r = el.getBoundingClientRect();
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
      }
      el = el.parentElement;
    }

    const spaceBelow = bottom - rect.bottom;
    const spaceAbove = rect.top - top;
    return spaceBelow < minSpaceBelow && spaceAbove > spaceBelow;
  }

  private closePanel(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.search.set('');
    this.onTouched();
  }

  /** Trigger click (mouse): toggle, opening with the filter box focused. */
  protected toggle(event?: MouseEvent): void {
    // Ignore untrusted (synthetic) clicks. When app-select sits inside a <label>, the
    // label forwards an option-click as a synthetic click on this trigger (isTrusted =
    // false), which would re-open the panel we just closed. Real user clicks are trusted.
    if (event && !event.isTrusted) return;
    this.pointerFocus = false;
    if (this.open()) this.closePanel();
    else this.openPanel(true);
  }

  /** Mark that the next focus came from a pointer, so it doesn't also auto-open. */
  protected onTriggerPointer(): void {
    this.pointerFocus = true;
  }

  /**
   * Keyboard focus on the trigger (e.g. tabbing in) opens the panel AND focuses
   * the filter box — the same behaviour as a mouse click, so the dealer can type
   * to filter and use Up/Down immediately without reaching for the mouse.
   */
  protected onTriggerFocus(): void {
    if (this.suppressReopen) {
      this.suppressReopen = false; // we just returned focus here after a close/select
      return;
    }
    if (this.pointerFocus) {
      this.pointerFocus = false; // pointer path — let the click toggle instead
      return;
    }
    if (!this.open()) this.openPanel(true);
  }

  /** Close and hand focus back to the trigger without re-opening the panel. */
  private focusTrigger(): void {
    this.suppressReopen = true;
    this.trigger()?.nativeElement.focus();
    // Clear the guard even if focus() fired no event (trigger already focused).
    queueMicrotask(() => (this.suppressReopen = false));
  }

  protected selectOption(opt: SelectOption): void {
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.closePanel();
    // Return focus to the trigger so Tab continues to the next control (and a
    // keyboard Enter-select doesn't drop focus to <body>).
    this.focusTrigger();
  }

  // --- Keyboard --------------------------------------------------------------
  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
        event.preventDefault();
        this.openPanel(false);
      }
      return;
    }

    const opts = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlighted.update((i) => Math.min(i + 1, opts.length - 1));
        this.scrollHighlightIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlighted.update((i) => Math.max(i - 1, 0));
        this.scrollHighlightIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const opt = opts[this.highlighted()];
        if (opt) this.selectOption(opt);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closePanel();
        this.focusTrigger();
        break;
      // Tab is NOT closed here: the filter box may hold focus, and removing the
      // panel synchronously would drop the tab chain. Focus simply advances (the
      // filter box is the last focusable inside the host) and `onFocusOut` closes
      // the panel once focus lands on the next control.
    }
  }

  /**
   * Close the panel when focus leaves the whole component (e.g. Tab / Shift+Tab
   * to another control). Focus moving *within* the component — trigger ⇄ filter
   * box — keeps it open.
   */
  @HostListener('focusout', ['$event'])
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.open() && next && !this.host.nativeElement.contains(next)) {
      this.closePanel();
    }
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.highlighted.set(0); // filtered list changed — restart from the top
  }

  private scrollHighlightIntoView(): void {
    queueMicrotask(() => {
      this.host.nativeElement
        .querySelector('.sel__opt--highlighted')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }

  // --- ControlValueAccessor --------------------------------------------------
  writeValue(value: unknown): void {
    this.value.set(value);
  }
  registerOnChange(fn: (v: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
