import { Routes } from '@angular/router';

export const BROADCAST_MESSAGE_ROUTES: Routes = [
  {
    path: '',
    title: 'Broadcast Message — RouteForex',
    loadComponent: () => import('./broadcast-message').then((m) => m.BroadcastMessageComponent),
  },
];
