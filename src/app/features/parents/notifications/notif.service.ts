// notif.service.ts
// Service MÉTIER uniquement (aucun accès aux données).
// Lecture : ParentService.famille()?.notifications (toutes) et
//           ParentService.notifications() (non lues, déjà exposé pour badges/compteurs).
// Écriture ("marquer comme lue") : ParentService.marquerLue(id) — méthode déjà réelle,
// ne pas la dupliquer ici.

import { Injectable } from '@angular/core';
import { NotifParent } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class NotifService {
  /** Score de priorité : plus petit = plus prioritaire (urgente+non lue en premier). */
  private prioriteDe(n: NotifParent): number {
    const urgente = n.urgente ?? false;
    const lue = n.lue ?? false;
    if (urgente && !lue) return 0;
    if (!lue) return 1;
    return 2;
  }

  /**
   * Trie une liste de notifications : urgentes non lues > non lues > lues,
   * puis par date décroissante au sein de chaque groupe. Défensif si liste vide/undefined.
   */
  trierParPriorite(liste: NotifParent[] | undefined | null): NotifParent[] {
    return [...(liste ?? [])].sort((a, b) => {
      const diff = this.prioriteDe(a) - this.prioriteDe(b);
      if (diff !== 0) return diff;
      return (b.date ?? '').localeCompare(a.date ?? '');
    });
  }

  iconeDe(type: NotifParent['type'] | undefined): string {
    const icones: Record<string, string> = {
      absence: 'bi-calendar-x',
      note: 'bi-journal-text',
      rdv: 'bi-calendar-event',
      paiement: 'bi-cash-coin',
      info: 'bi-info-circle',
    };
    return icones[type ?? 'info'] ?? 'bi-bell';
  }

  /**
   * Trouve la position et les voisins (précédente/suivante) d'une notification
   * au sein d'une liste déjà triée (même ordre que la page liste, pour une
   * navigation swipe cohérente).
   */
  trouverVoisins(listeTriee: NotifParent[], id: string): {
    index: number;
    total: number;
    precedente?: NotifParent;
    suivante?: NotifParent;
  } {
    const liste = listeTriee ?? [];
    const index = liste.findIndex(n => n.id === id);
    return {
      index,
      total: liste.length,
      precedente: index > 0 ? liste[index - 1] : undefined,
      suivante: index >= 0 && index < liste.length - 1 ? liste[index + 1] : undefined,
    };
  }
}