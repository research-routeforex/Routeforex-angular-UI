import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Lightweight, dependency-free SVG chart (bar or area/line). Keeps the bundle
 * lean for the dashboard; swap for ngx-charts / ApexCharts if richer interaction
 * is needed — the consuming API (a list of {label,value}) stays the same.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <svg
      class="chart"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      role="img"
    >
      <!-- gridlines -->
      @for (gl of gridLines(); track gl) {
        <line [attr.x1]="pad" [attr.x2]="width - pad" [attr.y1]="gl" [attr.y2]="gl" class="chart__grid" />
      }

      @if (type() === 'bar') {
        @for (b of bars(); track b.label) {
          <rect
            [attr.x]="b.x"
            [attr.y]="b.y"
            [attr.width]="b.w"
            [attr.height]="b.h"
            rx="3"
            [attr.fill]="color()"
          >
            <title>{{ b.label }}: {{ b.value }}</title>
          </rect>
        }
      } @else {
        <path [attr.d]="areaPath()" [attr.fill]="color()" fill-opacity="0.14" />
        <path [attr.d]="linePath()" fill="none" [attr.stroke]="color()" stroke-width="2.5" />
        @for (p of points(); track p.label) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="color()">
            <title>{{ p.label }}: {{ p.value }}</title>
          </circle>
        }
      }

      <!-- x labels -->
      @for (p of points(); track p.label) {
        <text [attr.x]="p.x" [attr.y]="height - 6" text-anchor="middle" class="chart__label">
          {{ p.label }}
        </text>
      }
    </svg>
  `,
  styles: [
    `
      .chart {
        width: 100%;
        height: 100%;
        display: block;
      }
      .chart__grid {
        stroke: var(--rf-border);
        stroke-width: 1;
      }
      .chart__label {
        fill: var(--mat-sys-on-surface-variant);
        font-size: 11px;
      }
    `,
  ],
})
export class ChartComponent {
  readonly data = input<ChartPoint[]>([]);
  readonly type = input<'bar' | 'line'>('bar');
  readonly color = input('var(--mat-sys-primary)');

  protected readonly width = 600;
  protected readonly height = 240;
  protected readonly pad = 28;

  private readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
  private readonly plotW = computed(() => this.width - this.pad * 2);
  private readonly plotH = computed(() => this.height - this.pad - 22);

  protected readonly gridLines = computed(() => {
    const steps = 4;
    const lines: number[] = [];
    for (let i = 0; i <= steps; i++) {
      lines.push(this.pad + (this.plotH() / steps) * i);
    }
    return lines;
  });

  protected readonly points = computed(() => {
    const items = this.data();
    if (!items.length) return [];
    const step = this.plotW() / Math.max(1, items.length - 1);
    return items.map((d, i) => ({
      ...d,
      x: this.pad + step * i,
      y: this.pad + this.plotH() * (1 - d.value / this.max()),
    }));
  });

  protected readonly bars = computed(() => {
    const items = this.data();
    if (!items.length) return [];
    const slot = this.plotW() / items.length;
    const w = Math.min(46, slot * 0.6);
    return items.map((d, i) => {
      const h = this.plotH() * (d.value / this.max());
      return {
        ...d,
        x: this.pad + slot * i + (slot - w) / 2,
        y: this.pad + this.plotH() - h,
        w,
        h,
      };
    });
  });

  protected readonly linePath = computed(() =>
    this.points()
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const baseline = this.pad + this.plotH();
    const line = pts.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${pts[0].x} ${baseline} ${line} L ${pts[pts.length - 1].x} ${baseline} Z`;
  });
}
