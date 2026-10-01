import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_ROUTES } from './app.routes';
import { authInterceptor, sessionProlongement } from './core/interceptors/auth.interceptor';
import { rateLimitInterceptor } from './core/interceptors/rate-limit.interceptor';
import { DataServiceBase } from './core/services/@data/_data.base.service';
import { provideServiceWorker } from '@angular/service-worker';
import { UpdateService } from './core/services/update.service';
import { CacheService } from './core/services/cache.service';

export const appConfig: ApplicationConfig = {

  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),

    provideHttpClient(withInterceptors([authInterceptor, rateLimitInterceptor, sessionProlongement])),

    provideAnimationsAsync(),

    provideAppInitializer(async () => {
      const data = inject(DataServiceBase);
      const cache = inject(CacheService);

      // 1. On attend le cache : l'UI démarre avec les données locales
      await cache.hydrate();

      // 2. Ensuite seulement, on rafraîchit depuis Sheets, sans bloquer le démarrage
      setTimeout(() => {
        data.ensureSheets().catch(err => console.warn('ensureSheets a échoué', err));
      }, 600);
    }),

    // AJOUTÉ — même pattern que ton initializer existant
    provideAppInitializer(() => {
      const updateService = inject(UpdateService);
      updateService.init();
    }),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
};