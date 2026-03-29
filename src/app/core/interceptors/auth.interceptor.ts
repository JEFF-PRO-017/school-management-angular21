// auth.interceptor.ts — injecte le token Bearer sur tous les appels Sheets
// Le token est géré par GoogleSheetsService (rafraîchissement auto JWT)
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // L'intercepteur ne touche que les appels vers l'API Google Sheets
  // Le token est déjà ajouté par GoogleSheetsService.getHeaders()
  // Cet intercepteur peut être étendu pour ajouter des logs ou retries
  return next(req);
};
