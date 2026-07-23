// mock-data.ts — Jeu de données de test cohérent (IDs reliés entre toutes les tables)
// Année scolaire de référence : 2025-2026

import { StatutEleve, Sexe, ModePaiement, StatutAlerte, Sequence, StatutLog, Role, Section } from "../src/app/core/models";



const ANNEE = '2025-2026';

// -----------------------------------------------------------------------
// CLASSES  (id_classe: CL01, CL02)
// -----------------------------------------------------------------------
export const classes = [
  {
    id_classe: 'CL01',
    nom_classe: 'CM2 A',
    niveau: 'CM2',
    cycle: 'primaire' as Section,
    annee_scolaire: ANNEE,
    effectif_max: 45,
    enseignant_principal: 'EN01',
    prix: 150000,
  },
  {
    id_classe: 'CL02',
    nom_classe: '6ème A',
    niveau: '6ème',
    cycle: 'secondaire' as Section,
    annee_scolaire: ANNEE,
    effectif_max: 50,
    enseignant_principal: 'EN02',
    prix: 180000,
  },
];

// -----------------------------------------------------------------------
// ENSEIGNANTS  (id_enseignant: EN01, EN02)
// -----------------------------------------------------------------------
export const enseignants = [
  {
    id_enseignant: 'EN01',
    nom: 'Fotso',
    prenom: 'Jean',
    tel: '699001122',
    email: 'j.fotso@ecole.cm',
    classes_assignees: ['CL01', 'CL02'],
  },
  {
    id_enseignant: 'EN02',
    nom: 'Mballa',
    prenom: 'Marie',
    tel: '677334455',
    email: 'm.mballa@ecole.cm',
    classes_assignees: ['CL02'],
  },
];

// -----------------------------------------------------------------------
// MATIERES  (id_matiere: MAT01..MAT04)
// -----------------------------------------------------------------------
export const matieres = [
  {
    id_matiere: 'MAT01',
    nom_matiere: 'Mathématiques',
    id_classe: 'CL01',
    coefficient: 2,
    note_eliminatoire: 5,
    groupe: 'Scientifique',
    niveau: 'CM2',
    id_enseignant: 'EN01',
  },
  {
    id_matiere: 'MAT02',
    nom_matiere: 'Français',
    id_classe: 'CL01',
    coefficient: 2,
    note_eliminatoire: 5,
    groupe: 'Littéraire',
    niveau: 'CM2',
    id_enseignant: 'EN01',
  },
  {
    id_matiere: 'MAT03',
    nom_matiere: 'Anglais',
    id_classe: 'CL02',
    coefficient: 1,
    note_eliminatoire: 5,
    groupe: 'Littéraire',
    niveau: '6ème',
    id_enseignant: 'EN02',
  },
  {
    id_matiere: 'MAT04',
    nom_matiere: 'SVT',
    id_classe: 'CL02',
    coefficient: 2,
    note_eliminatoire: 5,
    groupe: 'Scientifique',
    niveau: '6ème',
    id_enseignant: 'EN02',
  },
];

// -----------------------------------------------------------------------
// FAMILLES  (id_famille: FAM01..FAM03)
// -----------------------------------------------------------------------
export const familles = [
  {
    id_famille: 'FAM01',
    nom_famille: 'Nguemo',
    tel_pere: '699112233',
    tel_mere: '677889900',
    tel_autre: null,
    latitude: 4.0511,
    longitude: 9.7679,
    adresse_texte: 'Akwa, Douala',
    montant_total_attendu: 330000, // 150000 (EL01) + 180000 (EL02)
    annee_scolaire: ANNEE,
    montant_reduction: 0,
    commentaire: 'RAS',
  },
  {
    id_famille: 'FAM02',
    nom_famille: 'Talla',
    tel_pere: '699445566',
    tel_mere: null,
    tel_autre: '677001122',
    latitude: 4.0483,
    longitude: 9.7043,
    adresse_texte: 'Bonamoussadi, Douala',
    montant_total_attendu: 150000, // EL03
    annee_scolaire: ANNEE,
    montant_reduction: 10000,
    commentaire: 'Réduction fratrie',
  },
  {
    id_famille: 'FAM03',
    nom_famille: 'Mvondo',
    tel_pere: '655667788',
    tel_mere: '699998877',
    tel_autre: null,
    latitude: 3.8667,
    longitude: 11.5167,
    adresse_texte: 'Bastos, Yaoundé',
    montant_total_attendu: 330000, // 180000 (EL04) + 150000 (EL05)
    annee_scolaire: ANNEE,
    montant_reduction: 20000,
    commentaire: 'Paiement en 3 tranches',
  },
];

// -----------------------------------------------------------------------
// ELEVES  (id_eleve: EL01..EL05)
// -----------------------------------------------------------------------
export const eleves = [
  {
    id_eleve: 'EL01',
    id_famille: 'FAM01',
    id_classe: 'CL01',
    nom: 'Nguemo',
    prenom: 'Paul',
    date_naissance: '2014-03-12',
    date_inscription: '2025-09-01',
    statut: 'ACTIF' as StatutEleve,
    lieu_naissance: 'Douala',
    sexe: 'M' as Sexe,
    matricule: 'MAT-25-001',
  },
  {
    id_eleve: 'EL02',
    id_famille: 'FAM01',
    id_classe: 'CL02',
    nom: 'Nguemo',
    prenom: 'Sarah',
    date_naissance: '2012-07-25',
    date_inscription: '2025-09-01',
    statut: 'ACTIF' as StatutEleve,
    lieu_naissance: 'Douala',
    sexe: 'F' as Sexe,
    matricule: 'MAT-25-002',
  },
  {
    id_eleve: 'EL03',
    id_famille: 'FAM02',
    id_classe: 'CL01',
    nom: 'Talla',
    prenom: 'Eric',
    date_naissance: '2014-01-30',
    date_inscription: '2025-09-02',
    statut: 'ACTIF' as StatutEleve,
    lieu_naissance: 'Douala',
    sexe: 'M' as Sexe,
    matricule: 'MAT-25-003',
  },
  {
    id_eleve: 'EL04',
    id_famille: 'FAM03',
    id_classe: 'CL02',
    nom: 'Mvondo',
    prenom: 'Alice',
    date_naissance: '2012-11-05',
    date_inscription: '2025-09-01',
    statut: 'ACTIF' as StatutEleve,
    lieu_naissance: 'Yaoundé',
    sexe: 'F' as Sexe,
    matricule: 'MAT-25-004',
  },
  {
    id_eleve: 'EL05',
    id_famille: 'FAM03',
    id_classe: 'CL01',
    nom: 'Mvondo',
    prenom: 'David',
    date_naissance: '2014-05-18',
    date_inscription: '2025-09-01',
    statut: 'NON-ACTIF' as StatutEleve,
    lieu_naissance: 'Yaoundé',
    sexe: 'M' as Sexe,
    matricule: 'MAT-25-005',
  },
];

// -----------------------------------------------------------------------
// FRAIS  (id_frais: FR01..FR03, un par famille/classe combinée principale)
// -----------------------------------------------------------------------
export const frais = [
  {
    id_frais: 'FR01',
    id_famille: 'FAM01',
    id_classe: 'CL01',
    type_frais: 'scolarite',
    montant_total_attendu: 150000,
    montant_reduction: 0,
    seuil_insolvable: 50000,
    annee_scolaire: ANNEE,
    commentaire: 'Frais Paul Nguemo',
  },
  {
    id_frais: 'FR02',
    id_famille: 'FAM01',
    id_classe: 'CL02',
    type_frais: 'scolarite',
    montant_total_attendu: 180000,
    montant_reduction: 0,
    seuil_insolvable: 50000,
    annee_scolaire: ANNEE,
    commentaire: 'Frais Sarah Nguemo',
  },
  {
    id_frais: 'FR03',
    id_famille: 'FAM02',
    id_classe: 'CL01',
    type_frais: 'scolarite',
    montant_total_attendu: 150000,
    montant_reduction: 10000,
    seuil_insolvable: 50000,
    annee_scolaire: ANNEE,
    commentaire: 'Frais Eric Talla',
  },
  {
    id_frais: 'FR04',
    id_famille: 'FAM03',
    id_classe: 'CL02',
    type_frais: 'scolarite',
    montant_total_attendu: 180000,
    montant_reduction: 10000,
    seuil_insolvable: 50000,
    annee_scolaire: ANNEE,
    commentaire: 'Frais Alice Mvondo',
  },
  {
    id_frais: 'FR05',
    id_famille: 'FAM03',
    id_classe: 'CL01',
    type_frais: 'scolarite',
    montant_total_attendu: 150000,
    montant_reduction: 10000,
    seuil_insolvable: 50000,
    annee_scolaire: ANNEE,
    commentaire: 'Frais David Mvondo',
  },
];

// -----------------------------------------------------------------------
// PAIEMENTS  (id_paiement: PMT01..PMT05, liés aux familles)
// -----------------------------------------------------------------------
export const paiements = [
  {
    id_paiement: 'PMT01',
    id_famille: 'FAM01',
    montant_verse: 200000,
    date_paiement: '2025-09-10',
    mode_paiement: 'mobile' as ModePaiement,
    periode_concernee: 'Tranche 1',
    date_prochain_rdv: '2025-11-10',
    recu_numero: 'REC-0001',
    notes_caissier: 'Paiement via Orange Money',
    statut_alerte_whatsapp: 'ENVOYE' as StatutAlerte,
  },
  {
    id_paiement: 'PMT02',
    id_famille: 'FAM01',
    montant_verse: 130000,
    date_paiement: '2025-11-12',
    mode_paiement: 'cash' as ModePaiement,
    periode_concernee: 'Tranche 2',
    date_prochain_rdv: null,
    recu_numero: 'REC-0002',
    notes_caissier: 'Solde final',
    statut_alerte_whatsapp: 'ENVOYE' as StatutAlerte,
  },
  {
    id_paiement: 'PMT03',
    id_famille: 'FAM02',
    montant_verse: 80000,
    date_paiement: '2025-09-15',
    mode_paiement: 'cash' as ModePaiement,
    periode_concernee: 'Tranche 1',
    date_prochain_rdv: '2025-12-01',
    recu_numero: 'REC-0003',
    notes_caissier: 'Reste à payer 60000',
    statut_alerte_whatsapp: 'EN_ATTENTE' as StatutAlerte,
  },
  {
    id_paiement: 'PMT04',
    id_famille: 'FAM03',
    montant_verse: 100000,
    date_paiement: '2025-09-20',
    mode_paiement: 'virement' as ModePaiement,
    periode_concernee: 'Tranche 1',
    date_prochain_rdv: '2025-11-20',
    recu_numero: 'REC-0004',
    notes_caissier: 'Virement bancaire reçu',
    statut_alerte_whatsapp: 'ENVOYE' as StatutAlerte,
  },
  {
    id_paiement: 'PMT05',
    id_famille: 'FAM03',
    montant_verse: 50000,
    date_paiement: '2025-12-05',
    mode_paiement: 'mobile' as ModePaiement,
    periode_concernee: 'Tranche 2',
    date_prochain_rdv: '2026-02-01',
    recu_numero: 'REC-0005',
    notes_caissier: 'Retard signalé',
    statut_alerte_whatsapp: 'ECHEC' as StatutAlerte,
  },
];

// -----------------------------------------------------------------------
// SOLDES  (un par élève, dérivé de frais + paiements de sa famille)
// -----------------------------------------------------------------------
export const soldes = [
  {
    id_eleve: 'EL01',
    id_famille: 'FAM01',
    total_verse: 330000,
    montant_attendu: 150000,
    reste_a_payer: 0,
    statut_insolvable: false,
    dernier_paiement: '2025-11-12',
    nb_enfants_famille: 2,
  },
  {
    id_eleve: 'EL02',
    id_famille: 'FAM01',
    total_verse: 330000,
    montant_attendu: 180000,
    reste_a_payer: 0,
    statut_insolvable: false,
    dernier_paiement: '2025-11-12',
    nb_enfants_famille: 2,
  },
  {
    id_eleve: 'EL03',
    id_famille: 'FAM02',
    total_verse: 80000,
    montant_attendu: 140000, // 150000 - 10000 réduction
    reste_a_payer: 60000,
    statut_insolvable: false,
    dernier_paiement: '2025-09-15',
    nb_enfants_famille: 1,
  },
  {
    id_eleve: 'EL04',
    id_famille: 'FAM03',
    total_verse: 150000,
    montant_attendu: 170000, // 180000 - 10000 réduction
    reste_a_payer: 20000,
    statut_insolvable: false,
    dernier_paiement: '2025-12-05',
    nb_enfants_famille: 2,
  },
  {
    id_eleve: 'EL05',
    id_famille: 'FAM03',
    total_verse: 150000,
    montant_attendu: 140000, // 150000 - 10000 réduction
    reste_a_payer: -10000, // trop-perçu
    statut_insolvable: false,
    dernier_paiement: '2025-12-05',
    nb_enfants_famille: 2,
  },
];

// -----------------------------------------------------------------------
// NOTES  (id_note: NT01.., liées eleve + classe + matiere + enseignant)
// -----------------------------------------------------------------------
export const notes = [
  { id_note: 'NT01', id_eleve: 'EL01', id_classe: 'CL01', matiere: 'MAT01', id_enseignant: 'EN01', sequence: 'SEQ1' as Sequence, note_obtenue: 14, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT02', id_eleve: 'EL01', id_classe: 'CL01', matiere: 'MAT02', id_enseignant: 'EN01', sequence: 'SEQ1' as Sequence, note_obtenue: 12, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT03', id_eleve: 'EL03', id_classe: 'CL01', matiere: 'MAT01', id_enseignant: 'EN01', sequence: 'SEQ1' as Sequence, note_obtenue: 9,  note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT04', id_eleve: 'EL03', id_classe: 'CL01', matiere: 'MAT02', id_enseignant: 'EN01', sequence: 'SEQ1' as Sequence, note_obtenue: 15, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT05', id_eleve: 'EL05', id_classe: 'CL01', matiere: 'MAT01', id_enseignant: 'EN01', sequence: 'SEQ1' as Sequence, note_obtenue: 17, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT06', id_eleve: 'EL02', id_classe: 'CL02', matiere: 'MAT03', id_enseignant: 'EN02', sequence: 'SEQ1' as Sequence, note_obtenue: 11, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT07', id_eleve: 'EL02', id_classe: 'CL02', matiere: 'MAT04', id_enseignant: 'EN02', sequence: 'SEQ1' as Sequence, note_obtenue: 16, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT08', id_eleve: 'EL04', id_classe: 'CL02', matiere: 'MAT03', id_enseignant: 'EN02', sequence: 'SEQ1' as Sequence, note_obtenue: 13, note_sur: 20, annee_scolaire: ANNEE },
  { id_note: 'NT09', id_eleve: 'EL04', id_classe: 'CL02', matiere: 'MAT04', id_enseignant: 'EN02', sequence: 'SEQ1' as Sequence, note_obtenue: 10, note_sur: 20, annee_scolaire: ANNEE },
];

// -----------------------------------------------------------------------
// BULLETINS  (un par élève / classe / séquence)
// -----------------------------------------------------------------------
export const bulletins = [
  { id_eleve: 'EL01', id_classe: 'CL01', sequence: 'SEQ1' as Sequence, moy_ponderee: 13.0, rang: 2, premier: false, dernier: false, mention: 'Assez bien', moy_classe: 12.4 },
  { id_eleve: 'EL03', id_classe: 'CL01', sequence: 'SEQ1' as Sequence, moy_ponderee: 12.0, rang: 3, premier: false, dernier: false, mention: 'Assez bien', moy_classe: 12.4 },
  { id_eleve: 'EL05', id_classe: 'CL01', sequence: 'SEQ1' as Sequence, moy_ponderee: 17.0, rang: 1, premier: true,  dernier: false, mention: 'Très bien',   moy_classe: 12.4 },
  { id_eleve: 'EL02', id_classe: 'CL02', sequence: 'SEQ1' as Sequence, moy_ponderee: 14.3, rang: 1, premier: true,  dernier: false, mention: 'Bien',        moy_classe: 12.6 },
  { id_eleve: 'EL04', id_classe: 'CL02', sequence: 'SEQ1' as Sequence, moy_ponderee: 11.2, rang: 2, premier: false, dernier: true,  mention: 'Passable',    moy_classe: 12.6 },
];

// -----------------------------------------------------------------------
// TEMPLATES  (messages WhatsApp/SMS)
// -----------------------------------------------------------------------
export const templates = [
  {
    id_template: 'TPL01',
    type: 'paiement',
    objet: 'Confirmation de paiement',
    contenu: 'Bonjour {parent}, nous confirmons la réception de {montant} FCFA pour {eleve}. Merci.',
    variables_dynamiques: ['parent', 'montant', 'eleve'],
    actif: true,
    langue: 'fr',
    destinataire: 'famille',
  },
  {
    id_template: 'TPL02',
    type: 'absence',
    objet: 'Alerte absence',
    contenu: 'Bonjour {parent}, {eleve} est absent(e) le {date} en classe de {classe}.',
    variables_dynamiques: ['parent', 'eleve', 'date', 'classe'],
    actif: true,
    langue: 'fr',
    destinataire: 'famille',
  },
  {
    id_template: 'TPL03',
    type: 'rdv',
    objet: 'Rappel de rendez-vous',
    contenu: 'Bonjour {parent}, rappel de votre rendez-vous de paiement prévu le {date_rdv}.',
    variables_dynamiques: ['parent', 'date_rdv'],
    actif: true,
    langue: 'fr',
    destinataire: 'famille',
  },
];

// -----------------------------------------------------------------------
// LOGS  (envois liés aux eleves/familles/templates)
// -----------------------------------------------------------------------
export const logs = [
  {
    id_log: 'LOG01',
    id_eleve: 'EL01',
    id_famille: 'FAM01',
    id_template: 'TPL01',
    numero_dest: '699112233',
    date_envoi: '2025-09-10T10:05:00',
    statut: 'envoye' as StatutLog,
    hash_dedup: 'a1b2c3d4',
  },
  {
    id_log: 'LOG02',
    id_eleve: 'EL03',
    id_famille: 'FAM02',
    id_template: 'TPL03',
    numero_dest: '699445566',
    date_envoi: '2025-11-28T08:00:00',
    statut: 'echec' as StatutLog,
    hash_dedup: 'e5f6g7h8',
  },
  {
    id_log: 'LOG03',
    id_eleve: 'EL04',
    id_famille: 'FAM03',
    id_template: 'TPL02',
    numero_dest: '655667788',
    date_envoi: '2025-10-14T07:30:00',
    statut: 'envoye' as StatutLog,
    hash_dedup: 'i9j0k1l2',
  },
];

// -----------------------------------------------------------------------
// POINTAGES  (sessions de cours par matière/enseignant)
// -----------------------------------------------------------------------
export const pointages = [
  {
    id_pointage: 'PT01',
    id_matiere: 'MAT01',
    id_enseignants: 'EN01',
    date_debut: '2025-10-14T08:00:00',
    date_fin: '2025-10-14T09:00:00',
    duree: 60,
  },
  {
    id_pointage: 'PT02',
    id_matiere: 'MAT03',
    id_enseignants: 'EN02',
    date_debut: '2025-10-14T09:00:00',
    date_fin: '2025-10-14T10:00:00',
    duree: 60,
  },
];

// -----------------------------------------------------------------------
// ABSENCES  (liées eleve/famille/classe/pointage)
// -----------------------------------------------------------------------
export const absences = [
  {
    id: 'ABS01',
    id_eleve: 'EL03',
    id_famille: 'FAM02',
    id_pointage: 'PT01',
    id_classe: 'CL01',
    date: '2025-10-14',
    heure: '08:00',
    justifie: false,
    motif: null,
  },
  {
    id: 'ABS02',
    id_eleve: 'EL04',
    id_famille: 'FAM03',
    id_pointage: 'PT02',
    id_classe: 'CL02',
    date: '2025-10-14',
    heure: '09:00',
    justifie: true,
    motif: 'Certificat médical',
  },
];

// -----------------------------------------------------------------------
// USERS  (comptes de l'application)
// -----------------------------------------------------------------------
export const users = [
  {
    id: 'USR01',
    username: 'prince',
    mot_de_passe: '$2b$05$xTjuzHwf1PFsWrJfdzzwOujrvLSt3/XEsrScZuF3Eg4ovMkXKxW4C',
    nom: 'Directeur Général',
    role: 'admin' as Role,
    is_admin: true,
    section: null,
    permissions: ['familles', 'eleves', 'classes', 'validation_parents', 'insolvables', 'notes', 'bulletins', 'absences', 'whatsapp', 'users', 'matieres'],
    tel: '690000000',
  },
  {
    id: 'USR02',
    username: 'jfotso',
    mot_de_passe: '$2b$10$hashedpassword002',
    nom: 'Fotso Jean',
    role: 'enseignant' as Role,
    is_admin: false,
    section: 'primaire' as Section,
    permissions: ['notes', 'bulletins'],
    tel: '699001122',
  },
  {
    id: 'USR03',
    username: 'caissier1',
    mot_de_passe: '$2b$10$hashedpassword003',
    nom: 'Biya Chantal',
    role: 'caissier' as Role,
    is_admin: false,
    section: null,
    permissions: ['familles', 'insolvables', 'whatsapp'],
    tel: '677112233',
  },
];

// -----------------------------------------------------------------------
// ANNEESVC  (historique par famille/année scolaire)
// -----------------------------------------------------------------------
export const anneesvc = [
  {
    id_annee_scolaire: 'ASC01',
    id_famille: 'FAM01',
    annee_scolaire: ANNEE,
    commentaire: 'RAS',
    montant_total_attendu: 330000,
    montant_reduction: 0,
    montant_reduction_special: 0,
    anciennete: 3,
  },
  {
    id_annee_scolaire: 'ASC02',
    id_famille: 'FAM02',
    annee_scolaire: ANNEE,
    commentaire: 'Réduction fratrie',
    montant_total_attendu: 150000,
    montant_reduction: 10000,
    montant_reduction_special: 0,
    anciennete: 1,
  },
  {
    id_annee_scolaire: 'ASC03',
    id_famille: 'FAM03',
    annee_scolaire: ANNEE,
    commentaire: 'Paiement en 3 tranches',
    montant_total_attendu: 330000,
    montant_reduction: 20000,
    montant_reduction_special: 5000,
    anciennete: 2,
  },
];

// -----------------------------------------------------------------------
// Export global (pratique pour importer d'un coup, ex: db mock / seed)
// -----------------------------------------------------------------------
export const mockDB = {
  familles, eleves, classes, paiements, frais, notes, enseignants,
  matieres, soldes, bulletins, templates, logs, absences, users,
  anneesvc, pointages,
};