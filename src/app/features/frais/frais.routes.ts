// frais.routes.ts — configuration des frais scolaires
import { Routes } from '@angular/router';

export const FRAIS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./frais-list/frais-list.component').then(m => m.FraisListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () =>
      import('./frais-form/frais-form.component').then(m => m.FraisFormComponent),
  },
  {
    path: ':id/modifier',
    loadComponent: () =>
      import('./frais-form/frais-form.component').then(m => m.FraisFormComponent),
  },
];
