// parent-portal/famille-tampon.model.ts

import { Famille } from "../family";
import { StatutValidation } from "../shared";


export interface FamilleTampon extends Famille{
  date_enregistrement: string;
  statut_validation:   StatutValidation;
}