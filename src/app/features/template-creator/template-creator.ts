import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../shared/directives/open-datepicker-on-focus.directive';
import {
  Alignment,
  AutoLink,
  Autoformat,
  Base64UploadAdapter,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  type EditorConfig,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  Highlight,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  Indent,
  IndentBlock,
  Italic,
  Link,
  LinkImage,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SourceEditing,
  SpecialCharacters,
  SpecialCharactersEssentials,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TodoList,
  Underline,
} from 'ckeditor5';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { Template } from './template-creator.model';
import { TemplateCreatorService } from './template-creator.service';

// CKEditor 5 styles are loaded globally via angular.json "styles" (not a lazy
// component import) so the toolbar renders correctly in production builds too —
// a lazy-chunk CSS import mis-orders @layer precedence and blows up the icons.

@Component({
  selector: 'app-template-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    CKEditorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
    DatePipe,
  ],
  // dd-MMM-yyyy datepicker (same as FTP Order Entry), scoped to this screen.
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './template-creator.html',
  styleUrl: './template-creator.scss',
})
export class TemplateCreatorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TemplateCreatorService);
  private readonly notify = inject(NotificationService);

  /** CKEditor build + full toolbar (all open-source controls). */
  protected readonly Editor = ClassicEditor;
  protected readonly editorConfig: EditorConfig = {
    licenseKey: 'GPL',
    plugins: [
      Essentials, Autoformat, Paragraph, Heading,
      Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Code, RemoveFormat,
      FontFamily, FontSize, FontColor, FontBackgroundColor, Highlight,
      Alignment,
      List, ListProperties, TodoList, Indent, IndentBlock, BlockQuote,
      Link, AutoLink, LinkImage,
      Image, ImageCaption, ImageStyle, ImageToolbar, ImageResize, ImageInsert, Base64UploadAdapter,
      Table, TableToolbar, TableProperties, TableCellProperties, TableColumnResize,
      MediaEmbed, HorizontalLine, SpecialCharacters, SpecialCharactersEssentials,
      SourceEditing, PasteFromOffice, GeneralHtmlSupport,
    ],
    toolbar: {
      items: [
        'sourceEditing', '|',
        'undo', 'redo', '|',
        'heading', '|',
        'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'code', 'removeFormat', '|',
        'highlight', 'link', 'insertImage', 'insertTable', 'mediaEmbed', 'blockQuote', 'horizontalLine', 'specialCharacters', '|',
        'alignment', '|',
        'bulletedList', 'numberedList', 'todoList', 'outdent', 'indent',
      ],
    },
    image: {
      toolbar: ['imageTextAlternative', 'toggleImageCaption', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'],
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
    },
    // Preserve any HTML that isn't modelled by a specific plugin (legacy templates).
    htmlSupport: { allow: [{ name: /.*/, attributes: true, classes: true, styles: true }] },
  };

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<Template[]>([]);

  /** null = form hidden (list only); 0 = creating a new template; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: 1, label: 'Active' },
    { value: 0, label: 'Inactive' },
  ];
  /** Populated from the API (usp_RF_Template_ResearchTypes / _Images). */
  protected readonly researchTypeOptions = signal<SelectOption[]>([]);
  protected readonly imageOptions = signal<SelectOption[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    templateId: [0],
    displayName: ['', [Validators.required, Validators.maxLength(1000)]],
    activeStatus: [1],
    researchType: ['D', [Validators.required]],
    imageName: [null as string | null],
    // "Report Date" — Material datepicker (dd-MMM-yyyy); persisted to CreatedDatetime.
    reportDate: this.fb.control<Date | null>(new Date(), { validators: [Validators.required] }),
    content: ['', [Validators.required]],
  });

  /** Date → yyyy-MM-dd (ISO date the backend's DateTime binder accepts). */
  private toIsoDate(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ---- List (search + pagination) -------------------------------------------
  protected readonly nameFilter = signal('');
  protected readonly statusFilter = signal('');
  protected readonly researchTypeFilter = signal('');
  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filtered = computed<Template[]>(() => {
    const name = this.nameFilter().trim().toLowerCase();
    const status = this.statusFilter().trim().toLowerCase();
    const type = this.researchTypeFilter().trim().toLowerCase();
    return this.allRows().filter(
      (r) =>
        (!name ||
          (r.displayName ?? '').toLowerCase().includes(name) ||
          (r.fileName ?? '').toLowerCase().includes(name)) &&
        (!status || this.statusLabel(r).toLowerCase().includes(status)) &&
        (!type || (r.researchType ?? '').toLowerCase().includes(type)),
    );
  });
  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<Template[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.load();
    this.service
      .getResearchTypes()
      .subscribe((opts) =>
        this.researchTypeOptions.set(opts.map((o) => ({ value: o.value, label: o.text }))),
      );
    this.service
      .getImages()
      .subscribe((opts) => this.imageOptions.set(opts.map((o) => ({ value: o.value, label: o.text }))));
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getTemplates()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected statusLabel(row: Template): string {
    return row.activeStatus === 1 ? 'Active' : 'Inactive';
  }

  /** Open a blank add form. */
  protected newTemplate(): void {
    this.form.reset({
      templateId: 0,
      displayName: '',
      activeStatus: 1,
      researchType: 'D',
      imageName: null,
      reportDate: new Date(),
      content: '',
    });
    this.editingId.set(0);
  }

  /** Close the form and return to the list. */
  protected closeForm(): void {
    this.editingId.set(null);
  }

  protected edit(row: Template): void {
    this.service.getTemplate(row.templateId).subscribe((detail) => {
      this.form.reset({
        templateId: detail.templateId,
        displayName: detail.displayName ?? '',
        activeStatus: detail.activeStatus,
        researchType: detail.researchType ?? 'D',
        imageName: detail.imageName ?? null,
        reportDate: detail.createdDatetime ? new Date(detail.createdDatetime) : new Date(),
        content: detail.content ?? '',
      });
      this.editingId.set(detail.templateId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Enter a template name and body.');
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .save({
        templateId: v.templateId,
        displayName: v.displayName,
        content: v.content,
        activeStatus: Number(v.activeStatus),
        researchType: v.researchType,
        imageName: v.imageName,
        reportDate: this.toIsoDate(v.reportDate),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Template saved.');
        this.closeForm();
        this.load();
      });
  }

  // ---- List paging / filtering ----------------------------------------------
  protected setNameFilter(value: string): void {
    this.nameFilter.set(value);
    this.pageNumber.set(1);
  }
  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.pageNumber.set(1);
  }
  protected setResearchTypeFilter(value: string): void {
    this.researchTypeFilter.set(value);
    this.pageNumber.set(1);
  }
  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }
  protected first(): void {
    this.pageNumber.set(1);
  }
  protected prev(): void {
    this.pageNumber.update((n) => Math.max(1, n - 1));
  }
  protected next(): void {
    this.pageNumber.update((n) => Math.min(this.totalPages(), n + 1));
  }
  protected last(): void {
    this.pageNumber.set(this.totalPages());
  }
}
