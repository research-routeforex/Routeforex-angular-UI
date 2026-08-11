import { Routes } from '@angular/router';

export const FTP_UPCOMING_DEAL_ROUTES: Routes = [
  {
    path: '',
    title: 'FTP Upcoming Deal — RouteForex',
    loadComponent: () =>
      import('./upcoming-deal-list/upcoming-deal-list').then((m) => m.UpcomingDealListComponent),
  },
  {
    path: ':id',
    title: 'Upcoming Deal — RouteForex',
    loadComponent: () =>
      import('./upcoming-deal-detail/upcoming-deal-detail').then((m) => m.UpcomingDealDetailComponent),
  },
];
