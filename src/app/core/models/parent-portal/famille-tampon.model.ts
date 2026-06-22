// parent-portal/famille-tampon.model.ts

import { Famille } from "../family";
import { StatutValidation } from "../shared";


export interface FamilleTampon extends Omit<Famille, 'eleves' | 'paiements'> {
  date_enregistrement: string;
  statut_validation:   StatutValidation;
}