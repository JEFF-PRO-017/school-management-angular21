// eleve.service.ts
// Service dédié aux enfants côté espace parent.
//
// Lecture : basée sur CacheService.getFamilles() -> FamilleEnrichi.eleves
//
// ⚠️ IMPORTANT : la méthode `calculerMoyenneGenerale` (et `calculerMoyenneMatiere`)
//    ci-dessous est la fonction demandée à récupérer pour ton propre service.
//    Elle est volontairement autonome (aucune dépendance à CacheService/session)
//    pour que tu puisses la copier telle quelle.
//
// ⚠️ Ajuste les chemins d'import selon ton arborescence réelle.

import { Injectable, inject, signal, computed } from '@angular/core';
import { EleveEnrichi, Note } from '../../../core/models';
import { SessionService } from '../../../core/services/@session/session.service';
import { CacheService } from '../../../core/services/cache.service';

@Injectable({ providedIn: 'root' })
export class EleveService {
  private cache = inject(CacheService);
  private sessionService = inject(SessionService);

  private session = this.sessionService.get();

  private enfantsSignal = signal<EleveEnrichi[]>([]);
  private initialized = false;

  private ensureInit(): void {
    if (this.initialized) return;
    const famille = this.cache
      .getFamilles()
      .find((f: any) => f.id_famille === this.session?.id_famille);
    this.enfantsSignal.set(famille?.eleves ?? []);
    this.initialized = true;
  }

  enfantsFamille = computed(() => {
    this.ensureInit();
    return this.enfantsSignal();
  });

  getById(idEleve: string): EleveEnrichi | undefined {
    this.ensureInit();
    return this.enfantsSignal().find(e => e.id_eleve === idEleve);
  }

  getIndex(idEleve: string): number {
    return this.enfantsFamille().findIndex(e => e.id_eleve === idEleve);
  }

  getSuivant(idEleve: string): EleveEnrichi | undefined {
    const liste = this.enfantsFamille();
    const idx = this.getIndex(idEleve);
    return idx >= 0 && idx < liste.length - 1 ? liste[idx + 1] : undefined;
  }

  getPrecedent(idEleve: string): EleveEnrichi | undefined {
    const liste = this.enfantsFamille();
    const idx = this.getIndex(idEleve);
    return idx > 0 ? liste[idx - 1] : undefined;
  }

  // =========================================================================
  // CALCUL DE LA MOYENNE — fonction autonome à déplacer dans ton propre service
  // =========================================================================

  /**
   * Convertit une note (qui peut être number ou string) en nombre exploitable.
   * Retourne null si la valeur n'est pas convertible (ex: note non saisie).
   */
  private parseNote(valeur: number | string): number | null {
    const n = typeof valeur === 'string' ? parseFloat(valeur.replace(',', '.')) : valeur;
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Calcule la moyenne générale d'un élève, toutes matières et séquences confondues.
   * Chaque note est ramenée sur 20 avant d'être moyennée (moyenne simple, non pondérée).
   *
   * @param eleve Élève enrichi (doit contenir eleve.sequences)
   * @returns Moyenne générale sur 20, arrondie à 2 décimales (0 si aucune note valide)
   */
  calculerMoyenneGenerale(eleve: EleveEnrichi): number {
    const toutesNotes: Note[] = (eleve.sequences ?? []).flatMap(s => s.notes_eleve ?? []);
    const notesSur20 = toutesNotes
      .map(n => {
        const obtenue = this.parseNote(n.note_obtenue);
        if (obtenue === null || !n.note_sur) return null;
        return (obtenue / n.note_sur) * 20;
      })
      .filter((v): v is number => v !== null);

    if (notesSur20.length === 0) return 0;
    const moyenne = notesSur20.reduce((somme, v) => somme + v, 0) / notesSur20.length;
    return Math.round(moyenne * 100) / 100;
  }

  /**
   * Calcule la moyenne d'un élève pour une matière donnée, toutes séquences confondues.
   */
  calculerMoyenneMatiere(eleve: EleveEnrichi, matiere: string): number {
    const notesMatiere: Note[] = (eleve.sequences ?? [])
      .flatMap(s => s.notes_eleve ?? [])
      .filter(n => (n.matiere ?? 'Non renseigné') === matiere);

    const notesSur20 = notesMatiere
      .map(n => {
        const obtenue = this.parseNote(n.note_obtenue);
        if (obtenue === null || !n.note_sur) return null;
        return (obtenue / n.note_sur) * 20;
      })
      .filter((v): v is number => v !== null);

    if (notesSur20.length === 0) return 0;
    const moyenne = notesSur20.reduce((somme, v) => somme + v, 0) / notesSur20.length;
    return Math.round(moyenne * 100) / 100;
  }
}