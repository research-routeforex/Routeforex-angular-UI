import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CATEGORY_META, ResearchReportDetail } from './research.data';
import { ResearchService } from './research.service';

/** Gate state for a Premium report. */
type Gate = 'loading' | 'open' | 'login' | 'denied';

@Component({
  selector: 'app-research-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './research-detail.html',
  styleUrl: './research-detail.scss',
})
export class ResearchDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly service = inject(ResearchService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly report = signal<ResearchReportDetail | null>(null);

  /** Premium-report access gate. Non-premium reports are always 'open'. */
  protected readonly gate = signal<Gate>('loading');
  protected readonly locked = computed(() => {
    const g = this.gate();
    return g === 'login' || g === 'denied';
  });

  /** CKEditor-authored HTML from a trusted admin; render as-is (styles/tables preserved). */
  protected readonly body = signal<SafeHtml>('');

  protected readonly meta = computed(() => {
    const r = this.report();
    return r ? CATEGORY_META[r.category] : null;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.service.getReport(id).subscribe({
      next: (r) => {
        this.report.set(r);
        this.body.set(this.sanitizer.bypassSecurityTrustHtml(r.content || '<p>No content.</p>'));
        this.loading.set(false);
        this.resolveGate(r);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Non-premium → open. Premium → login (guest) / access-check (signed-in). */
  private resolveGate(r: ResearchReportDetail): void {
    if (r.category !== 'premium') {
      this.gate.set('open');
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.gate.set('login');
      return;
    }
    this.service.hasAccess('P').subscribe((allowed) => this.gate.set(allowed ? 'open' : 'denied'));
  }

  /** Send the guest to sign in, returning to this report afterwards. */
  protected login(): void {
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
