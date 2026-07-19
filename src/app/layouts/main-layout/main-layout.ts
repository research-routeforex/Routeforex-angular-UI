import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { NAVIGATION } from '../../core/constants/navigation';
import { STORAGE_KEYS } from '../../core/constants/app.constants';
import { ROLE_LABELS } from '../../core/enums/role.enum';
import { MenuModule as MenuModuleDef } from '../../core/models/menu.model';
import { NavSection } from '../../core/models/nav-item.model';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { MenuService } from '../../core/services/menu.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmService } from '../../shared/services/confirm.service';

/** Authenticated application shell: top bar, role-aware sidebar, content outlet. */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayoutComponent {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly confirm = inject(ConfirmService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly loading = inject(LoadingService);

  /** Dynamic menu from the API (null until loaded; empty array = none granted). */
  private readonly menu = signal<MenuModuleDef[] | null>(null);

  constructor() {
    // Reset so each session loads the signed-in user's own menu (not a cached one),
    // then load the per-user menu (module → screen permissions). Falls back to the
    // static NAVIGATION below if the API returns nothing or errors.
    this.menuService.reset();
    this.menuService.getMenu().subscribe({
      next: (modules) => this.menu.set(modules ?? []),
      error: () => this.menu.set([]),
    });
  }

  protected readonly isHandset = toSignal(
    this.breakpoints.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly collapsed = signal(
    localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === 'true',
  );

  /** Whether the overlay drawer is open (handset only). */
  protected readonly navOpen = signal(false);

  /**
   * The user's accordion choice: a section title = open, `''` = user collapsed all,
   * `null` = no choice yet (fall back to the route-based default below). Persisted.
   */
  private readonly expandedChoice = signal<string | null>(
    localStorage.getItem(STORAGE_KEYS.expandedSection),
  );

  /** Which single section is open — the user's choice, or the active-route section. */
  private readonly expandedSection = computed<string>(() => {
    const choice = this.expandedChoice();
    if (choice !== null) return choice; // '' means "all collapsed"

    // Default: open the section holding the active route, else the first one.
    const secs = this.sections();
    if (!secs.length) return '';
    const url = this.router.url;
    const active = secs.find((s) =>
      s.items.some((i) => {
        if (!i.route) return false;
        const r = i.route.startsWith('/') ? i.route : `/${i.route}`;
        return url.startsWith(r);
      }),
    );
    return (active ?? secs[0]).title ?? '';
  });

  protected isSectionCollapsed(title: string | undefined): boolean {
    return !title || this.expandedSection() !== title;
  }

  /** Expand a module section (collapsing any other), or collapse it if already open. */
  protected toggleSection(title: string | undefined): void {
    if (!title) return;
    const next = this.expandedSection() === title ? '' : title;
    this.expandedChoice.set(next);
    localStorage.setItem(STORAGE_KEYS.expandedSection, next);
  }

  protected readonly year = new Date().getFullYear();
  protected readonly notificationCount = 4;

  /**
   * Nav sections. Uses the dynamic API menu (module/screen permissions) when
   * available; otherwise falls back to the static role-filtered NAVIGATION.
   */
  protected readonly sections = computed<NavSection[]>(() => {
    const dynamic = this.menu();
    if (dynamic && dynamic.length) {
      return dynamic.map((m) => ({
        title: m.moduleName,
        items: m.screens.map((s) => ({
          label: s.screenName,
          icon: s.icon || 'chevron_right',
          route: s.route,
          badge: s.screenStatus && s.screenStatus !== 'Available' ? s.screenStatus : undefined,
          // Soon (incomplete) and Pay (locked until payment) are shown but not navigable.
          locked: s.screenStatus === 'Soon' || s.screenStatus === 'Pay',
        })),
      }));
    }

    // Fallback: static navigation, role + username filtered.
    const roles = this.auth.roles();
    const userName = this.auth.user()?.userName ?? '';
    return NAVIGATION.map((section) => ({
      title: section.title,
      items: section.items
        .filter((item) => !item.roles?.length || item.roles.some((r) => roles.includes(r)))
        .map((item) =>
          item.usernames?.length && item.usernames.includes(userName)
            ? { ...item, badge: undefined }
            : item,
        ),
    })).filter((section) => section.items.length > 0);
  });

  /** Maps a status badge to its CSS modifier (soon / new / pay). */
  protected badgeClass(badge: string | undefined): string {
    return (badge ?? '').toLowerCase();
  }

  protected readonly primaryRole = computed(() => {
    const role = this.auth.roles()[0];
    return role ? (ROLE_LABELS[role] ?? role) : 'User';
  });

  protected readonly initials = computed(() => {
    const name = this.auth.displayName();
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  });

  protected readonly sidenavMode = computed(() => (this.isHandset() ? 'over' : 'side'));
  protected readonly sidenavOpened = computed(() => (this.isHandset() ? this.navOpen() : true));
  /** Labels are only hidden in the collapsed desktop rail. */
  protected readonly railCollapsed = computed(() => this.collapsed() && !this.isHandset());

  /** Top-bar menu button: collapses the rail on desktop, opens the drawer on mobile. */
  toggleSidebar(): void {
    if (this.isHandset()) {
      this.navOpen.update((o) => !o);
      return;
    }
    this.collapsed.update((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(next));
      return next;
    });
  }

  /**
   * After navigating: close the overlay drawer on mobile, or auto-minimise the
   * sidebar to the rail on desktop.
   */
  onNavigated(): void {
    if (this.isHandset()) {
      this.navOpen.set(false);
      return;
    }
    if (!this.collapsed()) {
      this.collapsed.set(true);
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, 'true');
    }
  }

  logout(): void {
    this.confirm
      .confirm({
        title: 'Sign out?',
        message: 'You will need to sign in again to continue.',
        confirmText: 'Sign out',
        icon: 'logout',
      })
      .subscribe((ok) => {
        if (ok) this.auth.logout();
      });
  }
}
