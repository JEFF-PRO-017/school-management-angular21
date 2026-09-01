// ─────────────────────────────────────────────────────────────────
// parent.routes.ts — Routes du module Espace Parent
// ─────────────────────────────────────────────────────────────────
import { Routes } from '@angular/router';
import { sessionGuard } from '../../core/guards/auth.guard';


export const PARENT_ROUTES: Routes = [
  {
    path: 'espace-parent',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./parent-login/parent-login.component').then(m => m.ParentLoginComponent),
      },
      {
        path: 'inscription',
        loadComponent: () =>
          import('./wizard-inscription/parent-inscription.component').then(m => m.ParentInscriptionComponent),
      },
      {
        path: 'dashboard',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./parent-dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent),
      },
      {
        path: 'paiement',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./components/parent-eleve-paiement.component').then(m => m.ParentPaiementComponent),
      },
      {
        path: 'eleve/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./components/parent-eleve-paiement.component').then(m => m.ParentEleveComponent),
      },
      {
        path: 'notifications',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./components/parent-notifications-enfant.component')
            .then(m => m.ParentNotificationsComponent),
      },
      {
        path: 'ajouter-enfant',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./components/parent-notifications-enfant.component')
            .then(m => m.ParentAjouterEnfantComponent),
      },

      // ── Fallback ─────────────────────────────────────────────────
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'login',
      },
    ],
  },
];