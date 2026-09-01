// app.config.ts
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_ROUTES } from './app.routes';
import { authInterceptor, sessionInterceptor } from './core/interceptors/auth.interceptor';
import { rateLimitInterceptor } from './core/interceptors/rate-limit.interceptor';
import { ParentService } from './core/services/parent.service';
import { DataServiceBase } from './core/services/@data/_data.base.service';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {

  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),

    // Ordre important : auth d'abord (ajoute le token),
    // puis rate-limit (gère les 429 sur la requête déjà authentifiée)
    provideHttpClient(withInterceptors([authInterceptor, rateLimitInterceptor,sessionInterceptor])),

    provideAnimationsAsync(),

    provideAppInitializer(() => {
      const data = inject(DataServiceBase);
      const data_parent = inject(ParentService);

      setTimeout(async () => {
        await data.ensureSheets();
      }, 600);
    }), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ],
};