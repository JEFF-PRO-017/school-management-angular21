// app.config.ts — configuration principale Angular 21 standalone
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Détection de changements optimisée
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router avec préchargement de tous les modules lazy
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HTTP avec intercepteur d'auth global
    provideHttpClient(withInterceptors([authInterceptor])),

    // Animations Material async (meilleure perf au démarrage)
    provideAnimationsAsync(),

  ],

};
