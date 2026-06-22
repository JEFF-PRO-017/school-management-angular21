import { Classe, Eleve } from "../academic";
import { Paiement } from "../payment";

export interface Famille {
    id_famille: string;
    nom_famille: string;
    tel_pere: string;
    tel_mere: string;
    tel_autre?: string;
    latitude?: number;
    longitude?: number;
    adresse_texte?: string;
    annee_scolaire?: string;
    montant_total_attendu?: number;
    montant_reduction?: number;
    commentaire?: string;
    eleves?: Eleve[];
    paiements?: Paiement[];
}

export interface EleveEnrichi extends Eleve {
    famille?: Famille;
    classe?: Classe;
    solde?: SoldeSnap;
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

// ── Enrichi ───────────────────────────────────────────────────────
/** SoldeSnap avec famille et élève résolus */
export interface SoldeSnapEnrichi extends SoldeSnap {
    famille?: Famille;
    eleve?: Eleve;
}
