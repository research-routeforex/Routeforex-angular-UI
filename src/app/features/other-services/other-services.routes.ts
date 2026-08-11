import { Routes } from '@angular/router';

export const OTHER_SERVICES_ROUTES: Routes = [
  {
    path: '',
    title: 'Other Services — RouteForex',
    loadComponent: () => import('./other-services').then((m) => m.OtherServicesComponent),
  },
];
