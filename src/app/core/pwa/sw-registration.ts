
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