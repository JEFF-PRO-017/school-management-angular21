// eleves.routes.ts
import { Routes } from '@angular/router';

export const ELEVES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./eleves-list/eleves-list.component').then(m => m.ElevesListComponent),
  },
  {
    path: 'nouveau',
    loadComponent: () =>
      import('./eleve-form/eleve-form.component').then(m => m.EleveFormComponent),
  },
  {
    path: ':id/modifier',
    loadComponent: () =>
      import('./eleve-form/eleve-form.component').then(m => m.EleveFormComponent),
  },
];
