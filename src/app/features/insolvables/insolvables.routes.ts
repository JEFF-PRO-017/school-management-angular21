// insolvables.routes.ts
import { Routes } from '@angular/router';

export const INSOLVABLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./insolvables-list/insolvables-list.component').then(m => m.InsolvablesListComponent),
  },
];
