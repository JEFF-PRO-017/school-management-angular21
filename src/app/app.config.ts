// app.config.ts — configuration principale Angular 21 standalone
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { APP_ROUTES } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { DataService } from './core/services/data.service';
import { ParentService } from './core/services/parent.service';

export const appConfig: ApplicationConfig = {

  providers: [
    // Détection de changements optimisée
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router avec préchargement de tous les modules lazy
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),

    // HTTP avec intercepteur d'auth global
    provideHttpClient(withInterceptors([authInterceptor])),

    // Animations Material async (meilleure perf au démarrage)
    provideAnimationsAsync(),

    // Initialisation au démarrage : crée les feuilles Sheets si absentes
    // puis charge toutes les données en cache
    provideAppInitializer(() => {
      const data = inject(DataService);
      const data_parent = inject(ParentService)

      setTimeout(async () => {
        await data_parent.ensureSheetsTampom()
      }, 300)
      setTimeout(async () => {
        await data.ensureSheets()
      }, 600)

    })
  ],

};
