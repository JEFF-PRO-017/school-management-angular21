// ─────────────────────────────────────────────────────────────────
// FICHIER 1 : manifest.webmanifest
// Placer dans : src/manifest.webmanifest
// ─────────────────────────────────────────────────────────────────
/*
{
  "name": "CSB Berceau du Savoir — Espace Parent",
  "short_name": "EspaceParent",
  "description": "Suivez la scolarité de vos enfants",
  "start_url": "/espace-parent/login",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#F0F4F8",
  "theme_color": "#185FA5",
  "lang": "fr",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "assets/screenshots/dashboard.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Tableau de bord parent"
    }
  ]
}
*/

// ─────────────────────────────────────────────────────────────────
// FICHIER 2 : ngsw-config.json (Angular Service Worker)
// Placer dans : src/ngsw-config.json
// ─────────────────────────────────────────────────────────────────
/*
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app-shell",
      "installMode": "prefetch",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2|ani|eot)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "parent-api",
      "urls": [
        "https://sheets.googleapis.com/v4/**"
      ],
      "cacheConfig": {
        "maxSize": 50,
        "maxAge": "10m",
        "timeout": "5s",
        "strategy": "freshness"
      }
    }
  ]
}
*/

// ─────────────────────────────────────────────────────────────────
// FICHIER 3 : sw-registration.ts — Enregistrement du SW + sync
// Placer dans : src/app/core/pwa/sw-registration.ts
// ─────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PwaService {

  private swUpdate = inject(SwUpdate);

  /** Signal réseau — utile pour afficher le mode hors-ligne */
  online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online',  () => { this.online = true; });
      window.addEventListener('offline', () => { this.online = false; });
    }

    // Notifie l'utilisateur si une mise à jour est disponible
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        if (confirm('Une mise à jour de l\'application est disponible. Recharger ?')) {
          window.location.reload();
        }
      });
  }

  /** Installe l'app (déclenche l'invite d'installation) */
  async installerApp(): Promise<void> {
    // L'event 'beforeinstallprompt' est capturé globalement
    const prompt = (window as any).__installPrompt;
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      (window as any).__installPrompt = null;
    }
  }

  /** Force une vérification de mise à jour */
  async verifierMaj(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      await this.swUpdate.checkForUpdate();
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FICHIER 4 : main.ts — Capture beforeinstallprompt
// Ajouter dans src/main.ts AVANT bootstrapApplication()
// ─────────────────────────────────────────────────────────────────
/*
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__installPrompt = e;
});
*/

// ─────────────────────────────────────────────────────────────────
// FICHIER 5 : app.config.ts — Activer le Service Worker Angular
// ─────────────────────────────────────────────────────────────────
/*
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode }            from '@angular/core';

export const appConfig = {
  providers: [
    // ... autres providers
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
*/

// ─────────────────────────────────────────────────────────────────
// FICHIER 6 : angular.json — Activer PWA dans le build
// Ajouter dans projects.{nom}.architect.build.options :
// ─────────────────────────────────────────────────────────────────
/*
"serviceWorker": true,
"ngswConfigPath": "src/ngsw-config.json"
*/

// ─────────────────────────────────────────────────────────────────
// INSTALL PWA — Commande unique
// ─────────────────────────────────────────────────────────────────
/*
ng add @angular/pwa --project=<nom-projet>

Cette commande :
  1. Installe @angular/service-worker
  2. Crée ngsw-config.json
  3. Crée manifest.webmanifest
  4. Modifie angular.json automatiquement
  5. Génère les icônes par défaut dans assets/icons/
*/