// ─────────────────────────────────────────────────────────────────
// models.ts — types centraux de l'application
// ─────────────────────────────────────────────────────────────────

// ── Permissions (liste exhaustive stockée côté client) ────────────
export const PERMISSIONS = [
  { id: 'familles', label: 'Familles', section: 'both' },
  { id: 'eleves', label: 'Élèves', section: 'both' },
  { id: 'classes', label: 'Classes', section: 'both' },
  // { id: 'frais',       label: 'Frais',            section: 'both'      },
  { id: 'validation_parents', label: 'Validation parents', section: 'both' },
  { id: 'insolvables', label: 'Insolvables', section: 'both' },
  { id: 'notes', label: 'Notes', section: 'both' },
  { id: 'bulletins', label: 'Bulletins', section: 'both' },
  { id: 'absences', label: 'Absences', section: 'both' },
  { id: 'whatsapp', label: 'WhatsApp', section: 'both' },
  { id: 'users', label: 'Gestion utilisateurs', section: 'both' },
  { id: 'matieres', label: 'Matières', section: 'both' },
] as const;

export type PermissionId = typeof PERMISSIONS[number]['id'];
export type Section = 'primaire' | 'secondaire';
export type Role = 'admin' | 'enseignant' | 'caissier' | 'surveillant';

// ── Utilisateur ───────────────────────────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  mot_de_passe: string;  // hashé bcrypt (stocké dans Sheets)
  nom: string;
  role: Role;
  is_admin: boolean;
  section: Section;
  permissions: PermissionId[];  // liste des permissions accordées
}

/** Élève enrichi avec jointures (construit côté app depuis le cache) */
export interface EleveEnrichi extends Eleve {
  famille?: Famille;
  classe?: Classe;
  solde?: SoldeSnap;
}
// ── Permission_User (log d'assignation) ──────────────────────────
export interface PermissionUser {
  id: string;
  user_id: string;
  permission_id: PermissionId;
  date_dassignation: string;
}

// ── Absence ───────────────────────────────────────────────────────
export interface Absence {
  id: string;
  id_enfant: string;   // id_eleve
  id_famille: string;
  id_classe: string;
  date: string;   // YYYY-MM-DD
  heure: string;   // HH:MM
  justifie: boolean;
  motif?: string;
}

// ── Modèles existants (ré-exportés pour centralisation) ──────────
export interface Famille {
  id_famille: string;
  nom_famille: string;
  tel_pere: string;
  tel_mere: string;
  tel_autre?: string;
  latitude?: number;
  longitude?: number;
  adresse_texte?: string;
  eleves?: Eleve[];
  paiements?: Paiement[];
  montant_total_attendu?: number;
  annee_scolaire?: string;
  montant_reduction?: number;
  commentaire?: string;
}

export interface Eleve {
  id_eleve: string;
  id_famille: string;
  id_classe: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  lieu_naissance?: string;
  date_inscription?: string;
  statut: 'actif' | 'archive';
  sexe?: 'M' | 'F';
  matricule?: string;
  famille?: Famille;
  classe?: Classe;
  sequences?: { sequence: Sequence; notes_eleve: Note[] }[];
}

export interface Classe {
  id_classe: string;
  nom_classe: string;
  niveau: string;
  cycle: Section;
  annee_scolaire: string;
  effectif_max: number;
  enseignant_principal: string;
  eleves?: Eleve[];
  matieres?: MatiereConfig[];
}

export interface FraisConfig {
  id_frais: string;
  id_famille?: string;
  id_classe: string;
  type_frais: string;
  montant_total_attendu: number;
  montant_reduction: number;
  seuil_insolvable: number;
  annee_scolaire: string;
  commentaire?: string;
}

export interface Enseignant {
  id_enseignant: string;
  nom: string;
  prenom: string;
  tel: string;
  email: string;
  classes_assignees: string;
}
// ── Paiement (F4) ─────────────────────────────
export type ModePaiement = 'cash' | 'mobile' | 'virement';
export interface MatiereConfig {
  id_matiere: string;
  nom_matiere: string;
  id_classe: string;
  coefficient: number | string;
  note_eliminatoire?: number;
  groupe?: string;
  niveau?: any;
  id_enseignant: string;
  enseignant?: Enseignant;
  classe?: Classe;
}

export interface Paiement {
  id_paiement: string;
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

export interface SoldeSnap {
  id_eleve: string;
  id_famille: string;
  total_verse: number;
  montant_attendu: number;
  reste_a_payer: number;
  statut_insolvable: string | boolean;
  dernier_paiement: string;
  nb_enfants_famille: number;
}

export interface BulletinSnap {
  id_eleve: string;
  id_classe: string;
  sequence: string;
  moy_ponderee: number;
  rang: number;
  premier: number;
  dernier: number;
  mention: string;
  moy_classe: number;
}

export interface MsgTemplate {
  id_template: string;
  type: string;
  objet: string;
  contenu: string;
  variables_dynamiques?: string;
  actif: boolean;
  langue: string;
  destinataire: string;
}

export interface LogAlerte {
  id_log: string;
  id_eleve: string;
  id_famille: string;
  id_template: string;
  numero_dest: string;
  date_envoi: string;
  statut: 'envoye' | 'echec';
  hash_dedup: string;
}

export type Sequence = 'SEQ1' | 'SEQ2' | 'SEQ3' | 'SEQ4' | 'SEQ5' | 'SEQ6';
export const SEQUENCES: Sequence[] = ['SEQ1', 'SEQ2', 'SEQ3', 'SEQ4', 'SEQ5', 'SEQ6'];