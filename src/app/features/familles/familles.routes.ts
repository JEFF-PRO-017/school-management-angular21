// familles.routes.ts — routes lazy de la feature Familles
import { Routes } from '@angular/router';

export const FAMILLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./familles-list/familles-list.component').then(m => m.FamillesListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () =>
      import('./famille-form/famille-form.component').then(m => m.FamilleFormComponent),
  },
  {
    path: ':id/modifier',
    loadComponent: () =>
      import('./famille-form/famille-form.component').then(m => m.FamilleFormComponent),
  },
  {
    path: 'carte',
    loadComponent: () =>
      import('./famille-map/famille-map.component').then(m => m.FamilleMapComponent),
  },
];
