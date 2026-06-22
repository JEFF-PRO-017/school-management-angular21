// parent-portal/eleve-tampon.model.ts

import { Eleve } from "../academic";
import { StatutValidation } from "../shared";

export interface EleveTampon extends Omit<Eleve, 'famille' | 'classe' | 'sequences'> {
  date_enregistrement: string;
  statut_validation:   StatutValidation;
  id_famille_tampon?:  string;
}