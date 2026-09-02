import { Absence, Classe, Eleve, Note } from "../academic";
import { NotifParent } from "../communication";
import { Paiement } from "../payment";
import {  Sequence, StatusFamille } from "../shared";

export interface Famille {
    id_famille: string;
    nom_famille: string;
    tel_pere: string;
    tel_mere: string;
    tel_autre?: string;
    latitude?: number;
    longitude?: number;
    adresse_texte?: string;
    mots_de_passe?: string,
    status: StatusFamille
}
export interface FamilleEnrichi extends Famille {
    eleves?: EleveEnrichi[];
    paiements?: Paiement[];
    annee_scolaires: AnneeScolaireFamille[];
    moratoires?: Moratoire[];
    notifications?: NotifParent[];
}
export interface AnneeScolaireFamille {
    id_annee_scolaire: string;
    id_famille: string;
    annee_scolaire: string;
    commentaire?: string;
    montant_total_attendu: number;
    montant_reduction?: number;
    montant_reduction_special: number;
    anciennete: number;
    format_montant: number;
    format_statut : 'physique'|'cash',
    application_montant:number
}

export interface Moratoire {
    id_moratoire: string;
    id_famille: string;
    id_annee_scolaire: string;
    date_debut: string;
    date_fin: string;
    commentaire?: string;
    numero_moratoire?: string;
    regler: boolean;
    statut: 'ACTIF'|'NON-ACTIF'
}

export interface MoratoireEnrichi extends Moratoire {
    famille?: Famille;
    annee_scolaire?: AnneeScolaireFamille;
}
export interface EleveEnrichi extends Eleve {
    famille?: FamilleEnrichi;
    classe?: Classe;
    sequences?: { sequence: Sequence; notes_eleve: Note[] }[];
    absences?:Absence[];
}

