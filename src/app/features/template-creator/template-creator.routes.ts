import { Routes } from '@angular/router';

export const TEMPLATE_CREATOR_ROUTES: Routes = [
  {
    path: '',
    title: 'Template Creator — RouteForex',
    loadComponent: () => import('./template-creator').then((m) => m.TemplateCreatorComponent),
  },
];
