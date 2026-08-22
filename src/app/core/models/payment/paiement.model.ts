import { Famille } from "../family";
import { ModePaiement, StatutAlerte } from "../shared";

export interface Paiement {
  id_paiement: string;
  id_famille: string;
  montant_verse: number;
  date_paiement: string;
  mode_paiement: ModePaiement;
  recu_numero: string;
  nb_impressions: number;
  statut: 'crée' | 'confirmé' | 'refusé'
}

export interface PaiementEnrichi extends Paiement {
  famille: Famille
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