// ─────────────────────────────────────────────────────────────────
// parent.routes.ts — Routes du module Espace Parent
// ─────────────────────────────────────────────────────────────────
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ParentService } from '../../core/services/parent.service';

export function parentGuard() {
  debugger
  const svc = inject(ParentService);
  const router = inject(Router);
  if (svc.estConnecte()) return true;
  return router.createUrlTree(['/espace-parent/login']);
}



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
          import('./components/parent-inscription.component').then(m => m.ParentInscriptionComponent),
      },
      {
        path: 'dashboard',
        canActivate: [parentGuard],
        loadComponent: () =>
          import('./parent-dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent),
      },
      {
        path: 'paiement',
        canActivate: [parentGuard],
        loadComponent: () =>
          import('./components/parent-eleve-paiement.component').then(m => m.ParentPaiementComponent),
      },
      {
        path: 'eleve/:id',
        canActivate: [parentGuard],
        loadComponent: () =>
          import('./components/parent-eleve-paiement.component').then(m => m.ParentEleveComponent),
      },
      {
        path: 'notifications',
        canActivate: [parentGuard],
        loadComponent: () =>
          import('./components/parent-notifications-enfant.component')
            .then(m => m.ParentNotificationsComponent),
      },
      {
        path: 'ajouter-enfant',
        canActivate: [parentGuard],
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