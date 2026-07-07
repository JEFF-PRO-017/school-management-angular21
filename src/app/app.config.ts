// app.config.ts
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_ROUTES } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { rateLimitInterceptor } from './core/interceptors/rate-limit.interceptor';
import { DataService } from './core/services/data.service';
import { ParentService } from './core/services/parent.service';

export const appConfig: ApplicationConfig = {

  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),

    // Ordre important : auth d'abord (ajoute le token),
    // puis rate-limit (gère les 429 sur la requête déjà authentifiée)
    provideHttpClient(withInterceptors([authInterceptor, rateLimitInterceptor])),

    provideAnimationsAsync(),

    provideAppInitializer(() => {
      const data = inject(DataService);
      const data_parent = inject(ParentService);

      setTimeout(async () => {
        await data_parent.ensureSheetsTampom();
      }, 300);
      setTimeout(async () => {
        await data.ensureSheets();
      }, 600);
    }),
  ],
};