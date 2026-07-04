import { computed, Injectable, signal } from '@angular/core';

/**
 * Global, signal-based loading indicator. The loading interceptor increments on
 * each request and decrements on completion; the layout shows a top progress bar
 * whenever `isLoading()` is true. Uses a counter so concurrent requests behave.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);

  readonly isLoading = computed(() => this.count() > 0);

  start(): void {
    this.count.update((c) => c + 1);
  }

  stop(): void {
    this.count.update((c) => (c > 0 ? c - 1 : 0));
  }

  reset(): void {
    this.count.set(0);
  }
}
