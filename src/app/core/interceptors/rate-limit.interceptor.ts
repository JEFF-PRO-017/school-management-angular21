import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

const PAUSE_MS = 60_000;
let pauseJusqua = 0; // état partagé entre toutes les requêtes de l'app

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {

  const envoyer = (): Observable<HttpEvent<unknown>> => {
    console.warn(`→ envoi requête : ${req.method} ${req.url}`);

    return next(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 429) {
          pauseJusqua = Date.now() + PAUSE_MS;
          console.warn(`429 reçu sur ${req.url} — pause globale de ${PAUSE_MS / 1000}s jusqu'à ${new Date(pauseJusqua).toLocaleTimeString()}`);
          console.warn(`⏸ requête mise en attente (retry) : ${req.method} ${req.url}`);
          return timer(PAUSE_MS).pipe(mergeMap(() => {
            console.warn(`▶ fin de pause — nouvelle tentative : ${req.method} ${req.url}`);
            return envoyer();
          }));
        }
        console.warn(`✕ erreur non gérée (${err.status}) sur ${req.url}`);
        return throwError(() => err);
      })
    );
  };

  const attente = pauseJusqua - Date.now();

  if (attente > 0) {
    console.warn(`⏳ pause déjà active — requête retardée de ${Math.round(attente / 1000)}s : ${req.method} ${req.url}`);
    return timer(attente).pipe(mergeMap(() => envoyer()));
  }

  return envoyer();
};