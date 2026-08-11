import { Routes } from '@angular/router';

export const BROADCAST_GROUP_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Broadcast Group Master — RouteForex',
    loadComponent: () =>
      import('./broadcast-group-master').then((m) => m.BroadcastGroupMasterComponent),
  },
];
