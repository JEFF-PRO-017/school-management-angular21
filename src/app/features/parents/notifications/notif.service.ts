// notif.service.ts
// Service dédié aux notifications côté espace parent.
//
// Lecture : basée sur CacheService.getFamilles() -> FamilleEnrichi.notifications
// Tri : notifications urgentes non lues en premier, puis non lues, puis lues.
//
// ⚠️ Marquage "lu" géré en mémoire uniquement pour l'instant (TODO : brancher
//    sur une vraie persistance — aucune méthode dédiée n'existait dans
//    AddServices/PatchServices au moment de la génération).
// ⚠️ Ajuste les chemins d'import selon ton arborescence réelle.

import { Injectable, inject, signal, computed } from "@angular/core";
import { NotifParent } from "../../../core/models";
import { SessionService } from "../../../core/services/@session/session.service";
import { CacheService } from "../../../core/services/cache.service";


@Injectable({ providedIn: 'root' })
export class NotifService {
  private cache = inject(CacheService);
  private sessionService = inject(SessionService);

  private session = this.sessionService.get();

  private notificationsSignal = signal<NotifParent[]>([]);
  private initialized = false;

  private ensureInit(): void {
    if (this.initialized) return;
    const famille = this.cache
      .getFamilles()
      .find((f: any) => f.id_famille === this.session?.id_famille);
    this.notificationsSignal.set(famille?.notifications ?? []);
    this.initialized = true;
  }

  /** Score de priorité : plus petit = plus prioritaire (urgente+non lue en premier). */
  private prioriteDe(n: NotifParent): number {
    const urgente = n.urgente ?? false;
    const lue = n.lue ?? false;
    if (urgente && !lue) return 0;
    if (!lue) return 1;
    return 2;
  }

  /**
   * Liste triée par priorité (urgentes non lues > non lues > lues),
   * puis par date décroissante au sein de chaque groupe.
   */
  notificationsTriees = computed(() => {
    this.ensureInit();
    return [...this.notificationsSignal()].sort((a, b) => {
      const diffPriorite = this.prioriteDe(a) - this.prioriteDe(b);
      if (diffPriorite !== 0) return diffPriorite;
      return (b.date ?? '').localeCompare(a.date ?? '');
    });
  });

  getById(id: string): NotifParent | undefined {
    this.ensureInit();
    return this.notificationsSignal().find(n => n.id === id);
  }

  /** Index de la notification dans la liste triée (pour la navigation swipe). */
  getIndexTrie(id: string): number {
    return this.notificationsTriees().findIndex(n => n.id === id);
  }

  getSuivante(id: string): NotifParent | undefined {
    const liste = this.notificationsTriees();
    const idx = this.getIndexTrie(id);
    return idx >= 0 && idx < liste.length - 1 ? liste[idx + 1] : undefined;
  }

  getPrecedente(id: string): NotifParent | undefined {
    const liste = this.notificationsTriees();
    const idx = this.getIndexTrie(id);
    return idx > 0 ? liste[idx - 1] : undefined;
  }

  /** Marque une notification comme lue (silencieux, pas de re-tri visuel immédiat nécessaire). */
  marquerCommeLue(id: string): void {
    this.ensureInit();
    this.notificationsSignal.update(list =>
      list.map(n => (n.id === id ? { ...n, lue: true } : n))
    );
    // TODO: persister le marquage "lu" (AddServices/PatchServices n'exposaient
    // aucune méthode dédiée aux notifications au moment de la génération).
  }

  nbNonLues = computed(() => {
    this.ensureInit();
    return this.notificationsSignal().filter(n => !n.lue).length;
  });
}