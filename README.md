# RouteForex Web

Enterprise frontend for the **RouteForex Forex Transaction Management System** — Angular 22, standalone + zoneless, Signals state, Angular Material 3, wired to the RouteForex ASP.NET Core Web API (JWT + refresh tokens, standardized `ApiResponse` envelope, backend-driven per-screen authorization).

> **Architecture & design decisions:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Prerequisites

- Node.js 20+ and npm 10+
- The RouteForex API running locally on `https://localhost:7080` (for live data)

## Getting started

```bash
npm install
npm start          # ng serve with dev proxy → http://localhost:4300
```

The dev server proxies `/api/*` to `https://localhost:7080` (see `proxy.conf.json`), so the SPA calls same-origin `/api/v1/...` with **no CORS** setup required. Sign in with credentials issued by the API.

> Default dev port is `4300` (configured in `.claude/launch.json`); `ng serve` alone uses `4200`. Either is fine — just ensure the API's `Cors:AllowedOrigins` (or the proxy) matches.

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm start`           | Dev server with proxy + HMR                  |
| `npm run build`       | Production build → `dist/routeforex-web`     |
| `npm run watch`       | Development build in watch mode              |
| `npm test`            | Unit tests (Vitest)                          |

## What's implemented

- **Auth:** login, automatic JWT attach, transparent refresh-token rotation + retry, logout, "remember me" storage scope, forgot/reset/change password, session persistence, guest/auth guards.
- **Dashboard & analytics:** KPI cards, SVG turnover/volume charts, recent deals, alerts; Management Dashboard; Ticker Live Rate (time-metered).
- **Masters (live API):** Cities, Tenors, Client Master (banks + contracts), Common Master (Country Region / Country / State / City), Currency Master, Bank Master (RM contacts + **Head Office** tab), Company Master (+ **Company Bank** tab).
- **Transactions (live API):** Dealer Pad, FTP Order Entry (+ recordings/documents), **Generate Invoice** — bill orders by client/date range, choose GST number + invoice number/date, server-computed CGST/SGST-or-IGST split, a **Generated Invoices** history grid (per-column filters, totals, paging), plus **e-mail to client** and a standalone **print** page (From/Bill-To company + consignee details, applicable-tax-only line, auto fit-to-one-A4-page).
- **Reports (live API):** Client Wise Revenue and Report UC — filterable result grids with column totals, global + per-column search, and Excel (.xls) export of the filtered rows.
- **Administration (live API):** Users (CRUD + role assignment), Roles (CRUD).
- **Settings:** profile, security (change password), theme preference.
- **Access control:** per-screen `canAccess` from the backend menu gates routes (`menuAccessGuard`) — no hard-coded role rules in the frontend.
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

Light/dark are driven by the M3 `color-scheme`; toggle from the top bar or Settings. The choice is persisted and defaults to the OS preference.

## Configuration

Environment settings live in `src/environments/`. `environment.development.ts` is swapped in for `ng serve`/`--configuration development` via `angular.json` `fileReplacements`. Set `apiBaseUrl` for non-proxied deployments.
