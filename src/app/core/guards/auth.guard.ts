// ─────────────────────────────────────────────────────────────────
// guards.ts — guards de navigation Angular
//
// Changements vs version précédente :
//  - authGuard    : redirige vers /auth/login si non connecté
//  - permGuard    : vérifie une PermissionId (data['perm'])
//                   remplace roleGuard — plus granulaire
//  - adminGuard   : réservé aux administrateurs
// ─────────────────────────────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PermissionId } from '../models/last_index';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/@session/session.service';

// ── Guard : connecté ─────────────────────────────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLogged() ? true : router.createUrlTree(['/admin/login']);
};

// ── Guard : permission spécifique ────────────────────────────────
// Usage dans les routes :
//   { path: 'paiements', canActivate: [authGuard, permGuard],
//     data: { perm: 'paiements' }, ... }
export const permGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const perm    = route.data['perm'] as PermissionId | undefined;
  if (!perm || auth.hasPermission(perm) || auth.isAdmin()) return true;
  return router.navigate(['/espace-administration/dashboard']);
};

// ── Guard : admin uniquement ─────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() ? true : router.navigate(['/espace-administration/dashboard']);
};



export const sessionGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.isValid()) {
    return true; // accès autorisé
  }

  // On lit la session AVANT de la supprimer, pour savoir vers quel login rediriger
  const session = sessionService.get();
  const route = sessionService.getLoginRoute(session);
  // sessionService.clear();

  // createUrlTree = redirection directe, sans appel supplémentaire à router.navigate
  return router.createUrlTree(route);
};