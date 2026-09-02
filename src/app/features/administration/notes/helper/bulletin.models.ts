// bulletin.models.ts — tous les types du système bulletins

import { MatiereConfig, Sequence, Eleve } from "../../../../core/models/last_index";

export interface GroupeMatiere {
  nom: string;
  matieres: MatiereConfig[];
}

/** Config modifiable via le modal (titre, trimestre, année) */
export interface BulletinConfig {
  titre: string;       // ex: "BULLETIN TRIMESTRIEL 2"
  trimestre: number;   // 1 | 2 | 3
  annee: string;       // "2025-2026"
  sequences: Sequence[];
}

/** Données complètes d'un bulletin */
export interface BulletinData {
  numero_eleve?: string;
  eleve: Eleve;
  nomClasse: string;
  niveau: NiveauClasse;
  config: BulletinConfig;
  groupes: GroupeMatiere[];
  rang: number | null;
  effectif: number;
  moyPremier: number | null;
  moyDernier: number | null;
  tauxReussite: number | null;
  moyGeneraleClasse: number | null;
  absJustifiees: number;
  absNonJustifiees: number;
  appreciations: string;
  avertissementConduite: boolean;
  blameConduite: boolean;
  consigne: number;
  exclusion: number;
  retards: number;
  conseilDiscipline: boolean;
}

export interface PVData {
  nomClasse: string;
  config: BulletinConfig;
  matieres: MatiereConfig[];
  lignes: PVLigne[];
}

export interface PVLigne {
  numero: number;
  eleve: Eleve;
  notesParSeq: { [seq: string]: (number | null)[] }; // notes par séquence et par matière
  moyParSeq: { [seq: string]: number | null };
  moyGlobale: number | null;
  total: number | null;
  rang: number | null;
  decision: 'ADMIS' | 'ECHEC' | '';
}

export interface FicheSaisieData {
  nomClasse: string;
  nomEcole: string;
  sequences: Sequence[];
  annee: string;
  matieres: MatiereConfig[];
  eleves: Eleve[];
}

/** Niveaux qui déterminent le renderer PDF à utiliser */
export type NiveauClasse =
  | 'primaire'
  | 'secondaire-fr'   // Francophone : 6e → Terminale
  | 'secondaire-ang'  // Anglophone / bilingue
  | 'technique';      // Séries techniques / pro