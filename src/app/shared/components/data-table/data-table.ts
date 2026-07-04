import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Sort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SortDirection } from '../../../core/models/pagination.model';
import { EmptyStateComponent } from '../empty-state/empty-state';
import {
  ActionEvent,
  ChipVariant,
  ColumnDef,
  RowAction,
  TableQuery,
} from './data-table.models';

type Row = Record<string, any>;
type RowInput = readonly any[];

/**
 * Generic, server-driven data table. The host owns the data; this component owns
 * paging/sorting/search UI and emits a single `queryChange` describing the
 * desired slice — wire that straight into a CRUD service's `getPaged`.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
})
export class DataTableComponent implements OnDestroy {
  // --- Inputs --------------------------------------------------------------
  readonly columns = input.required<ColumnDef[]>();
  readonly rows = input<RowInput>([]);
  readonly total = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly title = input<string>('');
  readonly searchable = input<boolean>(true);
  readonly searchPlaceholder = input<string>('Search…');
  readonly actions = input<RowAction[]>([]);
  readonly pageSizeOptions = input<number[]>(environment.pageSizeOptions);
  readonly emptyMessage = input<string>('No records found.');

  // --- Outputs -------------------------------------------------------------
  readonly queryChange = output<TableQuery>();
  readonly action = output<ActionEvent>();

  // --- Internal state ------------------------------------------------------
  private readonly pageNumber = signal(1);
  private readonly pageSize = signal(environment.defaultPageSize);
  private readonly sortColumn = signal<string | undefined>(undefined);
  private readonly sortDirection = signal<SortDirection | undefined>(undefined);
  protected readonly search = signal('');

  private readonly searchInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  protected readonly displayedColumns = computed(() => {
    const keys = this.columns().map((c) => c.key);
    return this.actions().length ? [...keys, '__actions'] : keys;
  });

  constructor() {
    this.searchInput$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.search.set(term);
        this.pageNumber.set(1);
        this.emit();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.direction ? sort.active : undefined);
    this.sortDirection.set(
      sort.direction === 'asc' ? 'Asc' : sort.direction === 'desc' ? 'Desc' : undefined,
    );
    this.emit();
  }

  onPage(event: PageEvent): void {
    this.pageNumber.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.emit();
  }

  onSearch(value: string): void {
    this.searchInput$.next(value);
  }

  onAction(actionId: string, row: Row): void {
    this.action.emit({ action: actionId, row });
  }

  /** Public hook so a host can re-emit the current query (e.g. after a delete). */
  reload(): void {
    this.emit();
  }

  protected cellText(col: ColumnDef, row: Row): string {
    if (col.format) return col.format(row);
    const value = row[col.key];
    if (value === null || value === undefined || value === '') return '—';
    switch (col.type) {
      case 'date':
        return formatDmy(value);
      case 'datetime':
        return formatDmy(value, true);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  protected badgeFor(col: ColumnDef, row: Row): { label: string; variant: ChipVariant } {
    return col.badge
      ? col.badge(row)
      : { label: this.cellText(col, row), variant: 'info' };
  }

  protected actionVisible(act: RowAction, row: Row): boolean {
    return act.visible ? act.visible(row) : true;
  }

  private emit(): void {
    this.queryChange.emit({
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
      search: this.search() || undefined,
    });
  }
}

/** Format a value as dd-MMM-yyyy (the project-wide date format), optionally with time. */
function formatDmy(value: unknown, withTime = false): string {
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  let out = `${day}-${month}-${d.getFullYear()}`;
  if (withTime) {
    out += ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return out;
}
