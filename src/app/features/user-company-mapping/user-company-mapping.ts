import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { UserCompanyMapping } from './user-company-mapping.model';
import { UserCompanyMappingService } from './user-company-mapping.service';

/**
 * User Company Mapping (Masters) — new-app version of the legacy screen. Maps a
 * user to many clients ("companies"). The list shows each user with their joined
 * client names; "Map User Company" opens a form: pick a user, tick the clients,
 * Submit. Edit opens the same form with the user's current clients pre-ticked.
 * Backed by usp_RF_UserCompanyMapping_* (Tpo_Mast_UserCompanyMapping).
 */
@Component({
  selector: 'app-user-company-mapping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './user-company-mapping.html',
  styleUrl: './user-company-mapping.scss',
})
export class UserCompanyMappingComponent implements OnInit {
  private readonly service = inject(UserCompanyMappingService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<UserCompanyMapping[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** true when editing an existing user's mapping (user selector is locked). */
  protected readonly editing = signal(false);

  // Dropdown / checkbox sources
  protected readonly userOptions = signal<SelectOption[]>([]);
  protected readonly clientOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterUserId = signal<string | null>(null);
  protected readonly filterClientId = signal<number | null>(null);

  // Map form state
  protected readonly formUserId = signal<string | null>(null);
  protected readonly formUserName = signal<string>('');
  protected readonly selectedClients = signal<Set<number>>(new Set());

  protected readonly total = computed(() => this.rows().length);

  ngOnInit(): void {
    this.service.getUserOptions().subscribe((o) => this.userOptions.set(o));
    this.service.getClientOptions().subscribe((o) => this.clientOptions.set(o));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterUserId(), this.filterClientId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterUser(userId: string | null): void {
    this.filterUserId.set(userId);
  }
  protected onFilterClient(clientId: number | null): void {
    this.filterClientId.set(clientId);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterUserId.set(null);
    this.filterClientId.set(null);
    this.load();
  }

  // --- Client checkbox list -------------------------------------------------
  protected isChecked(id: number): boolean {
    return this.selectedClients().has(id);
  }
  protected toggleClient(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedClients.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // --- Map form open / edit / close ----------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editing.set(false);
      this.formUserId.set(null);
      this.formUserName.set('');
      this.selectedClients.set(new Set());
      this.showForm.set(true);
    }
  }

  protected onFormUser(userId: string | null): void {
    this.formUserId.set(userId);
  }

  protected edit(row: UserCompanyMapping): void {
    this.editing.set(true);
    this.formUserId.set(row.userId);
    this.formUserName.set(row.userName || row.userId);
    this.selectedClients.set(new Set());
    this.showForm.set(true);
    this.service.getMappedClientIds(row.userId).subscribe((ids) => {
      this.selectedClients.set(new Set(ids));
    });
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editing.set(false);
    this.formUserId.set(null);
    this.formUserName.set('');
    this.selectedClients.set(new Set());
  }

  protected save(): void {
    const userId = this.formUserId();
    if (!userId) {
      this.notify.error('Select a user first.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.service
      .save({ userId, clientIds: [...this.selectedClients()] })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Mapping saved.');
        this.closeForm();
        this.load();
      });
  }
}
