// parent-portal/eleve-parent.model.ts

import { Sequence, StatutEleve } from "../shared";

export interface MoyenneParent {
  sequence: Sequence;
  moyenne:  number | null;
}

export interface EleveParent {
  id_eleve:                string;
  nom:                     string;
  prenom:                  string;
  id_classe:               string;
  nom_classe:              string;
  niveau:                  string;
  statut:                  StatutEleve;
  moyennes:                MoyenneParent[];
  moy_trimestrielle:       number | null;
  rang:                    number | null;
  effectif_classe:         number;
  absences_count:          number;
  absences_non_justifiees: number;
  derniere_absence:        string | null;
}