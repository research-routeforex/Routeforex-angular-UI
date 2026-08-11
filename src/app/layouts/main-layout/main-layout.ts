import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, map, startWith } from 'rxjs';
import { NAVIGATION } from '../../core/constants/navigation';
import { STORAGE_KEYS } from '../../core/constants/app.constants';
import { ROLE_LABELS } from '../../core/enums/role.enum';
import { MenuModule as MenuModuleDef } from '../../core/models/menu.model';
import { NavItem, NavSection } from '../../core/models/nav-item.model';
import { AuthService } from '../../core/services/auth.service';
import { FavouritesService } from '../../core/services/favourites.service';
import { LoadingService } from '../../core/services/loading.service';
import { MenuService } from '../../core/services/menu.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmService } from '../../shared/services/confirm.service';

/** Title of the pinned section that lists the user's favourite screens. */
const FAVOURITES_TITLE = 'Favourites';

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
  protected readonly favourites = inject(FavouritesService);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly loading = inject(LoadingService);

  /** Dynamic menu from the API (null until loaded; empty array = none granted). */
  private readonly menu = signal<MenuModuleDef[] | null>(null);

  constructor() {
    // Reset so each session loads the signed-in user's own menu (not a cached one),
    // then load the per-user menu (role → screen permissions). A successfully-loaded
    // menu is authoritative — even if empty — so a role only ever sees the screens it
    // was granted. Only an *error* (null) falls back to the static NAVIGATION.
    this.menuService.reset();
    this.menuService.getMenu().subscribe({
      next: (modules) => this.menu.set(modules ?? []),
      error: () => this.menu.set(null),
    });

    // Load the signed-in user's favourites (persisted server-side).
    this.favourites.load();
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

    // Default: open the module section holding the active route, else the first
    // one. Favourites is pinned/always-open, so it's excluded from the accordion.
    const secs = this.moduleSections();
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

  protected isFavouritesSection(title: string | undefined): boolean {
    return title === FAVOURITES_TITLE;
  }

  protected isSectionCollapsed(title: string | undefined): boolean {
    if (title === FAVOURITES_TITLE) return false; // pinned, always expanded
    return !title || this.expandedSection() !== title;
  }

  /** Expand a module section (collapsing any other), or collapse it if already open. */
  protected toggleSection(title: string | undefined): void {
    if (!title || title === FAVOURITES_TITLE) return;
    const next = this.expandedSection() === title ? '' : title;
    this.expandedChoice.set(next);
    localStorage.setItem(STORAGE_KEYS.expandedSection, next);
  }

  /** Toggle a screen as a favourite (from the star button on a nav item). */
  protected toggleFavourite(item: NavItem, event: Event): void {
    // Don't navigate or auto-collapse the sidebar when the star is clicked.
    event.preventDefault();
    event.stopPropagation();
    this.favourites.toggle(item);
  }

  protected isFavourite(route: string | undefined): boolean {
    return this.favourites.isFavourite(route);
  }

  protected readonly year = new Date().getFullYear();
  protected readonly notificationCount = 4;

  /** Current URL as a signal (updates on every completed navigation). */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Dealer Pad-only header quick links (legacy Vendor-Board toolbar), icon-only. */
  protected readonly isDealerPad = computed(() => this.currentUrl().split('?')[0] === '/dealer-pad');

  protected readonly shortcuts: ReadonlyArray<{ label: string; icon: string; route: string; color: string }> = [
    { label: 'FTP Order Entry', icon: 'request_quote', route: '/ftp-order-entry', color: '#7c6cff' },
    { label: 'Upcoming Deals', icon: 'event_upcoming', route: '/ftp-upcoming-deal', color: '#38bdf8' },
    { label: 'MIS Report', icon: 'assessment', route: '/reports/mis-report', color: '#fbbf24' },
    { label: 'Deal Coverage', icon: 'folder_open', route: '/deal-coverage', color: '#34d399' },
    { label: 'Trial Transaction', icon: 'science', route: '/trial-transaction', color: '#f472b6' },
    { label: 'Client Order', icon: 'assignment_ind', route: '/client-order', color: '#a78bfa' },
    { label: 'Broadcast', icon: 'campaign', route: '/broadcast-message', color: '#fb7185' },
  ];

  /**
   * Module nav sections. Uses the dynamic API menu (module/screen permissions)
   * when available; otherwise falls back to the static role-filtered NAVIGATION.
   */
  private readonly moduleSections = computed<NavSection[]>(() => {
    const dynamic = this.menu();
    // A loaded menu (non-null) is authoritative — even an empty one — so a role
    // sees only its granted screens. Only null (not yet loaded / API error) falls
    // back to the static NAVIGATION.
    if (dynamic !== null) {
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

  /**
   * Rendered sidebar sections: the user's favourites (pinned on top) followed by
   * the module sections. Favourites are rendered straight from stored data, so
   * they show immediately on login without waiting for the async menu to resolve.
   */
  protected readonly sections = computed<NavSection[]>(() => {
    const modules = this.moduleSections();
    const favs = this.favourites.favourites();
    if (!favs.length) return modules;

    const favItems: NavItem[] = favs.map((f) => ({
      label: f.label,
      icon: f.icon,
      route: f.route,
    }));
    return [{ title: FAVOURITES_TITLE, items: favItems }, ...modules];
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
