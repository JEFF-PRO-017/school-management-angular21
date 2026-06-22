import { ModePaiement, StatutAlerte } from "../shared";

export interface Paiement {
  id_paiement:            string;
  id_famille:             string;
  montant_verse:          number;
  date_paiement:          string;
  mode_paiement:          ModePaiement;
  // periode_concernee:      string;
  recu_numero:            string;
  notes_caissier?:        string;
  statut_alerte_whatsapp: StatutAlerte;
}


export interface FraisConfig {
  id_frais:              string;
  id_famille?:           string;
  id_classe:             string;
  type_frais:            string;
  montant_total_attendu: number;
  montant_reduction:     number;
  seuil_insolvable:      number;
  annee_scolaire:        string;
  commentaire?:          string;
}