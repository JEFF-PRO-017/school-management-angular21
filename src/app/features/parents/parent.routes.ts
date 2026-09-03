// ─────────────────────────────────────────────────────────────────
// parent.routes.ts — Routes du module Espace Parent
// ─────────────────────────────────────────────────────────────────
import { Routes } from '@angular/router';
import { sessionGuard } from '../../core/guards/auth.guard';


export const PARENT_ROUTES: Routes = [
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
    loadComponent: () =>
      import('./dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent),
  },
  {
    path: 'paiement',
    loadComponent: () =>
      import('./components/parent-eleve-paiement.component').then(m => m.ParentPaiementComponent),
  },
  // {
  //   path: 'eleve/:id',
  //   loadComponent: () =>
  //     import('./components/parent-eleve-paiement.component').then(m => m.ParentEleveComponent),
  // },
  // {
  //   path: 'notifications',
  //   loadComponent: () =>
  //     import('./components/parent-notifications-enfant.component')
  //       .then(m => m.ParentNotificationsComponent),
  // },
  {
    path: 'ajouter-enfant',
    loadComponent: () =>
      import('./components/parent-notifications-enfant.component')
        .then(m => m.ParentAjouterEnfantComponent),
  },

  { path: 'moratoires', loadComponent: () => import('./moratoires/list/moratoires-list.component').then(m => m.MoratoiresListComponent) },
  { path: 'moratoires/create', loadComponent: () => import('./moratoires/form/moratoire-form.component').then(m => m.MoratoireFormComponent) },
  { path: 'moratoires/:id', loadComponent: () => import('./moratoires/form/moratoire-form.component').then(m => m.MoratoireFormComponent) },

  { path: 'paiements', loadComponent: () => import('./paiements/list/paiements-list.component').then(m => m.PaiementsListComponent) },
  { path: 'paiements/create', loadComponent: () => import('./paiements/form/paiement-form.component').then(m => m.PaiementFormComponent) },

  { path: 'notifications', loadComponent: () => import('./notifications/list/notifications-list.component').then(m => m.NotificationsListComponent) },
  { path: 'notifications/:id', loadComponent: () => import('./notifications/detail/notification-detail.component').then(m => m.NotificationDetailComponent) },

  { path: 'enfants', loadComponent: () => import('./enfants/list/enfants-list.component').then(m => m.EnfantsListComponent) },
  { path: 'enfants/:id', loadComponent: () => import('./enfants/detail/enfant-detail.component').then(m => m.EnfantDetailComponent) }, 
  // // ── Fallback ─────────────────────────────────────────────────
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  // {
  //   path: '**',
  //   redirectTo: 'login',
  // },
];