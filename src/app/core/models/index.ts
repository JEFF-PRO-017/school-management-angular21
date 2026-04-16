// models/index.ts — tous les modèles de données centralisés

// ── Rôles utilisateur ──────────────────────────
export type Role = 'admin' | 'caissier' | 'enseignant';

export interface AppUser {
  id: string;
  nom: string;
  email: string;
  role: Role;
  /** Pour enseignant : liste des id_classe assignées */
  classesAssignees?: string[];
}

// ── Famille (F1) ───────────────────────────────
export interface Famille {
  id_famille: string;
  nom_famille: string;
  tel_pere: string;
  tel_mere: string;
  tel_autre?: string;
  latitude?: number;
  longitude?: number;
  adresse_texte?: string;
  eleves?: Eleve[];  // construit côté app depuis le cache
  montant_total_attendu?: number;
  annee_scolaire?: string;
  montant_reduction?: number;
  commentaire?: string;
  paiements?: Paiement[];  // construit côté app depuis le cache
}

export interface FraisPension {
  id_frais: string;
  montant_total_attendu: number;
  id_famille: string;
  annee_scolaire: string;
  montant_reduction: number;
  commentaire: string;
}

// ── Élève (F2) ────────────────────────────────
export type StatutEleve = 'actif' | 'archive';

export interface Eleve {
  id_eleve: string;
  id_famille: string;
  id_classe: string;
  sequences?: SequenceNote[];  // construit côté app depuis le cache
  nom: string;
  prenom: string;
  date_naissance: string;    // ISO 'YYYY-MM-DD'
  date_inscription: string;
  statut: StatutEleve;
  photo_url?: string;
  //........................... a augmenter des champs si besoin, ex.
  lieu_naissance?: string;
  sexe?: 'M' | 'F';
  matricule?: string;
}

export interface SequenceNote {
  notes_eleve: Note[];
  sequence: Sequence
}

/** Élève enrichi avec jointures (construit côté app depuis le cache) */
export interface EleveEnrichi extends Eleve {
  famille?: Famille;
  classe?: Classe;
  solde?: SoldeSnap;
}

// ── Classe (F3) ───────────────────────────────
export type Cycle = 'primaire' | 'secondaire' | 'superieur';

export interface Classe {
  id_classe: string;
  nom_classe: string;
  eleves?: Eleve[];
  matieres?: MatiereConfig[];  // construit côté app depuis le cache
  niveau: string;
  cycle: Cycle;
  annee_scolaire: string;
  effectif_max: number;
  enseignant_principal?: string;
}

// ── Configuration frais (F5) ──────────────────
export interface FraisConfig {

  id_frais: string;
  id_classe: string;
  type_frais: string;
  montant_total_attendu: number;
  seuil_insolvable: number;
  echeance_1?: string;
  echeance_2?: string;
  echeance_3?: string;
  annee_scolaire: string;
  id_famille?: string;
}

// ── Paiement (F4) ─────────────────────────────
export type ModePaiement = 'cash' | 'mobile' | 'virement';

export interface Paiement {
  id_paiement: string;
  id_eleve?: string;
  id_famille: string;
  montant_verse: number;
  date_paiement: string;
  mode_paiement: ModePaiement;
  periode_concernee: string;
  date_prochain_rdv?: string;
  recu_numero: string;
  notes_caissier?: string;
  statut_alerte_whatsapp: 'EN_ATTENTE' | 'ENVOYE' | 'ECHEC';
}

// ── Snapshot soldes (F9_SNAP) ─────────────────
export interface SoldeSnap {
  id_eleve: string;
  id_famille: string;
  total_verse: number;
  montant_attendu: number;
  reste_a_payer: number;
  statut_insolvable: any;
  dernier_paiement?: string;
  nb_enfants_famille: number;
}

// ── Enseignant (F10) ──────────────────────────
export interface Enseignant {
  id_enseignant: string;
  nom: string;
  prenom: string;
  matieres_enseignees?: string;
  tel?: string;
  email?: string;
  classes_assignees: string;  // CSV des id_classe
  matieres?: MatiereConfig[];  // construit côté app depuis le cache
}

// ── Matière config (F12) ─────────────────────
export interface MatiereConfig {
  id_matiere: string;
  nom_matiere: string;
  id_classe: string;
  id_enseignant: string;
  enseignant?: Enseignant;  // construit côté app depuis le cache
  coefficient: number;
  note_eliminatoire?: number;
  groupe?: string;
  niveau?: string;
}

// ── Note (F6) ────────────────────────────────
export type Sequence = 'SEQ1' | 'SEQ2' | 'SEQ3' | 'SEQ4' | 'SEQ5' | 'SEQ6';
export const SEQUENCES: Sequence[] = ['SEQ1', 'SEQ2', 'SEQ3', 'SEQ4', 'SEQ5', 'SEQ6'];

export interface Note {
  id_note: string;
  id_eleve: string;
  id_classe: string;
  matiere: string;
  id_enseignant: string;
  sequence: Sequence;
  note_obtenue: number;
  note_sur: number;   // 20 par défaut
  annee_scolaire: string;
}

// ── Snapshot bulletin (F11_SNAP) ─────────────
export interface BulletinSnap {
  id_eleve: string;
  id_classe: string;
  sequence: Sequence;
  moy_ponderee: number;
  rang: number;
  premier: number;
  dernier: number;
  mention: string;
  moy_classe: number;
}

// ── Template WhatsApp (F7) ────────────────────
export type TypeMessage = 'rappel' | 'rdv' | 'bulletin' | 'relance';
export type Destinataire = 'pere' | 'mere' | 'les_deux';

export interface MsgTemplate {
  id_template: string;
  type: TypeMessage;
  objet: string;
  contenu: string;   // contient {nom_eleve}, {montant}, {date}, etc.
  destinataire: Destinataire;
  actif: boolean;
  langue: string;
  variables_dynamiques:any;
}

// ── Log alerte (F8) ──────────────────────────
export interface LogAlerte {
  id_log: string;
  id_eleve: string;
  id_famille: string;
  id_template: string;
  numero_dest: string;
  date_envoi: string;
  statut: 'envoye' | 'echec';
  hash_dedup: string;  // id_eleve + type + periode
}
