// moratoire.service.ts
// Service dédié à la gestion des moratoires côté espace parent.
//
// ⚠️ INTERFACE DÉFINIE ICI — la persistance réelle (Google Sheets / cache / queue)
//    n'est pas encore branchée. Les points d'intégration sont marqués TODO :
//    à connecter avec AddServices / PatchServices / CacheService existants
//    (ex: addMoratoire -> AddServices, updateMoratoire -> PatchServices).
//
// En attendant, le service fonctionne en mémoire à partir des données déjà
// présentes dans FamilleEnrichi.moratoires (via FamilleService).

import { Injectable, inject, signal, computed } from '@angular/core';
import { FamilleService, Moratoire } from '../../../core/models';
import { SessionService } from '../../../core/services/@session/session.service';


@Injectable({ providedIn: 'root' })
export class MoratoireService {
  private familleService = inject(FamilleService);
  private sessionService = inject(SessionService);

  private session = this.sessionService.get();

  /** Store local en attendant le branchement réel. */
  private moratoiresSignal = signal<Moratoire[]>([]);
  private initialized = false;

  /** Retourne les moratoires de la famille connectée. */
  getMoratoiresFamille(): Moratoire[] {
    this.ensureInit();
    return this.moratoiresSignal();
  }

  /** Version signal/computed exploitable directement dans un template. */
  moratoiresFamille = computed(() => {
    this.ensureInit();
    return this.moratoiresSignal();
  });

  getMoratoireById(idMoratoire: string): Moratoire | undefined {
    return this.getMoratoiresFamille().find(m => m.id_moratoire === idMoratoire);
  }

  /** Charge les moratoires depuis FamilleEnrichi (une seule fois, à la demande). */
  private ensureInit(): void {
    // if (this.initialized) return;
    // const famille = this.familleService
    //   .getFamilles()
    //   .find((f: any) => f.id_famille === this.session?.id_famille);
    // this.moratoiresSignal.set(famille?.moratoires ?? []);
    // this.initialized = true;
  }

  /**
   * Crée un moratoire.
   * TODO: brancher sur AddServices (ex: this.addServices.addMoratoire(m))
   *       + persistance queue/cache réelle.
   */
  async createMoratoire(moratoire: Moratoire): Promise<void> {
    this.ensureInit();
    this.moratoiresSignal.update(list => [...list, moratoire]);
    // TODO: this.addServices.addMoratoire(moratoire);
  }

  /**
   * Met à jour un moratoire existant.
   * TODO: brancher sur PatchServices (ex: this.patchServices.updateMoratoire(m))
   */
  async updateMoratoire(moratoire: Moratoire): Promise<void> {
    this.ensureInit();
    this.moratoiresSignal.update(list =>
      list.map(m => (m.id_moratoire === moratoire.id_moratoire ? moratoire : m))
    );
    // TODO: this.patchServices.updateMoratoire(moratoire);
  }

  /**
   * Supprime (ou archive) un moratoire.
   * TODO: à adapter selon ta logique métier réelle (suppression physique
   *       vs statut 'NON-ACTIF' comme pour deleteEleve dans PatchServices).
   */
  async deleteMoratoire(idMoratoire: string): Promise<void> {
    this.ensureInit();
    this.moratoiresSignal.update(list => list.filter(m => m.id_moratoire !== idMoratoire));
    // TODO: this.patchServices.updateMoratoire({ ...moratoire, statut: 'NON-ACTIF' });
  }

  /** Génère un identifiant provisoire côté client (à remplacer si l'ID est généré serveur). */
  generateId(): string {
    return `MOR-${Date.now()}`;
  }
}