import { EnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';

/** Native <input> types whose picker we can open programmatically. */
const PICKER_INPUT_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);

/**
 * Keyboard-first native pickers.
 *
 * When a native `<select>` or a native date/time `<input>` gains focus **via the
 * keyboard** (e.g. tabbing from the previous field), its picker is opened
 * automatically so the value can be chosen with the Up/Down arrow keys — no mouse
 * required. Mouse focus is left alone (a click already opens the control).
 *
 * Uses the standard `HTMLElement.showPicker()` API and fails open: on browsers
 * without it the call is ignored and native arrow-key selection still works once
 * the control is focused.
 *
 * Registered once at bootstrap via a single delegated `focusin` listener, so it
 * covers every form in the app — current and future — with no per-component code.
 */
export function provideKeyboardPickers(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    if (typeof document === 'undefined') return;

    // Track the last interaction modality so we only auto-open on keyboard focus,
    // never fighting a mouse user (whose click opens the control already).
    let viaKeyboard = false;
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Tab') viaKeyboard = true;
      },
      true,
    );
    document.addEventListener('pointerdown', () => (viaKeyboard = false), true);

    document.addEventListener('focusin', (event) => {
      if (!viaKeyboard) return;

      const el = event.target;
      const isSelect = el instanceof HTMLSelectElement;
      const isPickerInput = el instanceof HTMLInputElement && PICKER_INPUT_TYPES.has(el.type);
      if (!isSelect && !isPickerInput) return;

      const control = el as HTMLSelectElement | HTMLInputElement;
      if (control.disabled || (control as HTMLInputElement).readOnly) return;

      // showPicker() requires transient user activation; the Tab keydown that moved
      // focus here provides it. Guard for unsupported browsers / missing activation.
      try {
        (control as unknown as { showPicker?: () => void }).showPicker?.();
      } catch {
        /* not supported or no activation — arrow-key selection still works */
      }
    });
  });
}
