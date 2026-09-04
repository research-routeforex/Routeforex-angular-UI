import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CATEGORIES, CATEGORY_META, Category, ResearchReport } from './research.data';
import { ResearchService } from './research.service';

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  active?: boolean;
  blank?: boolean;
}

/** Live site base — every nav link points at the hosted RouteForex pages. */
const RF = 'https://www.routeforex.com';

/** Full site menu, ported from the legacy BindHeader() function. */
const MENU: NavItem[] = [
  { label: 'Home', href: RF + '/', active: true },
  {
    label: 'About Us', href: RF + '/about-us/', children: [
      { label: 'Vision & Mission', href: RF + '/about-us/vision-and-mission/' },
      { label: 'Corporate Values', href: RF + '/about-us/corporate-values/' },
      { label: 'Routeforex Philosophy', href: RF + '/about-us/routeforex-philosophy/' },
      { label: 'Testimonials', href: RF + '/about-us/testimonials/' },
    ],
  },
  {
    label: 'Our Services', href: RF + '/our-services/', children: [
      {
        label: 'Forex Transaction Processing', href: RF + '/our-services/forex-transaction-processing/', children: [
          { label: 'Forex Live Rate Check', href: RF + '/our-services/forex-live-rate-check/' },
          { label: 'Forex Historical Rate Check', href: RF + '/our-services/forex-historical-rate-check/' },
          { label: 'Forex Trial Transaction', href: RF + '/our-services/forex-trial-transaction/' },
        ],
      },
      { label: 'Forex Risk Advisory', href: RF + '/our-services/forex-risk-advisory/' },
      { label: 'Forex & Commodity Advisory as Profit Centre', href: RF + '/our-services/forex-commodity-advisory-as-profit-centre/' },
      { label: 'Forex & Commodity Research Report', href: RF + '/our-services/forex-commodity-research-report/' },
      { label: 'Broking Services', href: RF + '/our-services/broking/' },
      { label: 'Management & Executive Dashboard', href: RF + '/our-services/management-and-executive-dashboard/' },
      { label: 'Money Changing Service', href: RF + '/our-services/money-exchange-delhi/' },
      { label: 'Mutual Fund Investment', href: RF + '/our-services/mutual-fund-investment/' },
      { label: 'Liquid Funds', href: RF + '/our-services/liquid-funds/' },
    ],
  },
  {
    label: 'Pricing', href: RF + '/pricing/', children: [
      { label: 'Forex Transaction Processing', href: RF + '/pricing/index.html#forex-transaction-processing' },
      { label: 'FX & Commodity Research Service', href: RF + '/pricing/index.html#fx-and-commodity-research-services' },
      { label: 'Broking', href: RF + '/pricing/index.html#broking' },
      { label: 'Forex Risk Advisory', href: RF + '/pricing/index.html#forex-risk-advisory' },
      { label: 'Offers & Promotions', href: RF + '/offers-promotion/' },
    ],
  },
  {
    label: 'Update', href: RF + '/update/news-and-media/', children: [
      { label: 'News & Media', href: RF + '/update/news-and-media/' },
      {
        label: 'Events', href: RF + '/update/events/', children: [
          { label: 'Upcoming Events (coming soon)', href: RF + '/update/events/upcoming-events/' },
          { label: 'Past Events', href: RF + '/update/events/past-events/' },
        ],
      },
      {
        label: 'Gallery', href: RF + '/gallery/', children: [
          { label: 'Image Gallery', href: RF + '/gallery/image-gallery/' },
          { label: 'Video Gallery', href: RF + '/gallery/video-gallery/' },
        ],
      },
    ],
  },
  {
    label: "FAQ's", href: RF + '/faqs/', children: [
      { label: 'Rate Check', href: RF + '/faqs/index.html#rate-check' },
      { label: 'Historical Rate Audit', href: RF + '/faqs/index.html#historical-rate-audit' },
      { label: 'Trial Transaction', href: RF + '/faqs/index.html#trial-transaction' },
      { label: 'Forex Transaction Processing', href: RF + '/faqs/index.html#forex-transaction-processing' },
      { label: 'Management Dashboard', href: RF + '/faqs/index.html#management-dashboard' },
      { label: 'Money Changing', href: RF + '/faqs/index.html#money-changing' },
    ],
  },
  {
    label: 'Publications', href: RF + '/publications/research/', children: [
      { label: 'Research', href: RF + '/publications/research/' },
      { label: 'Case Study', href: RF + '/publications/case-study/' },
      { label: 'Blog', href: 'http://blog.routeforex.com/', blank: true },
    ],
  },
];

/**
 * Research publications — a full standalone public page replicating the legacy
 * /publications/research: marketing top-bar + full dropdown nav + hero banner,
 * then a filterable gallery of report cards. Nav links point to the live site.
 */
@Component({
  selector: 'app-research',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './research.html',
  styleUrl: './research.scss',
})
export class ResearchComponent implements OnInit {
  private readonly service = inject(ResearchService);
  private readonly auth = inject(AuthService);

  protected readonly RF = RF;
  protected readonly menu = MENU;

  /** Signed-in state for the top bar (show user details instead of Login/Register). */
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly displayName = this.auth.displayName;

  protected readonly categories = CATEGORIES;
  protected readonly selected = signal<Category | 'all'>('all');
  protected readonly loading = signal(true);
  private readonly reports = signal<ResearchReport[]>([]);

  protected readonly filtered = computed(() => {
    const c = this.selected();
    return c === 'all' ? this.reports() : this.reports().filter((r) => r.category === c);
  });

  ngOnInit(): void {
    this.service.getReports().subscribe({
      next: (rows) => {
        this.reports.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected select(c: Category | 'all'): void {
    this.selected.set(c);
  }

  /** Sign out but stay on the public Research page (no redirect to login). */
  protected logout(event: Event): void {
    event.preventDefault();
    this.auth.logout(false);
  }

  protected tag(c: Category): string {
    return CATEGORY_META[c].label;
  }

  protected icon(c: Category): string {
    return CATEGORY_META[c].icon;
  }
}
