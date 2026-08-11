# RouteForex Web

Enterprise frontend for the **RouteForex Forex Transaction Management System** — Angular 22, standalone + zoneless, Signals state, Angular Material 3, wired to the RouteForex ASP.NET Core Web API (JWT + refresh tokens, standardized `ApiResponse` envelope, backend-driven per-screen authorization).

> **Architecture & design decisions:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Prerequisites

- Node.js 20+ and npm 10+
- A reachable RouteForex API. By default the dev proxy targets the **deployed** API at `https://routeforexapi.azurewebsites.net` (see `proxy.conf.json`), so no local backend is required; point the proxy at `https://localhost:7080` for local backend work.

## Getting started

```bash
npm install
npm start          # ng serve with dev proxy → http://localhost:4200
```

The dev server proxies `/api/*` to the target in `proxy.conf.json` (the deployed Azure API by default), so the SPA calls same-origin `/api/v1/...` with **no CORS** setup required. Sign in with credentials issued by the API.

> Default dev port is `4300` (configured in `.claude/launch.json`); `ng serve` alone uses `4200`. Either is fine — just ensure the API's `Cors:AllowedOrigins` (or the proxy) matches.

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm start`           | Dev server with proxy + HMR                  |
| `npm run build`       | Production build → `dist/routeforex-web`     |
| `npm run watch`       | Development build in watch mode              |
| `npm test`            | Unit tests (Vitest)                          |

## What's implemented

- **Auth:** login, automatic JWT attach, transparent refresh-token rotation + retry, logout, "remember me" storage scope, forgot/reset/change password, session persistence, guest/auth guards. The login screen's brand panel runs a cross-fading image **slideshow** (drop images into `public/login-slides/`).
- **Dashboard & analytics:** KPI cards, SVG turnover/volume charts, recent deals, alerts; Management Dashboard; Ticker Live Rate (time-metered) — the spot-rate board, forward premium and currency-future panels now poll **live** data from the `LiveRates/forex`, `LiveRates/premium` and `LiveRates/currency-future` feeds (silent requests, per-cell up/down flash on each refresh).
- **Masters (live API):** Cities, Tenors, Client Master (banks + contracts), Common Master (Country Region / Country / State / City), Currency Master, Bank Master (RM contacts + **Head Office** tab), Company Master (+ **Company Bank** tab).
- **Transactions (live API):** Dealer Pad (legacy-coloured live-rate board showing **real DB rates only** — an empty grid when the feed is down, never simulated; editable **Live Rates** and **Dealer Rates** bands with a derived Net Rate and the legacy base/home → spot calc; warns once via a modal on an empty dealer name), FTP Order Entry (transaction-type-driven date fields with holiday-adjusted **maturity/from-to auto-fill** and Cash/TOM/SPOT settlement offsets, **Upcoming** scheduling, single-bank auto-select, recordings/documents), **Generate Invoice** — bill orders by client/date range, choose GST number + invoice number/date, server-computed CGST/SGST-or-IGST split, a **Generated Invoices** history grid (per-column filters, totals, paging), plus **e-mail to client** and a standalone **print** page (From/Bill-To company + consignee details, applicable-tax-only line, auto fit-to-one-A4-page).
- **Reports (live API):** Client Wise Revenue and Report UC — filterable result grids with column totals, global + per-column search, and Excel (.xls) export of the filtered rows.
- **Administration (live API):** Users (CRUD + role assignment), Roles (CRUD).
- **Settings:** profile, security (change password), theme preference.
- **Access control:** per-screen `canAccess` from the backend menu gates routes (`menuAccessGuard`) — no hard-coded role rules in the frontend.
- **Favourites:** star any screen to pin it in a **Favourites** section at the top of the sidebar; stored per-user server-side (`RF_UserFavourite` via `GET/POST/DELETE api/v1/Favourites`) so they follow the user across devices.
- **Keyboard-first navigation:** tabbing onto a searchable dropdown opens it with the filter box focused (type to filter, Up/Down to move, Enter to select, Tab to move on) — mouse and keyboard behave identically.
- **Scaffolded placeholders:** Items, Brands, UOM, Parties, Purchase, Sales, Inventory — guarded, lazy routes ready to become full masters using the `CrudService` + DataTable pattern.

## Project layout

```
src/app/
├── core/      interceptors, guards, services (Api, Auth store, Crud), models, constants, enums
├── shared/    DataTable, dialogs, page-header, stat-card, chart, validators, directives
├── layouts/   MainLayout (app shell), AuthLayout (login)
└── features/  auth, dashboard, users, roles, cities, tenors, settings, …
```

## Theming

Brand colours follow a **fixed legacy palette** (defined as hex tokens in `styles.scss`): blue header bar, cyan-blue sidebar, green logo/active-menu, and a pink **primary** accent (buttons, focus, checkboxes). These stay constant in both themes. Light/dark still drives the page **surfaces** via the M3 `color-scheme` (toggle from the top bar or Settings); the choice is persisted and defaults to the OS preference.

## Configuration

Environment settings live in `src/environments/`. `environment.development.ts` is swapped in for `ng serve`/`--configuration development` via `angular.json` `fileReplacements`. Set `apiBaseUrl` for non-proxied deployments.
