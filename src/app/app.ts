import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

/** Root shell — the router renders either the auth or main layout below. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    const router = inject(Router);
    const appRef = inject(ApplicationRef);

    // Zoneless safety net: after a navigation, the freshly activated lazy
    // component's OnPush children (page-header, fields, selects, mat-icons) can
    // miss their first change-detection flush — they render blank until a click
    // wakes the scheduler. Force one tick after each NavigationEnd so the new
    // view paints fully on arrival. Microtask-deferred to avoid a recursive tick.
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => queueMicrotask(() => appRef.tick()));
  }
}
