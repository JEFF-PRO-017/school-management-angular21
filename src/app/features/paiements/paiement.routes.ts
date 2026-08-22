// ─────────────────────────────────────────────────────────────────
// PAIEMENT.routes.ts — Routes du module Espace PAIEMENT
// ─────────────────────────────────────────────────────────────────
import { Routes } from '@angular/router';

export const PAIEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paiements-gestion-list.component').then(m => m.PaiementsGestionListComponent),
  },
];