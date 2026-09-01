// parent.models.ts — Modèles du module Espace Parent
// ─────────────────────────────────────────────────
// Étend les modèles principaux avec les tables tampon
// et les types spécifiques à l'espace parent.

import { Famille, Eleve, Paiement, Absence, Note, Sequence } from './last_index';

// ── Session parent ────────────────────────────────────────────────

/** Clé localStorage pour la session parent */
/** Clé localStorage pour le cache données parent */
export const PARENT_DATA_KEY    = 'parent_data_cache';
/** Intervalle de rafraîchissement automatique en ms (10 min) */
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;


// ── Données enrichies côté parent ────────────────────────────────

export interface EleveParent {
  id_eleve:       string;
  nom:            string;
  prenom:         string;
  id_classe:      string;
  nom_classe:     string;
  niveau:         string;
  statut:         'actif' | 'archive';
  moyennes:       MoyenneParent[];       // une par séquence disponible
  moy_trimestrielle: number | null;
  rang:           number | null;
  effectif_classe: number;
  absences_count: number;
  absences_non_justifiees: number;
  derniere_absence: string | null;       // date ISO
}

export interface MoyenneParent {
  sequence: Sequence;
  moyenne:  number | null;
}

export interface PaiementParent {
  montant_attendu:  number;
  montant_paye:     number;
  reste_a_payer:    number;
  taux_paiement:    number;              // 0–100
  dernier_paiement: string | null;       // date ISO
  prochain_rdv:     string | null;       // date ISO
  rdv_depasse:      boolean;
  historique:       Paiement[];
}

export interface DashboardParent {
  famille:    Famille;
  eleves:     EleveParent[];
  paiement:   PaiementParent;
  notifications: NotifParent[];
}

// ── Notifications ─────────────────────────────────────────────────

export type NotifType = 'absence' | 'note' | 'rdv' | 'paiement' | 'info';

export interface NotifParent {
  id:      string;
  type:    NotifType;
  titre:   string;
  corps:   string;
  date:    string;    // ISO
  lue:     boolean;
  urgente: boolean;   // affichage rouge
}

// ── Tables tampon (inscription + ajout enfant) ────────────────────
// Mêmes champs que les tables principales + date_enregistrement

export interface FamilleTampon extends Omit<Famille, 'eleves' | 'paiements'> {
  date_enregistrement: string;   // ISO
  statut_validation:   'en_attente' | 'valide' | 'refuse';
}

export interface EleveTampon extends Omit<Eleve, 'famille' | 'classe' | 'sequences'> {
  date_enregistrement: string;
  statut_validation:   'en_attente' | 'valide' | 'refuse';
  id_famille_tampon?:  string;   // si famille pas encore validée
}

export interface PensionTampon {
  id:                  string;
  id_famille:          string;
  montant_total_attendu: number;
  annee_scolaire:      string;
  montant_reduction:   number;
  commentaire:         string;
  date_enregistrement: string;
  statut_validation:   'en_attente' | 'valide' | 'refuse';
}

// ── Demande de paiement initiée par le parent ─────────────────────

export interface DemandePaiement {
  id:                string;
  id_famille:        string;
  montant:           number;
  mode_paiement:     'cash' | 'mobile_money';
  reference?:        string;    // N° reçu mobile money
  commentaire?:      string;
  date_demande:      string;    // ISO
  statut:            'en_attente' | 'valide' | 'refuse';
}

// ── Wizard d'inscription — état ────────────────────────────────────


// ── Sheets tampon — noms des feuilles ──────────────────────────────

export const SHEET_TAMPON = {
  familles:  'T1_FAMILLE_TAMPON',
  eleves:    'T2_ELEVE_TAMPON',
  pensions:  'T3_PENSION_TAMPON',
  paiements: 'T4_PAIEMENT_DEMANDE',
} as const;

export const H_TAMPON = {
  familles: [
    'id_famille', 'nom_famille', 'tel_pere', 'tel_mere', 'tel_autre',
    'adresse_texte', 'date_enregistrement', 'statut_validation',
  ],
  eleves: [
    'id_eleve', 'id_famille', 'id_classe', 'nom', 'prenom',
    'date_naissance', 'sexe', 'statut',
    'date_enregistrement', 'statut_validation',
  ],
  pensions: [
    'id', 'id_famille', 'montant_total_attendu', 'annee_scolaire',
    'montant_reduction', 'commentaire', 'date_enregistrement', 'statut_validation',
  ],
  paiements: [
    'id', 'id_famille', 'montant', 'mode_paiement', 'reference',
    'commentaire', 'date_demande', 'statut',
  ],
} as const;