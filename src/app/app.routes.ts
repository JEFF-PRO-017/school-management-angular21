// app.routes.ts — routes principales avec guards
import { Routes } from '@angular/router';
import { authGuard, permGuard, adminGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  // ── Auth (publique) ──────────────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ── Application (protégée) ───────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Référentiels — admin uniquement
      {
        path: 'familles',
        canActivate: [permGuard], data: { perm: 'familles' },
        loadChildren: () => import('./features/familles/familles.routes').then(m => m.FAMILLES_ROUTES),
      },
      {
        path: 'eleves',
        canActivate: [permGuard], data: { perm: 'eleves' },
        loadChildren: () => import('./features/eleves/eleves.routes').then(m => m.ELEVES_ROUTES),
      },
      {
        path: 'classes',
        canActivate: [permGuard], data: { perm: 'classes' },
        loadChildren: () => import('./features/classes/classes.routes').then(m => m.CLASSES_ROUTES),
      },
      {
        path: 'insolvables',
        canActivate: [permGuard], data: { perm: 'insolvables' },
        loadChildren: () => import('./features/insolvables/insolvables.routes').then(m => m.INSOLVABLES_ROUTES),
      },

      // Pédagogie
      {
        path: 'notes',
        canActivate: [permGuard], data: { perm: 'notes' },
        loadChildren: () => import('./features/notes/notes.routes').then(m => m.NOTES_ROUTES),
      },

      // Absences
      {
        path: 'absences',
        canActivate: [permGuard], data: { perm: 'absences' },
        loadChildren: () => import('./features/absences/absences.routes').then(m => m.ABSENCES_ROUTES),
      },

      // WhatsApp
      {
        path: 'whatsapp',
        canActivate: [permGuard], data: { perm: 'whatsapp' },
        loadChildren: () => import('./features/whatsapp/whatsapp.routes').then(m => m.WHATSAPP_ROUTES),
      },

      // Gestion utilisateurs — admin uniquement
      {
        path: 'users',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES),
      },

    ],
  },

  { path: '**', loadComponent: () => import('./shared/components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) },
];