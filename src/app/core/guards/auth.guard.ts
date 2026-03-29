// auth.guard.ts — redirige vers /auth/login si non connecté
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLogged()) return true;
  return router.createUrlTree(['/auth/login']);
};
