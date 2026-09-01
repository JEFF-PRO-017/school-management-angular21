// auth.interceptor.ts — injecte le token Bearer sur tous les appels Sheets
// Le token est géré par GoogleSheetsService (rafraîchissement auto JWT)
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { SessionService } from '../services/@session/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // L'intercepteur ne touche que les appels vers l'API Google Sheets
  // Le token est déjà ajouté par GoogleSheetsService.getHeaders()
  // Cet intercepteur peut être étendu pour ajouter des logs ou retries
  return next(req);
};


export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (!sessionService.isValid()) {
    const session = sessionService.get();
    const route = sessionService.getLoginRoute(session);
    sessionService.clear();
    router.navigate(route);

    // On annule la requête sans l'envoyer au serveur (session déjà morte)
    return throwError(() => new Error('Session expirée'));
  }

  return next(req);
};