// app.routes.ts — routes principales avec lazy loading complet
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Authentification — sans guard
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // Layout principal protégé
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Admin uniquement
      {
        path: 'familles',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/familles/familles.routes').then(m => m.FAMILLES_ROUTES),
      },
      {
        path: 'eleves',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/eleves/eleves.routes').then(m => m.ELEVES_ROUTES),
      },
      {
        path: 'classes',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/classes/classes.routes').then(m => m.CLASSES_ROUTES),
      },
      {
        path: 'frais',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/frais/frais.routes').then(m => m.FRAIS_ROUTES),
      },

      // Admin + Caissier
      {
        path: 'paiements',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'caissier'] },
        loadChildren: () =>
          import('./features/paiements/paiements.routes').then(m => m.PAIEMENTS_ROUTES),
      },
      {
        path: 'insolvables',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'caissier'] },
        loadChildren: () =>
          import('./features/insolvables/insolvables.routes').then(m => m.INSOLVABLES_ROUTES),
      },

      // Admin + Enseignant
      {
        path: 'notes',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'enseignant'] },
        loadChildren: () =>
          import('./features/notes/notes.routes').then(m => m.NOTES_ROUTES),
      },

      // Admin uniquement
      {
        path: 'whatsapp',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/whatsapp/whatsapp.routes').then(m => m.WHATSAPP_ROUTES),
      },
    ],
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/page-not-found/page-not-found.component')
        .then(m => m.PageNotFoundComponent),
  },
];
