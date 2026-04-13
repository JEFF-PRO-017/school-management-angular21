// notes.routes.ts
import { Routes } from '@angular/router';

export const NOTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./notes-saisie/notes-saisie.component').then(m => m.NotesSaisieComponent),
  },
  {
    path: 'bulletins',
    loadComponent: () =>
      import('./bulletins/bulletins.component').then(m => m.BulletinsComponent),
  },
];
