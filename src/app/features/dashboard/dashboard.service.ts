import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { PagedResult } from '../../core/models/pagination.model';
import { ApiService } from '../../core/services/api.service';
import { ChartPoint } from '../../shared/components/chart/chart';
import { AlertItem, DashboardData, Kpi, RecentDeal } from './dashboard.model';

/** A row of the FTP order list — the dashboard's real data source. */
interface OrderRow {
  orderNumber?: string | null;
  clientName?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  netRateD?: number | null;
  maturityDate?: string | null;
  activeStatus?: string | null;
  createdDateTime?: string | null;
}

/** How many recent orders to pull for the aggregation window. */
const WINDOW_SIZE = 200;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Aggregates the executive dashboard from real order data. It reads the most
 * recent {@link WINDOW_SIZE} orders from the FTP Order Entry list endpoint (which
 * the API already scopes to the signed-in user's clients) and derives the KPIs,
 * charts, recent-deal rows and alerts — no dedicated backend endpoint required.
 *
 * Turnover / P&L in a single currency are intentionally **not** shown: orders
 * span many currencies, so a mark-to-market P&L needs a dedicated backend
 * aggregation. Every figure here is a count / grouping that is honest for
 * mixed-currency data.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  load(): Observable<DashboardData> {
    return this.api
      .getPaged<OrderRow>(API.transaction.ftpOrders, {
        params: { pageNumber: 1, pageSize: WINDOW_SIZE },
      })
      .pipe(map((page) => this.aggregate(page)));
  }

  private aggregate(page: PagedResult<OrderRow>): DashboardData {
    const orders = page.items ?? [];
    const totalCount = page.totalCount ?? orders.length;

    const today = startOfDay(new Date());
    const dayMs = 86_400_000;

    // Deals bucketed by day-offset from today (0 = today, 1 = yesterday, …).
    const createdDays = orders.map((o) => {
      const d = parseDmy(o.createdDateTime);
      return d ? Math.round((today.getTime() - startOfDay(d).getTime()) / dayMs) : null;
    });
    const countInRange = (loInclusive: number, hiInclusive: number) =>
      createdDays.filter((n) => n !== null && n >= loInclusive && n <= hiInclusive).length;

    const todayCount = countInRange(0, 0);
    const yesterdayCount = countInRange(1, 1);
    const last7 = countInRange(0, 6);
    const prev7 = countInRange(7, 13);

    const openCount = orders.filter((o) => isOpen(o.activeStatus)).length;

    const kpis: Kpi[] = [
      {
        icon: 'today',
        label: "Today's Deals",
        value: String(todayCount),
        ...deltaCount(todayCount - yesterdayCount, 'vs yesterday'),
        color: 'var(--rf-info)',
      },
      {
        icon: 'date_range',
        label: 'Last 7 Days',
        value: String(last7),
        ...deltaCount(last7 - prev7, 'vs prev 7d'),
        color: 'var(--mat-sys-primary)',
      },
      {
        icon: 'pending_actions',
        label: 'Open Positions',
        value: String(openCount),
        delta: '',
        trend: 'flat',
        color: 'var(--rf-warn)',
      },
      {
        icon: 'inventory_2',
        label: 'Total Orders',
        value: formatCount(totalCount),
        delta: '',
        trend: 'flat',
        color: 'var(--rf-success)',
      },
    ];

    // Weekly activity: deals per day for the last 7 calendar days (oldest → today).
    const weeklyActivity: ChartPoint[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today.getTime() - offset * dayMs);
      weeklyActivity.push({
        label: WEEKDAYS[day.getDay()],
        value: createdDays.filter((n) => n === offset).length,
      });
    }

    // Volume by pair: order count grouped by currency (top 6).
    const byPair = new Map<string, number>();
    for (const o of orders) {
      const key = (o.currencyCode || '—').toUpperCase();
      byPair.set(key, (byPair.get(key) ?? 0) + 1);
    }
    const volumeByPair: ChartPoint[] = [...byPair.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));

    const recentDeals: RecentDeal[] = orders.slice(0, 8).map((o) => ({
      ref: o.orderNumber || '—',
      pair: o.currencyCode || '—',
      type: (o.impExp || '').trim() || '—',
      amount: formatAmount(o.currencyCode, o.amount),
      rate: formatRate(o.netRateD),
      status: (o.activeStatus || '').trim() || '—',
    }));

    const alerts = this.buildAlerts(orders, today, todayCount, openCount);

    return {
      kpis,
      weeklyActivity,
      volumeByPair,
      recentDeals,
      alerts,
      empty: orders.length === 0 && totalCount === 0,
    };
  }

  private buildAlerts(
    orders: OrderRow[],
    today: Date,
    todayCount: number,
    openCount: number,
  ): AlertItem[] {
    if (orders.length === 0) {
      return [{ icon: 'info', text: 'No deals found for your account yet.', variant: 'info' }];
    }

    const alerts: AlertItem[] = [];

    const overdue = orders.filter((o) => {
      if (!isOpen(o.activeStatus)) return false;
      const mat = parseIso(o.maturityDate);
      return mat !== null && startOfDay(mat).getTime() < today.getTime();
    }).length;
    if (overdue > 0) {
      alerts.push({
        icon: 'warning',
        text: `${overdue} open deal${overdue === 1 ? '' : 's'} past maturity awaiting settlement`,
        variant: 'warn',
      });
    }

    const upcoming = orders.filter((o) => (o.activeStatus || '').toLowerCase() === 'upcoming').length;
    if (upcoming > 0) {
      alerts.push({
        icon: 'event_upcoming',
        text: `${upcoming} upcoming deal${upcoming === 1 ? '' : 's'} scheduled`,
        variant: 'info',
      });
    }

    if (todayCount > 0) {
      alerts.push({
        icon: 'check_circle',
        text: `${todayCount} deal${todayCount === 1 ? '' : 's'} booked today`,
        variant: 'success',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        icon: 'check_circle',
        text: `All caught up — ${openCount} open position${openCount === 1 ? '' : 's'} on track`,
        variant: 'success',
      });
    }
    return alerts;
  }
}

/** A completed order — no longer an open position. */
function isCompleted(status?: string | null): boolean {
  const s = (status || '').toLowerCase();
  return s === 'done' || s === 'invoicegenerated';
}

/** A dead order — deleted / cancelled. */
function isDead(status?: string | null): boolean {
  const s = (status || '').toLowerCase();
  return s === 'inactive' || s === 'cancelled' || s === 'canceled' || s === 'closed';
}

function isOpen(status?: string | null): boolean {
  return !isCompleted(status) && !isDead(status);
}

/** Delta descriptor for a signed count difference. */
function deltaCount(diff: number, suffix: string): Pick<Kpi, 'delta' | 'trend'> {
  if (diff === 0) return { delta: '', trend: 'flat' };
  const sign = diff > 0 ? '+' : '';
  return { delta: `${sign}${diff} ${suffix}`, trend: diff > 0 ? 'up' : 'down' };
}

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function formatAmount(currency?: string | null, amount?: number | null): string {
  if (amount === null || amount === undefined) return '—';
  const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
  const ccy = (currency || '').trim();
  return ccy ? `${ccy} ${num}` : num;
}

function formatRate(rate?: number | null): string {
  if (rate === null || rate === undefined || rate === 0) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(rate);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse the list's `dd-MMM-yyyy` CreatedDateTime (style 106). */
function parseDmy(value?: string | null): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return new Date(+m[3], month, +m[1]);
}

/** Parse an ISO date (MaturityDate) into a Date, or null. */
function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
