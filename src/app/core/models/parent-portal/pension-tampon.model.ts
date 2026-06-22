import { StatutValidation } from "../shared";

 
export interface PensionTampon {
  id:                    string;
  id_famille:            string;
  montant_total_attendu: number;
  annee_scolaire:        string;
  montant_reduction:     number;
  commentaire:           string;
  date_enregistrement:   string;
  statut_validation:     StatutValidation;
}
 