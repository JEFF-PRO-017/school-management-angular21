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
import { PermissionId } from '../models';
import { AuthService } from '../services/auth.service';

// ── Guard : connecté ─────────────────────────────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLogged() ? true : router.createUrlTree(['/auth/login']);
};

// ── Guard : permission spécifique ────────────────────────────────
// Usage dans les routes :
//   { path: 'paiements', canActivate: [authGuard, permGuard],
//     data: { perm: 'paiements' }, ... }
export const permGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const perm    = route.data['perm'] as PermissionId | undefined;
  if (!perm || auth.hasPermission(perm)) return true;
  return router.createUrlTree(['/dashboard']);
};

// ── Guard : admin uniquement ─────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};