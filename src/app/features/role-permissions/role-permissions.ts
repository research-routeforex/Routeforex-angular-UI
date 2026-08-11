import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { PermModule, PermScreen } from './role-permissions.model';
import { RolePermissionService } from './role-permissions.service';

@Component({
  selector: 'app-role-permissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, SelectComponent, MatButtonModule, MatIconModule],
  templateUrl: './role-permissions.html',
  styleUrl: './role-permissions.scss',
})
export class RolePermissionsComponent implements OnInit {
  private readonly service = inject(RolePermissionService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly roleOptions = signal<SelectOption[]>([]);
  protected readonly selectedRole = signal<number | null>(null);

  protected readonly modules = signal<PermModule[]>([]);
  private readonly screens = signal<PermScreen[]>([]);

  /** Currently granted screen ids (editable). */
  protected readonly granted = signal<ReadonlySet<number>>(new Set());
  /** Module whose screens are shown in the third card. */
  protected readonly activeModuleId = signal<number | null>(null);

  protected readonly hasRole = computed(() => this.selectedRole() != null);

  /** Screens of the active module (third card). */
  protected readonly activeScreens = computed<PermScreen[]>(() => {
    const id = this.activeModuleId();
    return id == null ? [] : this.screensOf(id);
  });
  protected readonly activeModuleName = computed(
    () => this.modules().find((m) => m.moduleId === this.activeModuleId())?.moduleName ?? '',
  );

  ngOnInit(): void {
    this.loadTree();
    // Role list comes from the user-category master (TPO_UGMT_UserCategory) via the
    // common dropdown, matching the Users screen's role model.
    this.dropdowns.get('ROLES').subscribe((opts) => this.roleOptions.set(opts));
  }

  private loadTree(): void {
    this.loading.set(true);
    this.service
      .getTree()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((tree) => {
        this.modules.set(tree.modules);
        this.screens.set(tree.screens);
      });
  }

  protected screensOf(moduleId: number): PermScreen[] {
    return this.screens().filter((s) => s.moduleId === moduleId);
  }

  // ---- Role selection -------------------------------------------------------
  protected selectRole(value: number | string | null): void {
    const id = value == null || value === '' ? null : Number(value);
    this.selectedRole.set(id);
    this.activeModuleId.set(null);
    this.granted.set(new Set());
    if (id == null) return;
    this.service.getByRole(id).subscribe((ids) => this.granted.set(new Set(ids)));
  }

  // ---- Module card ----------------------------------------------------------
  private grantedCountForModule(moduleId: number): number {
    const g = this.granted();
    return this.screensOf(moduleId).reduce((n, s) => n + (g.has(s.screenId) ? 1 : 0), 0);
  }
  protected moduleChecked(moduleId: number): boolean {
    const total = this.screensOf(moduleId).length;
    return total > 0 && this.grantedCountForModule(moduleId) === total;
  }
  protected moduleIndeterminate(moduleId: number): boolean {
    const count = this.grantedCountForModule(moduleId);
    return count > 0 && count < this.screensOf(moduleId).length;
  }

  /** Click a module: show its screens and, if none are granted yet, select all (default). */
  protected selectModule(m: PermModule): void {
    this.activeModuleId.set(m.moduleId);
    if (this.grantedCountForModule(m.moduleId) === 0) this.setModule(m.moduleId, true);
  }

  /** Module checkbox: grant/revoke every screen in the module. */
  protected toggleModule(m: PermModule, checked: boolean): void {
    this.activeModuleId.set(m.moduleId);
    this.setModule(m.moduleId, checked);
  }

  private setModule(moduleId: number, on: boolean): void {
    const ids = this.screensOf(moduleId).map((s) => s.screenId);
    this.granted.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  // ---- Screen card ----------------------------------------------------------
  protected isScreenGranted(screenId: number): boolean {
    return this.granted().has(screenId);
  }
  protected toggleScreen(screenId: number, checked: boolean): void {
    this.granted.update((set) => {
      const next = new Set(set);
      if (checked) next.add(screenId);
      else next.delete(screenId);
      return next;
    });
  }

  // ---- Save -----------------------------------------------------------------
  protected save(): void {
    const roleId = this.selectedRole();
    if (roleId == null || this.saving()) return;
    this.saving.set(true);
    this.service
      .save({ roleId, screenIds: [...this.granted()] })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => this.notify.success('Permissions saved.'));
  }
}
