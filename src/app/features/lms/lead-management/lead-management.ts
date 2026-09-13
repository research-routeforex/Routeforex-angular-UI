import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../../shared/directives/open-datepicker-on-focus.directive';
import { LmsLead } from './lead-management.model';
import { LeadManagementService } from './lead-management.service';

const opts = (...values: string[]): SelectOption[] => values.map((v) => ({ value: v, label: v }));

const LEVEL_OPTIONS = opts('Initial', 'Follow up', 'Final');
const ATTENDED_BY_OPTIONS: SelectOption[] = [
  { value: 'Self', label: 'Self' },
  { value: 'joint Meeting', label: 'Joint Meeting' },
];
const AUDIT_OPTIONS = opts('Yes', 'No');
const CATEGORY_OPTIONS = opts('Hot', 'Cold', 'Warm', 'Not Interested');
const LEAD_SOURCE_OPTIONS = opts('Reference', 'Owned', 'Company Data');
const NEXT_LEVEL_OPTIONS = opts(
  'Need to Call',
  'Need to send Proposal',
  'Need to meet again',
  'Follow up for Closure',
);

/**
 * LMS — Lead Management. New-app rewrite of the legacy screen. Records lead
 * touch-points (meetings) per LMS client; add + edit + read-only view, plus an
 * Export-to-Excel of the current list. "Attended With" shows only for a joint
 * meeting. Backed by usp_RF_LMSLead_* (TPO_LMS_LeadManagement).
 */
@Component({
  selector: 'app-lms-lead-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './lead-management.html',
  styleUrl: './lead-management.scss',
})
export class LeadManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LeadManagementService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<LmsLead[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that ID. */
  protected readonly editingId = signal(0);
  /** true = read-only view (fields disabled, no submit). */
  protected readonly viewing = signal(false);

  protected readonly levelOptions = LEVEL_OPTIONS;
  protected readonly attendedByOptions = ATTENDED_BY_OPTIONS;
  protected readonly auditOptions = AUDIT_OPTIONS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly leadSourceOptions = LEAD_SOURCE_OPTIONS;
  protected readonly nextLevelOptions = NEXT_LEVEL_OPTIONS;
  protected readonly clientOptions = signal<SelectOption[]>([]);

  protected readonly filterText = signal('');
  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    clientID: this.fb.control<number | null>(null, [Validators.required]),
    levelofMeeting: this.fb.control<string | null>(null),
    agenda: this.fb.control<string | null>(null),
    attendedBy: this.fb.control<string | null>(null, [Validators.required]),
    attendedWith: this.fb.control<string | null>(null),
    auditDone: this.fb.control<string | null>(null),
    auditOutcome: this.fb.control<string | null>(null),
    category: this.fb.control<string | null>(null),
    leadSource: this.fb.control<string | null>(null),
    callReport: this.fb.control<string | null>(null),
    nextLevelofMeeting: this.fb.control<string | null>(null),
    nlmDate: this.fb.control<Date | null>(null),
  });

  // Signal mirror of the attendedBy control, driving showAttendedWith.
  private readonly attendedBy = signal<string | null>(null);
  /** "Attended With" is only relevant for a joint meeting. */
  protected readonly showAttendedWith = computed(() => this.attendedBy() === 'joint Meeting');

  ngOnInit(): void {
    this.service.getClientOptions().subscribe((o) => this.clientOptions.set(o));
    this.form.controls.attendedBy.valueChanges.subscribe((v) => this.attendedBy.set(v));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterText() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterText(value: string): void {
    this.filterText.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterText.set('');
    this.load();
  }

  // --- Add / edit / view ----------------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.resetForm();
      this.showForm.set(true);
    }
  }

  protected edit(row: LmsLead): void {
    this.openRow(row, false);
  }
  protected view(row: LmsLead): void {
    this.openRow(row, true);
  }

  private openRow(row: LmsLead, readOnly: boolean): void {
    this.viewing.set(readOnly);
    this.editingId.set(row.id);
    this.form.enable({ emitEvent: false });
    this.form.reset({
      clientID: row.clientID ?? null,
      levelofMeeting: row.levelofMeeting ?? null,
      agenda: row.agenda ?? null,
      attendedBy: row.attendedBy ?? null,
      attendedWith: row.attendedWith ?? null,
      auditDone: row.auditDone ?? null,
      auditOutcome: row.auditOutcome ?? null,
      category: row.category ?? null,
      leadSource: row.leadSource ?? null,
      callReport: row.callReport ?? null,
      nextLevelofMeeting: row.nextLevelofMeeting ?? null,
      nlmDate: row.nlmDate ? new Date(row.nlmDate) : null,
    });
    this.attendedBy.set(row.attendedBy ?? null);
    if (readOnly) this.form.disable({ emitEvent: false });
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.viewing.set(false);
    this.form.enable({ emitEvent: false });
    this.form.reset({
      clientID: null,
      levelofMeeting: null,
      agenda: null,
      attendedBy: null,
      attendedWith: null,
      auditDone: null,
      auditOutcome: null,
      category: null,
      leadSource: null,
      callReport: null,
      nextLevelofMeeting: null,
      nlmDate: null,
    });
    this.attendedBy.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  protected save(): void {
    if (this.viewing()) return;
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    const editing = this.editingId() > 0;
    this.service
      .save({
        id: this.editingId(),
        clientID: v.clientID,
        levelofMeeting: v.levelofMeeting,
        agenda: v.agenda,
        attendedBy: v.attendedBy,
        // Clear "Attended With" when it's not a joint meeting.
        attendedWith: v.attendedBy === 'joint Meeting' ? v.attendedWith : null,
        auditDone: v.auditDone,
        auditOutcome: v.auditOutcome,
        category: v.category,
        leadSource: v.leadSource,
        callReport: v.callReport,
        nextLevelofMeeting: v.nextLevelofMeeting,
        nlmDate: this.toIsoDate(v.nlmDate),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Lead updated.' : 'Lead added.');
        this.closeForm();
        this.load();
      });
  }

  // --- Export ---------------------------------------------------------------
  /** Download the current list as an Excel (.xls) file (HTML-table format). */
  protected exportExcel(): void {
    const list = this.rows();
    if (list.length === 0) {
      this.notify.error('Nothing to export.');
      return;
    }
    const headers = [
      'S.No.', 'Client Name', 'Level of Meeting', 'Agenda', 'Attended By', 'Attended With',
      'Audit Done', 'Audit Outcome', 'Category', 'Lead Source', 'Next Level of Meeting',
      'Date', 'Call Report',
    ];
    const esc = (v: unknown): string =>
      String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const date = (v: string | null): string => (v ? new Date(v).toLocaleDateString('en-GB') : '');

    const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
    const body = list
      .map((r, i) => {
        const cells = [
          i + 1, r.clientName, r.levelofMeeting, r.agenda, r.attendedBy, r.attendedWith,
          r.auditDone, r.auditOutcome, r.category, r.leadSource, r.nextLevelofMeeting,
          date(r.nlmDate), r.callReport,
        ];
        return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
      })
      .join('');

    const html =
      `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head>` +
      `<body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LeadManagement_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Date -> "yyyy-MM-dd" (local, no timezone shift) for the API. */
  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
