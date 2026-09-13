import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ChartComponent } from '../../shared/components/chart/chart';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData, RecentDeal } from './dashboard.model';
import { DashboardService } from './dashboard.service';

/**
 * Executive dashboard. KPIs, charts, recent deals and alerts are aggregated from
 * the signed-in user's real orders (see {@link DashboardService}).
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    ChartComponent,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly greetingName = this.auth.displayName;

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly kpis = computed(() => this.data()?.kpis ?? []);
  protected readonly weeklyActivity = computed(() => this.data()?.weeklyActivity ?? []);
  protected readonly volumeByPair = computed(() => this.data()?.volumeByPair ?? []);
  protected readonly recentDeals = computed(() => this.data()?.recentDeals ?? []);
  protected readonly alerts = computed(() => this.data()?.alerts ?? []);
  protected readonly empty = computed(() => this.data()?.empty ?? false);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .load()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => this.data.set(data),
        error: () => this.error.set(true),
      });
  }

  /** Chip variant for a (dynamic) order status. */
  protected statusVariant(status: RecentDeal['status']): string {
    const s = status.toLowerCase();
    if (s === 'done' || s === 'invoicegenerated' || s === 'settled') return 'success';
    if (s === 'inactive' || s === 'cancelled' || s === 'canceled') return 'danger';
    if (s === 'upcoming' || s === 'pending' || s === 'new') return 'warn';
    return 'info';
  }
}
