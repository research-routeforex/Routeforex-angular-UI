import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Date adapter that displays and parses dates as `dd-MMM-yyyy` (e.g. 09-Jun-2026),
 * regardless of locale. Provide it together with {@link DMY_DATE_FORMATS} on any
 * component that hosts a Material datepicker needing this format.
 */
@Injectable()
export class DmyDateAdapter extends NativeDateAdapter {
  /** Always render `dd-MMM-yyyy`; the month/year labels use the calendar defaults. */
  override format(date: Date, displayFormat: unknown): string {
    if (displayFormat === 'monthYearLabel') {
      return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    }
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
  }

  /** Accept `dd-MMM-yyyy` typed input, falling back to the native parser. */
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const m = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (m) {
        const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
        if (month >= 0) return new Date(+m[3], month, +m[1]);
      }
    }
    return super.parse(value);
  }
}

/** Date formats paired with {@link DmyDateAdapter} (`dd-MMM-yyyy`). */
export const DMY_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'DD-MMM-YYYY' },
  display: {
    dateInput: 'DD-MMM-YYYY',
    monthYearLabel: 'monthYearLabel',
    dateA11yLabel: 'DD-MMM-YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
