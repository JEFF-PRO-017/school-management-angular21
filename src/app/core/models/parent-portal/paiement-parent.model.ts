// parent-portal/paiement-parent.model.ts

import { Paiement } from "../payment";


export interface PaiementParent {
  montant_attendu:  number;
  montant_paye:     number;
  reste_a_payer:    number;
  taux_paiement:    number;
  dernier_paiement: string | null;
  prochain_rdv:     string | null;
  rdv_depasse:      boolean;
  historique:       Paiement[];
}