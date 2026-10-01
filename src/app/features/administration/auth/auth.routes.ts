// auth.routes.ts
import { Routes } from '@angular/router';
import { loginIsValidGuard } from '../../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [loginIsValidGuard],
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
