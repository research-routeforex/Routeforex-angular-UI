import { ChartPoint } from '../../shared/components/chart/chart';

/** A KPI stat-card on the dashboard. */
export interface Kpi {
  icon: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  color: string;
}

/** A row in the Recent Deals table. */
export interface RecentDeal {
  ref: string;
  pair: string;
  /** Import / Export (derived from the order's ImpExp). */
  type: string;
  amount: string;
  rate: string;
  status: string;
}

/** A derived alert / notification line. */
export interface AlertItem {
  icon: string;
  text: string;
  variant: 'warn' | 'info' | 'success' | 'danger';
}

/** Everything the dashboard renders, aggregated from real order data. */
export interface DashboardData {
  kpis: Kpi[];
  weeklyActivity: ChartPoint[];
  volumeByPair: ChartPoint[];
  recentDeals: RecentDeal[];
  alerts: AlertItem[];
  /** True when the account has no orders at all. */
  empty: boolean;
}
