// role.guard.ts — bloque l'accès si le rôle ne correspond pas
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const allowed = (route.data['roles'] as Role[]) ?? [];
  if (auth.hasRole(...allowed)) return true;
  // Redirige vers dashboard sans exposer la raison du refus
  return router.createUrlTree(['/dashboard']);
};
