import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, Observable } from 'rxjs';
import { Role } from '../../../core/models/role.model';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { RolesService } from '../roles.service';

interface ColumnFilters {
  name: string;
  description: string;
  status: string;
}

/**
 * Roles administration, in the standard master layout: hero header, inline
 * add/edit form and a searchable, paged grid (client-side over the cached list).
 */
@Component({
  selector: 'app-roles-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
})
export class RolesListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RolesService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<Role[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: true, label: 'Active' },
    { value: false, label: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required, CustomValidators.notBlank, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(250)]],
    isActive: [true],
  });

  protected readonly filters = signal<ColumnFilters>({ name: '', description: '', status: '' });

  protected readonly filtered = computed<Role[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.name, f.name) &&
        has(r.description, f.description) &&
        has(r.isActive ? 'Active' : 'Inactive', f.status),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<Role[]>(() => {
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
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((roles) => {
        this.allRows.set(roles);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected setFilter(key: keyof ColumnFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
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

  protected startAdd(): void {
    this.form.reset({ id: 0, name: '', description: '', isActive: true });
    this.editingId.set(0);
  }

  protected startEdit(row: Role): void {
    this.form.reset({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      isActive: row.isActive,
    });
    this.editingId.set(row.id);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const editing = (this.editingId() ?? 0) > 0;

    const request$: Observable<unknown> = editing
      ? this.service.update(v.id, {
          name: v.name,
          description: v.description || null,
          isActive: v.isActive,
        })
      : this.service.create({ name: v.name, description: v.description || null });

    request$.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notify.success(`Role ${editing ? 'updated' : 'created'}.`);
      this.editingId.set(null);
      this.load();
    });
  }

  protected remove(row: Role): void {
    this.confirm
      .confirm({
        title: 'Delete role?',
        message: `Remove "${row.name}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(row.id).subscribe(() => {
          this.notify.success('Role deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
