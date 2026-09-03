// paiement.service.ts
// Service dédié à la gestion des paiements côté espace parent.
//
// Lecture : basée sur CacheService.getFamilles() -> FamilleEnrichi.paiements
// Création : réellement branchée sur AddServices.addPaiement() (déjà existant).
//
// ⚠️ Ajuste les chemins d'import selon ton arborescence réelle.

import { Injectable, inject, signal, computed } from '@angular/core';
import { Paiement } from '../../../core/models';
import { AddServices } from '../../../core/services/@data';
import { SessionService } from '../../../core/services/@session/session.service';
import { CacheService } from '../../../core/services/cache.service';


@Injectable({ providedIn: 'root' })
export class PaiementService {
  private cache = inject(CacheService);
  private sessionService = inject(SessionService);
  private addServices = inject(AddServices);

  private session = this.sessionService.get();

  private paiementsSignal = signal<Paiement[]>([]);
  private initialized = false;

  /** Retourne tous les paiements de la famille connectée (tous statuts confondus). */
  getPaiementsFamille(): Paiement[] {
    this.ensureInit();
    return this.paiementsSignal();
  }

  paiementsFamille = computed(() => {
    this.ensureInit();
    return this.paiementsSignal();
  });

  private ensureInit(): void {
    if (this.initialized) return;
    const famille = this.cache
      .getFamilles()
      .find((f: any) => f.id_famille === this.session?.id_famille);
    this.paiementsSignal.set(famille?.paiements ?? []);
    this.initialized = true;
  }

  /** Crée un paiement (statut initial 'crée', à valider ensuite côté administration). */
  async createPaiement(paiement: Paiement): Promise<void> {
    this.ensureInit();
    this.paiementsSignal.update(list => [...list, paiement]);
    await this.addServices.addPaiement(paiement);
  }

  /** Génère un identifiant provisoire côté client (à remplacer si l'ID est généré serveur). */
  generateId(): string {
    return `PAI-${Date.now()}`;
  }
}