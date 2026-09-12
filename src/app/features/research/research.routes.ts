import { Routes } from '@angular/router';

export const RESEARCH_ROUTES: Routes = [
  {
    path: '',
    title: 'Research — RouteForex',
    loadComponent: () => import('./research').then((m) => m.ResearchComponent),
  },
  {
    path: ':id',
    title: 'Research Report — RouteForex',
    loadComponent: () => import('./research-detail').then((m) => m.ResearchDetailComponent),
  },
];
