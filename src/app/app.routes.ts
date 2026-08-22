// app.routes.ts — routes principales avec guards
import { Router, Routes } from '@angular/router';
import { authGuard, permGuard, adminGuard } from './core/guards/auth.guard';
import { PARENT_ROUTES } from './features/parents/parent.routes';
import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';



const routes: Routes = [
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
        loadChildren: () => import('./features/eleves/eleves.routes').then(m => m.ELEVES_ROUTES)
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
      {
        path: 'matieres',
        canActivate: [permGuard], data: { perm: 'matieres' },
        loadChildren: () => import('./features/matieres/matieres.routes').then(m => m.MATIERES_ROUTES),
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
      {
        path: 'paiement',
        canActivate: [permGuard], data: { perm: 'paiement' },
        loadChildren: () => import('./features/paiements/paiement.routes').then(r => r.PAIEMENT_ROUTES)
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
      // ── Espace consultant (guard staff) ─────────────────────────
      {
        path: 'consultant',
        canActivate: [consultantGuard],
        loadComponent: () =>
          import('./features/validation/validation-page.component')
            .then(m => m.ValidationPageComponent),
      },

    ],
  },

  // { path: '**', loadComponent: () => import('./shared/components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) },
];

export const APP_ROUTES: Routes = [...routes, ...PARENT_ROUTES];

// ── Guard consultant : vérifie que c'est un admin ou caissier ──────
export function consultantGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin() || auth.hasPermission('validation_parents')) return true;
  return router.createUrlTree(['/dashboard']);
}