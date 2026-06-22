import { StatutValidation } from "../shared";

export interface DemandePaiement {
  id:            string;
  id_famille:    string;
  montant:       number;
  mode_paiement: 'cash' | 'mobile_money';
  reference?:    string;
  commentaire?:  string;
  date_demande:  string;
  statut:        StatutValidation;
}
 