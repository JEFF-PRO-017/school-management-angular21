import { ApplicationRef, inject, Injectable, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);

  /** true dès qu'une nouvelle version est prête et attend confirmation. */
  readonly miseAJourDisponible = signal(false);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    const appIsStable$ = this.appRef.isStable.pipe(first(stable => stable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(() => {
      this.swUpdate.checkForUpdate();
    });

    this.swUpdate.versionUpdates.subscribe(evt => {
      if (evt.type === 'VERSION_READY') {
        // On ne recharge PAS automatiquement : on prévient juste l'UI.
        this.miseAJourDisponible.set(true);
      }
    });

    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('SW irrécupérable:', event.reason);
      document.location.reload();
    });
  }

  /** Appelé quand l'utilisateur clique "Mettre à jour" dans la bannière. */
  appliquerMiseAJour(): void {
    document.location.reload();
  }

  /** Appelé si l'utilisateur ferme la bannière sans recharger (on redemandera plus tard). */
  ignorerPourInstant(): void {
    this.miseAJourDisponible.set(false);
  }
}