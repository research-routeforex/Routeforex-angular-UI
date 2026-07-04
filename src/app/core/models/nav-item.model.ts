/** A single entry in the dynamic, role-aware sidebar navigation. */
export interface NavItem {
  label: string;
  icon: string;
  /** Router link; omit for a section that only groups children. */
  route?: string;
  /** Roles allowed to see this item. Empty/undefined => visible to any authenticated user. */
  roles?: string[];
  /**
   * Usernames for whom this item is fully enabled (no "Soon" badge, openable).
   * Everyone else still sees the item but with its badge, and is blocked by the
   * route's userNameGuard. Empty/undefined => enabled for all.
   */
  usernames?: string[];
  /** Nested items (one level supported by the sidebar). */
  children?: NavItem[];
  /** Optional badge text/count (e.g. Soon / New / Pay). */
  badge?: string;
  /** When true the item is shown but not navigable (Soon / Pay screens). */
  locked?: boolean;
}

/** A navigation section header grouping related items. */
export interface NavSection {
  title?: string;
  items: NavItem[];
}
