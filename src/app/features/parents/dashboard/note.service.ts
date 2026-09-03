// note.service.ts
// Service centralisé pour tout ce qui concerne le calcul académique (moyennes),
// sur le même principe que FamilleService pour le financier.
//
// Règle validée : SEQ1+SEQ2 = Trimestre 1, SEQ3+SEQ4 = Trimestre 2, SEQ5+SEQ6 = Trimestre 3.
// On prend automatiquement le trimestre le plus récent où l'élève a au moins une note.
import { Injectable } from '@angular/core';
import { EleveEnrichi, Note, Sequence } from '../../../core/models';

/** Regroupement des 6 séquences en 3 trimestres, du plus ancien au plus récent. */
const TRIMESTRES: Sequence[][] = [
  ['SEQ1', 'SEQ2'],
  ['SEQ3', 'SEQ4'],
  ['SEQ5', 'SEQ6'],
];

/** Résultat du calcul pour un élève : moyenne sur 20 + nombre de notes prises en compte. */
export interface BilanTrimestre {
  moyenne: number | null;  // null si aucune note exploitable
  nbEvaluations: number;
}

@Injectable({ providedIn: 'root' })
export class NoteService {

  /** Calcule la moyenne + le nombre d'évaluations du trimestre en cours pour un élève. */
  bilanTrimestreEnCours(eleve: EleveEnrichi): BilanTrimestre {
    const groupes = eleve.sequences ?? [];
    const trimestre = this.trimestreLePlusRecentAvecNotes(groupes);
    if (!trimestre) return { moyenne: null, nbEvaluations: 0 };

    const notes = this.notesDuTrimestre(groupes, trimestre);
    return this.calculerBilan(notes);
  }

  //renvoi de façon aléatoire une note avec sa matière sur le trimestre en cours pour un élève
  noteAleatoireTrimestreEnCours(eleve: EleveEnrichi): Note | null {
    const groupes = eleve.sequences ?? [];
    const trimestre = this.trimestreLePlusRecentAvecNotes(groupes);
    if (!trimestre) return null;

    const notes = this.notesDuTrimestre(groupes, trimestre);
    if (!notes.length) return null;

    return notes[Math.floor(Math.random() * notes.length)];
  }

  /** Parcourt les trimestres du plus récent au plus ancien, retourne le premier qui a des notes. */
  private trimestreLePlusRecentAvecNotes(
    groupes: { sequence: Sequence; notes_eleve: Note[] }[]
  ): Sequence[] | null {
    for (let i = TRIMESTRES.length - 1; i >= 0; i--) {
      const seqs = TRIMESTRES[i];
      const aDesNotes = groupes.some(g => seqs.includes(g.sequence) && g.notes_eleve.length > 0);
      if (aDesNotes) return seqs;
    }
    return null;
  }

  /** Regroupe toutes les notes des séquences appartenant au trimestre choisi. */
  private notesDuTrimestre(
    groupes: { sequence: Sequence; notes_eleve: Note[] }[], trimestre: Sequence[]
  ): Note[] {
    return groupes.filter(g => trimestre.includes(g.sequence)).flatMap(g => g.notes_eleve);
  }

  /** Moyenne sur 20 (ignore les notes non numériques, ex: "ABS") + nombre exploité. */
  private calculerBilan(notes: Note[]): BilanTrimestre {
    const valeurs = notes.map(n => this.noteSur20(n)).filter((v): v is number => v !== null);
    if (!valeurs.length) return { moyenne: null, nbEvaluations: 0 };

    const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
    return { moyenne, nbEvaluations: valeurs.length };
  }

  /** Convertit une note vers une base 20. Retourne null si non numérique ou incomplète.
   *  Public : réutilisée telle quelle par les composants d'affichage (ex: note aléatoire),
   *  pour ne jamais dupliquer la règle de conversion. */
  noteSur20(n: Note): number | null {
    const obtenue = typeof n.note_obtenue === 'string' ? parseFloat(n.note_obtenue) : n.note_obtenue;
    if (obtenue === null || obtenue === undefined || isNaN(obtenue) || !n.note_sur) return null;
    return (obtenue / n.note_sur) * 20;
  }
}