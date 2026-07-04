import { SortDirection } from '../../../core/models/pagination.model';

export type ColumnType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'badge';

export type ChipVariant = 'success' | 'warn' | 'danger' | 'info';

export interface BadgeValue {
  label: string;
  variant: ChipVariant;
}

/** Declarative column definition consumed by the reusable DataTable. */
export interface ColumnDef<T = any> {
  /** Property key on the row (also the sort column sent to the API). */
  key: string;
  header: string;
  type?: ColumnType;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Custom cell text. Overrides default rendering for the column. */
  format?: (row: T) => string;
  /** For `type: 'badge'` — maps a row to a chip label + variant. */
  badge?: (row: T) => BadgeValue;
}

/** A row-level action button rendered in the trailing actions column. */
export interface RowAction<T = any> {
  id: string;
  icon: string;
  tooltip: string;
  color?: 'primary' | 'accent' | 'warn';
  /** Optional predicate to hide the action for specific rows. */
  visible?: (row: T) => boolean;
}

/** Emitted whenever paging/sorting/search changes — feed straight to the API. */
export interface TableQuery {
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
  search?: string;
}

export interface ActionEvent<T = any> {
  action: string;
  row: T;
}
