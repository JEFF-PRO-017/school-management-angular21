// familles.routes.ts — routes lazy de la feature Familles
import { Routes } from '@angular/router';

export const FAMILLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./familles-list/familles-list.component').then(m => m.FamillesListComponent),
  },
  {
    path: 'carte',
    loadComponent: () =>
      import('./famille-map/famille-map.component').then(m => m.FamilleMapComponent),
  },
  {
    path:':id',
    loadComponent: () =>
      import('./famille-detail/famille-detail.component').then(m => m.FamilleDetailComponent),
  }
];
