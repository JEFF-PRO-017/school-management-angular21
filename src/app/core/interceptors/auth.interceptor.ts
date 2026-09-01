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


export const sessionProlongement: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);


  console.log('sessionInterceptor : sessionService.doitEtreRenouvelee()', sessionService.get());

  // Session valide mais proche de l'expiration (moins de 5 min) : on la prolonge
  if (sessionService.doitEtreRenouvelee()) {
    sessionService.renouveler();
  }
  console.log('sessionInterceptor : session prolongée, expires_at =', sessionService.get()?.expires_at);

  return next(req);
};