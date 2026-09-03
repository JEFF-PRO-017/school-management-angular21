// eleve.service.ts
// Service MÉTIER uniquement (aucun accès aux données).
// Lecture : ParentService.famille()?.eleves (EleveEnrichi[]).
//
// ⚠️ Fonction demandée à récupérer pour ton propre service :
//    `calculerMoyenneGenerale`. Elle est volontairement autonome
//    (aucune dépendance à un autre service) pour être copiable telle quelle.
//
// Logique alignée sur celle déjà utilisée dans ParentService (calcMoySeq/calcMoyTrim) :
// moyenne pondérée par le coefficient de chaque matière (eleve.classe.matieres),
// généralisée à TOUTES les séquences présentes (pas seulement SEQ1-3).
// Si aucun coefficient n'est disponible (classe/matières non enrichies),
// on retombe sur une moyenne simple non pondérée — valeur par défaut sûre.

import { Injectable } from '@angular/core';
import { EleveEnrichi, Note } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class EleveService {
  /** Convertit une note (number | string) en nombre exploitable, ou null si invalide. */
  private parseNote(valeur: number | string | undefined | null): number | null {
    if (valeur === undefined || valeur === null) return null;
    const n = typeof valeur === 'string' ? parseFloat(valeur.replace(',', '.')) : valeur;
    return Number.isFinite(n) ? n : null;
  }

  /** Coefficient d'une matière pour la classe de l'élève (1 par défaut si non trouvé). */
  private coefficientDe(eleve: EleveEnrichi, matiere: string): number {
    const config = eleve.classe?.matieres?.find((m: any) => m.nom_matiere === matiere);
    const c = config ? +(config as any).coefficient : NaN;
    return Number.isFinite(c) && c > 0 ? c : 1;
  }

  /**
   * Moyenne générale d'un élève, toutes matières et séquences confondues,
   * pondérée par coefficient de matière. Chaque note est ramenée sur 20.
   * Retourne 0 si aucune note valide (valeur par défaut sûre).
   */
  calculerMoyenneGenerale(eleve: EleveEnrichi): number {
    const toutesNotes: Note[] = (eleve.sequences ?? []).flatMap(s => s.notes_eleve ?? []);
    let pointsPonderes = 0;
    let sommeCoefficients = 0;

    for (const n of toutesNotes) {
      const obtenue = this.parseNote(n.note_obtenue);
      if (obtenue === null || !n.note_sur) continue;
      const sur20 = (obtenue / n.note_sur) * 20;
      const coeff = this.coefficientDe(eleve, n.matiere ?? '');
      pointsPonderes += sur20 * coeff;
      sommeCoefficients += coeff;
    }

    if (sommeCoefficients === 0) return 0;
    return Math.round((pointsPonderes / sommeCoefficients) * 100) / 100;
  }

  /** Moyenne d'une matière donnée pour un élève, toutes séquences confondues. */
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

  getIndex(liste: any[], idEleve: string): number {
    return liste.findIndex(e => e.id_eleve === idEleve);
  }

  getSuivant(liste: any[], idEleve: string): EleveEnrichi | undefined {
    const idx = this.getIndex(liste, idEleve);
    return idx >= 0 && idx < liste.length - 1 ? liste[idx + 1] : undefined;
  }

  getPrecedent(liste: any[], idEleve: string): EleveEnrichi | undefined {
    const idx = this.getIndex(liste, idEleve);
    return idx > 0 ? liste[idx - 1] : undefined;
  }

  getById(liste:any[] ,idEleve: string): EleveEnrichi | undefined {
    return liste.find(e => e.id_eleve === idEleve);
  }


}