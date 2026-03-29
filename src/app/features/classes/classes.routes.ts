// classes.routes.ts
import { Routes } from '@angular/router';

export const CLASSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./classes-list/classes-list.component').then(m => m.ClassesListComponent),
  },
  {
    path: 'nouvelle',
    loadComponent: () =>
      import('./classe-form/classe-form.component').then(m => m.ClasseFormComponent),
  },
  {
    path: ':id/modifier',
    loadComponent: () =>
      import('./classe-form/classe-form.component').then(m => m.ClasseFormComponent),
  },
];
