/** Keys used for persisting the session in browser storage. */
export const STORAGE_KEYS = {
  session: 'rf.session',
  theme: 'rf.theme',
  sidebarCollapsed: 'rf.sidebar.collapsed',
  collapsedSections: 'rf.sidebar.sections',
} as const;

/** HTTP header the backend uses for request correlation. */
export const CORRELATION_HEADER = 'X-Correlation-Id';

/** Context token marker (string) used to flag requests that should skip the loader. */
export const SKIP_LOADING = 'X-Skip-Loading';
