// absences.routes.ts
import { Routes } from '@angular/router';

export const ABSENCES_ROUTES: Routes = [
  {
    path: 'enregistrement',
    loadComponent: () =>
      import('./saisie/absences-saisie.component').then(m => m.AbsencesSaisieComponent),
  },
  {
    path: 'historique',
    loadComponent: () =>
      import('./list/absences-list.component').then(m => m.AbsencesListComponent),
  },
];