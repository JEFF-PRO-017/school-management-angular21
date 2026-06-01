// notes.routes.ts
import { Routes } from '@angular/router';

export const MATIERES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./matieres-list/matieres-list.component').then(m => m.MatieresListComponent),
  },

];
