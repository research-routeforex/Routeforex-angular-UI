import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ChartComponent, ChartPoint } from '../../shared/components/chart/chart';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { AuthService } from '../../core/services/auth.service';

interface Kpi {
  icon: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  color: string;
}

interface RecentDeal {
  ref: string;
  pair: string;
  type: 'Buy' | 'Sell';
  amount: string;
  rate: string;
  status: 'Settled' | 'Pending' | 'Confirmed';
}

/**
 * Executive dashboard. KPI/analytics values are illustrative and should be wired
 * to a future `/Dashboard` aggregation endpoint; the layout and components are
 * production-ready.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    StatCardComponent,
    ChartComponent,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  protected readonly greetingName = this.auth.displayName;

  protected readonly kpis = signal<Kpi[]>([
    {
      icon: 'swap_horiz',
      label: "Today's Deals",
      value: '128',
      delta: '+12.4%',
      trend: 'up',
      color: 'var(--rf-info)',
    },
    {
      icon: 'payments',
      label: 'Turnover (USD)',
      value: '$4.82M',
      delta: '+6.1%',
      trend: 'up',
      color: 'var(--mat-sys-primary)',
    },
    {
      icon: 'trending_up',
      label: 'Net P/L',
      value: '$92,140',
      delta: '+3.8%',
      trend: 'up',
      color: 'var(--rf-success)',
    },
    {
      icon: 'pending_actions',
      label: 'Open Positions',
      value: '17',
      delta: '-2',
      trend: 'down',
      color: 'var(--rf-warn)',
    },
  ]);

  protected readonly turnover = signal<ChartPoint[]>([
    { label: 'Mon', value: 3.1 },
    { label: 'Tue', value: 4.2 },
    { label: 'Wed', value: 3.8 },
    { label: 'Thu', value: 5.1 },
    { label: 'Fri', value: 4.8 },
    { label: 'Sat', value: 2.2 },
    { label: 'Sun', value: 1.4 },
  ]);

  protected readonly volumeByPair = signal<ChartPoint[]>([
    { label: 'USD/INR', value: 42 },
    { label: 'EUR/USD', value: 31 },
    { label: 'GBP/USD', value: 19 },
    { label: 'USD/JPY', value: 24 },
    { label: 'AUD/USD', value: 12 },
  ]);

  protected readonly recentDeals = signal<RecentDeal[]>([
    { ref: 'DL-10293', pair: 'USD/INR', type: 'Buy', amount: '$250,000', rate: '83.21', status: 'Settled' },
    { ref: 'DL-10294', pair: 'EUR/USD', type: 'Sell', amount: '€180,000', rate: '1.0842', status: 'Pending' },
    { ref: 'DL-10295', pair: 'GBP/USD', type: 'Buy', amount: '£95,000', rate: '1.2710', status: 'Confirmed' },
    { ref: 'DL-10296', pair: 'USD/JPY', type: 'Sell', amount: '$320,000', rate: '156.40', status: 'Settled' },
    { ref: 'DL-10297', pair: 'USD/INR', type: 'Buy', amount: '$140,000', rate: '83.18', status: 'Pending' },
  ]);

  protected readonly alerts = signal([
    { icon: 'warning', text: '3 deals awaiting settlement past T+2', variant: 'warn' },
    { icon: 'info', text: 'RBI reference rate updated 10 minutes ago', variant: 'info' },
    { icon: 'check_circle', text: 'End-of-day reconciliation completed', variant: 'success' },
  ]);

  protected statusVariant(status: RecentDeal['status']): string {
    return status === 'Settled' ? 'success' : status === 'Pending' ? 'warn' : 'info';
  }
}
