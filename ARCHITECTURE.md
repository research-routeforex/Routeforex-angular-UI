# RouteForex Web — Frontend Architecture

Angular 22 single-page application for the **RouteForex Forex Transaction Management System**, built against the RouteForex ASP.NET Core Web API (Clean Architecture, JWT + refresh tokens, standardized `ApiResponse` envelope, role-based authorization).

---

## 1. Technology stack

| Concern              | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Framework            | Angular 22, **standalone components**, **zoneless** change detection   |
| Language             | TypeScript (strict)                                                    |
| State                | **Angular Signals** (signal stores + `computed`) — no NgRx boilerplate |
| Reactivity           | RxJS (HTTP, debounced search, refresh de-duplication)                  |
| UI                   | Angular Material 3 (M3) + custom SCSS design tokens                    |
| Routing              | Angular Router — lazy `loadChildren`/`loadComponent`, guards           |
| HTTP                 | `HttpClient` + functional interceptors + generic API layer            |
| Forms                | Reactive Forms, `FormBuilder`, custom validators                       |
| Charts               | Dependency-free SVG chart component (swap-in point for ngx-charts)     |
| Theming              | Runtime light/dark via M3 `color-scheme`, persisted                    |

> **Zoneless:** the generated project ships without `zone.js`. Change detection is driven entirely by Signals + `OnPush`. Every component uses `ChangeDetectionStrategy.OnPush`.

---

## 2. Folder structure

```
src/
├── environments/                 # environment.ts (prod) + environment.development.ts
├── styles.scss                   # global design system, M3 theme, utility classes
└── app/
    ├── core/                     # singletons — imported once, never feature-specific
    │   ├── constants/            # api-endpoints, navigation, app constants
    │   ├── enums/                # AppRole, role labels
    │   ├── guards/               # authGuard, roleGuard, guestGuard
    │   ├── interceptors/         # auth (JWT + refresh), error, loading + context tokens
    │   ├── models/               # API DTO interfaces mirroring the backend
    │   └── services/             # ApiService, AuthService (store), CrudService, Theme, Loading…
    ├── shared/                   # reusable, presentational building blocks
    │   ├── components/           # data-table, page-header, stat-card, chart, dialogs, states
    │   ├── directives/           # *appHasRole
    │   ├── services/             # ConfirmService
    │   └── validators/           # CustomValidators
    ├── layouts/                  # MainLayout (app shell) + AuthLayout (login shell)
    ├── features/                 # lazy-loaded feature areas (one folder per domain)
    │   ├── auth/ dashboard/ users/ roles/ cities/ tenors/ settings/
    │   ├── dealer-pad/ management-dashboard/ ticker/            # trading & analytics
    │   ├── clients/ common-master/                             # masters (Client + Country Region/Country/State/City)
    │   ├── ftp-order-entry/ generate-invoice/                  # transactions
    │   └── (purchase, sales, inventory, reports → placeholders)
    ├── app.config.ts             # root providers (HTTP, interceptors, router, animations)
    └── app.routes.ts             # top-level route tree
```

**Layering rule:** `features → shared → core`. Core never imports from features; shared never imports from features.

---

## 3. API integration

### 3.1 Generic API layer (`core/services/api.service.ts`)

A thin wrapper over `HttpClient` that:

- prefixes every path with `environment.apiBaseUrl + environment.apiPrefix` (`/api/v1`),
- **unwraps the standard `ApiResponse<T>` envelope** so callers receive `T` (or `PagedResult<T>`),
- centralizes query-param building.

```ts
this.api.getPaged<City>('Cities', { params }); // → Observable<PagedResult<City>>
this.api.post<AuthResult>('Auth/login', creds); // → Observable<AuthResult>
```

### 3.2 Standard envelope

Mirrors `RouteForex.Application.Common.Models.ApiResponse`:

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode?: string | null;
  errors?: Record<string, string[]> | null; // field → messages (dictionary, per backend)
  traceId?: string | null;
  timestamp: string;
  data?: T;
}
```

### 3.3 Interceptor pipeline

Registered (outermost → innermost) in `app.config.ts`:

```
loadingInterceptor → errorInterceptor → authInterceptor → backend
```

| Interceptor          | Responsibility                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `loadingInterceptor` | Increments/decrements `LoadingService` → global progress bar. Opt-out via `SKIP_LOADING` context token.  |
| `errorInterceptor`   | Maps HTTP/envelope errors to a friendly toast; routes 403 → `/forbidden`. Opt-out via `SKIP_ERROR_TOAST`.|
| `authInterceptor`    | Attaches `Authorization: Bearer …`; on 401 performs refresh + retry; logs out if refresh fails.          |

---

## 4. Authentication & token refresh

### 4.1 Login flow

1. `LoginComponent` submits credentials → `AuthService.login()` → `POST /Auth/login`.
2. Backend returns `AuthResult { accessToken, accessTokenExpiresAtUtc, refreshToken, refreshTokenExpiresAtUtc, user }`.
3. `TokenStorageService` persists the session; `AuthService` updates its signals.
4. Router redirects to `returnUrl` or `/dashboard`.

### 4.2 Refresh flow (`authInterceptor` + `AuthService.refreshToken`)

1. A non-auth request returns **401** with a still-valid refresh token.
2. `AuthService.refreshToken()` calls `POST /Auth/refresh`. The call is wrapped in `shareReplay(1)` so **a burst of concurrent 401s triggers exactly one refresh**.
3. On success the session is rotated and the original request is **retried** with the new access token.
4. On failure the user is logged out and redirected to login.

### 4.3 Token storage

`TokenStorageService` is the single seam for persistence. **"Remember me"** selects the storage scope: enabled → `localStorage` (survives a browser restart), disabled → `sessionStorage` (cleared when the tab/browser closes). `load()` reads from whichever store holds the session and refresh-token rotation keeps it there. Swap to HttpOnly cookies by changing only this service.

### 4.4 Forgot / reset / change password

Self-service reset lives at `/auth/forgot-password` and `/auth/reset-password` (both inside the auth layout; the reset page has no `guestGuard` so an emailed link always resolves). Flow: `POST /Auth/forgot-password` (username or email — always a generic response, no account enumeration) emails a single-use, time-limited link; `POST /Auth/reset-password` validates the token and sets the new password. Server-side the raw token is emailed but only its SHA-256 hash is stored (`RF_PasswordResetTokens`); tokens are single-use and superseded when a newer one is issued.

A signed-in user changes their own password from **Settings → Security** via a dialog: `POST /Auth/change-password` (authenticated; the user id comes from the JWT, not the body) verifies the current password, then sets the new one. Wrong-current-password returns a 422 with a field error that the dialog surfaces inline (the auto error-toast is suppressed for this call).

---

## 5. Authorization

RouteForex issues **role** claims (no granular permissions on the API), so authorization is role-based throughout:

- **`authGuard`** — blocks unauthenticated access, preserves `returnUrl`.
- **`roleGuard`** — reads `route.data.roles` and grants if the user holds any.
- **`guestGuard`** — keeps signed-in users off the login page.
- **`*appHasRole`** — template-level structural directive for showing/hiding controls.
- **Dynamic sidebar** — `NAVIGATION` config is filtered by the user's roles, so only authorized menu items render.

```ts
{ path: 'users', canActivate: [authGuard, roleGuard], data: { roles: ['Admin'] } }
```

> The model generalizes cleanly to permission strings later: change `roleGuard`/`hasAnyRole` to read a `permissions` claim and keep every call site identical.

---

## 6. State management — Signals

`AuthService` is the canonical **signal store**:

```ts
session  = signal<StoredSession | null>(…)   // source of truth
user        = computed(() => session()?.user)
roles       = computed(() => session()?.user.roles ?? [])
isAuthenticated = computed(() => session() !== null)
```

- `LoadingService` — counter signal → `isLoading` computed.
- `ThemeService` — `mode` signal + `effect` syncing the DOM class and storage.
- Feature lists hold `rows`/`total`/`loading` signals; `RolesListComponent` demonstrates **memoized `computed` selectors** for client-side filter/sort/paging.

This satisfies the brief's state requirements (Auth/User/Roles, dashboard, master data) without NgRx ceremony. NgRx remains a drop-in option for teams that prefer it — the service boundaries wouldn't change.

---

## 7. Reusable component library (`shared/`)

| Component             | Purpose                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **`DataTableComponent`** | Server-driven table: paging, sorting, debounced search, badge/boolean/date cells, row actions, empty state. Emits one `TableQuery` to feed `CrudService.getPaged`. |
| `PageHeaderComponent` | Title + breadcrumb + projected action slot.                                                          |
| `StatCardComponent`   | KPI card with icon tint and trend delta.                                                              |
| `ChartComponent`      | Dependency-free SVG bar/line/area chart.                                                              |
| `ConfirmDialogComponent` + `ConfirmService` | Reusable confirmation modal (`confirmDelete()` helper).                         |
| `EmptyStateComponent` / `StatusPageComponent` | Empty + 403/404 states.                                                       |
| `PlaceholderComponent` | Data-driven "module coming soon" page for not-yet-built features.                                    |

CRUD masters are built on **`CrudService<TDto, TCreate, TUpdate>`** — concrete services supply only a `basePath`:

```ts
@Injectable({ providedIn: 'root' })
export class CitiesService extends CrudService<City, CreateCityRequest, UpdateCityRequest> {
  protected readonly basePath = 'Cities';
}
```

---

## 8. Theming

- Angular Material **M3** theme in `styles.scss` using `mat.theme(...)`.
- Light/dark switch by toggling `color-scheme` (`.theme-dark` on `<html>`), so M3 system variables flip at runtime — **no second theme to compile**.
- `ThemeService` persists the choice and respects the OS preference on first load.
- Semantic status tokens (`--rf-success`, `--rf-danger`, …) use `light-dark()` so they adapt automatically.

---

## 9. Performance

- **Lazy loading** at every feature boundary (`loadChildren`/`loadComponent`) → route-level code splitting (see per-feature chunks in the build output).
- **`OnPush`** on every component; **Signals** for fine-grained updates; **zoneless** removes zone.js overhead.
- **Memoized selectors** via `computed`.
- Debounced (350 ms) server search; de-duplicated token refresh.
- Production initial transfer ≈ **152 kB gzipped**.

---

## 10. Environments & running

`environment.ts` (prod) / `environment.development.ts` (dev) are swapped by the `fileReplacements` in `angular.json`.

In development, `proxy.conf.json` forwards `/api/*` to the API at `https://localhost:7080`, so the SPA calls same-origin `/api/v1/...` with **no CORS** friction.

```bash
npm install
npm start            # ng serve with proxy → http://localhost:4200
npm run build        # production build → dist/routeforex-web
```

Point the proxy/`apiBaseUrl` at the deployed API for other environments.

---

## 11. Backend coverage

Implemented against live endpoints: **Auth (login, refresh, logout, forgot/reset/change password), Users (CRUD + role assignment), Roles (CRUD), Cities (CRUD), Tenors (CRUD)**, plus **Client Master**, **Common Master** (Country Region / Country / State / City), **Currency Master**, **Bank Master** (with RM contacts + Head Office tab), **Company Master**, **Dealer Pad**, **Management Dashboard**, **Ticker Live Rate** (time-metered), **FTP Order Entry** (+ order recordings/documents), **Generate Invoice**, and a backend-driven **menu / screen-permission** system.

Modules whose API controllers are not yet available — Items, Brands, UOM, Parties, Purchase, Sales, Inventory, Reports — are scaffolded as guarded, lazy **placeholder** routes. Each becomes a full master by adding a `CrudService` subclass + a list/form pair, exactly like Cities and Tenors (the canonical template).
