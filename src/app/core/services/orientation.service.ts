// orientation.service.ts — détecte et réagit aux rotations d'écran
// Utilisé par les composants qui ont un layout différent en portrait/paysage
import { Injectable, signal, effect } from '@angular/core';

export type Orientation = 'portrait' | 'landscape';

@Injectable({ providedIn: 'root' })
export class OrientationService {

  /** Orientation courante de l'écran */
  readonly orientation = signal<Orientation>(this.detect());

  /** true si l'écran est une tablette (largeur >= 768px) */
  readonly isTablet = signal(window.innerWidth >= 768);

  constructor() {
    // Écoute les changements d'orientation natifs
    window.addEventListener('orientationchange', () => {
      // Petit délai pour laisser le navigateur mettre à jour les dimensions
      setTimeout(() => {
        this.orientation.set(this.detect());
        this.isTablet.set(window.innerWidth >= 768);
      }, 100);
    });

    // Fallback via resize pour les navigateurs qui ne supportent pas orientationchange
    window.addEventListener('resize', () => {
      this.orientation.set(this.detect());
      this.isTablet.set(window.innerWidth >= 768);
    });
  }

  private detect(): Orientation {
    // Utilise l'API Screen Orientation si disponible
    if (screen.orientation) {
      return screen.orientation.type.startsWith('portrait')
        ? 'portrait' : 'landscape';
    }
    // Fallback : compare largeur et hauteur
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  /** Demande le verrouillage de l'orientation (nécessite permission sur Android) */
  async lockPortrait(): Promise<void> {
    try {
      await (screen.orientation as any).lock?.('portrait');
    } catch {
      // Ignoré si non supporté (desktop)
    }
  }

  async unlock(): Promise<void> {
    try {
      screen.orientation.unlock?.();
    } catch {}
  }
}
