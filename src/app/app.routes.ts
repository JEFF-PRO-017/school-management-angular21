// app.routes.ts — routes principales avec guards
import { Routes } from '@angular/router';
import { authGuard, sessionGuard } from './core/guards/auth.guard';
import { PARENT_ROUTES } from './features/parents/parent.routes';
import { ADMINISTRATION_ROUTES } from './features/administration/administration.routes';



export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./core/launcher/launcher.component').then(m => m.LauncherComponent) },
  { path: 'admin', loadChildren: () => import('./features/administration/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  {
    path: 'paiement/recus/:id',
    loadComponent: () => import('./features/administration/paiements/components/recu/recu.component').then(r => r.RecuComponent),
    canActivate: [authGuard, sessionGuard],
  },
  {
    path: 'espace-administration',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [sessionGuard],
    children: ADMINISTRATION_ROUTES,
  },
  {
    path: 'espace-parent',
    children: PARENT_ROUTES,
  },

  { path: '**', redirectTo: '' },
  // { path: '**', loadComponent: () => import('./shared/components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) },
];
// ── Guard consultant : vérifie que c'est un admin ou caissier ──────
