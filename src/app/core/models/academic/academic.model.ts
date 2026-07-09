import { EleveEnrichi } from '../family';
import { Section, Sequence, Sexe, StatutEleve } from '../shared';


// classe 
export interface Classe {
  id_classe: string;
  nom_classe: string;
  niveau: string;
  cycle: Section;
  annee_scolaire: string;
  effectif_max: number;
  enseignant_principal: string;
  prix: number,
  eleves?: EleveEnrichi[];
  matieres?: MatiereConfig[];
}

// eleve
export interface Eleve {
  id_eleve: string;
  id_famille: string;
  id_classe: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  lieu_naissance?: string;
  date_inscription?: string;
  statut: StatutEleve;
  sexe?: Sexe;
  matricule?: string;
}

// matiere
export interface Enseignant {
  id_enseignant: string;
  nom: string;
  prenom: string;
  tel: string;
  email: string;
  classes_assignees: string;
}

export interface EnseignantEnrichie extends Enseignant {
  classes_assignees_infos: Classe,
  matieres: MatiereConfig[]
}

export interface MatiereConfig {
  id_matiere: string;
  nom_matiere: string;
  id_classe: string;
  coefficient: number | string;
  note_eliminatoire?: number;
  groupe?: string;
  niveau?: string;
  id_enseignant: string;
  classe?:Classe
}

// note
export interface Note {
  id_note: string;
  id_eleve: string;
  id_classe: string;
  matiere: string;
  id_enseignant: string;
  sequence: Sequence;
  note_obtenue: number | string;
  note_sur: number;
  annee_scolaire: string;
}

// Absence
export interface Absence {
  id: string;
  id_eleve: string;   // id_eleve
  id_famille: string;
  id_classe: string;
  id_pointage:string;
  date: string;   // YYYY-MM-DD
  heure: string;   // HH:MM
  justifie: boolean;
  motif?: string;
}

export interface PointageModalData {
  id_classe   : string;
  nom_classe  : string;
  date        : string;   // YYYY-MM-DD
  heure_debut : string;   // HH:mm — pré-rempli depuis ctrlHeure
  nb_absents  : number;
}

export interface PointageResult {
  id_pointage    : string
  id_matiere     : string;
  id_enseignants : string;
  date_debut     : string;  // ISO
  date_fin       : string;  // ISO
  duree          : number;  // minutes
}
