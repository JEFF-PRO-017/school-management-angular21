// familles.routes.ts — routes lazy de la feature Familles
import { Routes } from '@angular/router';

export const ELEVES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./eleves-gestion-list.component').then(m => m.ElevesGestionListComponent),
  }
];
