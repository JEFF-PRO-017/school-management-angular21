// paiements.routes.ts
import { Routes } from '@angular/router';

export const PAIEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paiements-list/paiements-list.component').then(m => m.PaiementsListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () =>
      import('./paiement-form/paiement-form.component').then(m => m.PaiementFormComponent),
  },
];
