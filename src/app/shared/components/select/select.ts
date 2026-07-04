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

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly value = signal<unknown>(null);
  protected readonly disabled = signal(false);

  protected readonly normalized = computed<SelectOption[]>(() =>
    this.options().map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
  );

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const opts = this.normalized();
    return term ? opts.filter((o) => o.label.toLowerCase().includes(term)) : opts;
  });

  protected readonly selectedLabel = computed(
    () => this.normalized().find((o) => o.value === this.value())?.label ?? '',
  );

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Focus the filter box as soon as the panel opens.
    effect(() => {
      if (this.open() && this.searchable()) {
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      }
    });
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((o) => !o);
    if (!this.open()) this.afterClose();
  }

  selectOption(opt: SelectOption): void {
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.open.set(false);
    this.afterClose();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.afterClose();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.open.set(false);
      this.afterClose();
    }
  }

  private afterClose(): void {
    this.search.set('');
    this.onTouched();
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
