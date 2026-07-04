import {
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * Structural directive that renders its content only when the current user holds
 * at least one of the given roles. Reactive — re-evaluates if the session changes.
 *
 *   <button *appHasRole="['Admin']">Delete</button>
 */
@Directive({
  selector: '[appHasRole]',
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly appHasRole = input.required<string[]>();

  private visible = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.hasAnyRole(this.appHasRole());
      if (allowed && !this.visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.visible = true;
      } else if (!allowed && this.visible) {
        this.viewContainer.clear();
        this.visible = false;
      }
    });
  }
}
