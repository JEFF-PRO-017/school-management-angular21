// shared/types.ts — Primitives partagés entre tous les domaines

export type Section       = 'primaire' | 'secondaire';
export type Role          = 'admin' | 'enseignant' | 'caissier' | 'surveillant';
export type Sequence      = 'SEQ1' | 'SEQ2' | 'SEQ3' | 'SEQ4' | 'SEQ5' | 'SEQ6';
export type ModePaiement  = 'cash' | 'mobile' | 'virement';

export type StatutValidation = 'en_attente' | 'valide' | 'refuse';
export type StatutAlerte     = 'EN_ATTENTE' | 'ENVOYE' | 'ECHEC';
export type StatutLog        = 'envoye' | 'echec';
export type StatutEleve      = 'actif' | 'archive';
export type Sexe             = 'M' | 'F';
export type NotifType = 'absence' | 'note' | 'rdv' | 'paiement' | 'info';
export type StatusFamille = 'ACTIF'|'NON-ACTIF'|'BANNI'