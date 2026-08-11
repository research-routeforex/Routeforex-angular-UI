import { Routes } from '@angular/router';

export const USER_COMPANY_MAPPING_ROUTES: Routes = [
  {
    path: '',
    title: 'User Company Mapping — RouteForex',
    loadComponent: () =>
      import('./user-company-mapping').then((m) => m.UserCompanyMappingComponent),
  },
];
