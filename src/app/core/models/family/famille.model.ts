import { Absence, Classe, Eleve, Note } from "../academic";
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

// export interface SoldeSnap {
//     id_eleve: string;
//     id_famille: string;
//     total_verse: number;
//     montant_attendu: number;
//     reste_a_payer: number;
//     statut_insolvable: string | boolean;
//     dernier_paiement: string;
//     nb_enfants_famille: number;
// }

// ── Enrichi ───────────────────────────────────────────────────────
/** SoldeSnap avec famille et élève résolus */
// export interface SoldeSnapEnrichi extends SoldeSnap {
//     famille?: Famille;
//     eleve?: Eleve;
// }


export function creerAnneeScolaire(
    idFamille: string,
    annee: string,
    reductionSpecial = 0
): AnneeScolaireFamille {
    return {
        id_annee_scolaire: `${idFamille}AN_SC`,
        id_famille: idFamille,
        annee_scolaire: annee,
        montant_total_attendu: 0,
        montant_reduction: 0,
        montant_reduction_special: reductionSpecial,
        anciennete: 0,
    };
}
