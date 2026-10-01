// db.model.ts — forme de l'objet "db" gardé en mémoire (synchrone)

import { Absence, AnneeScolaireFamille, Classe, DemandePaiement, Eleve, EleveTampon, Enseignant, Famille, FamilleTampon, FraisConfig, LogAlerte, MatiereConfig, Moratoire, MsgTemplate, Note, Paiement, PensionTampon } from "./src/app/core/models";
import { SoldeSnap, BulletinSnap } from "./src/app/core/models/last_index";


export interface Db {
  familles: Famille[];
  classes: Classe[];
  frais: FraisConfig[];
  enseignants: Enseignant[];
  matieres: MatiereConfig[];
  notes: Note[];
  paiements: Paiement[];
  eleves: Eleve[];
  soldes: SoldeSnap[];
  bulletins: BulletinSnap[];
  absences: Absence[];
  templates: MsgTemplate[];
  logs: LogAlerte[];
  anneeSvc: AnneeScolaireFamille[];
  moratoires: Moratoire[];
  // tampons (espace parent)
  famillesTampon: FamilleTampon[];
  elevesTampon: EleveTampon[];
  pensionsTampon: PensionTampon[];
  demandesPaiement: DemandePaiement[];
}

export type TableName = keyof Db;

export function emptyDb(): Db {
  return {
    familles: [], classes: [], frais: [], enseignants: [], matieres: [],
    notes: [], paiements: [], eleves: [], soldes: [], bulletins: [],
    absences: [], templates: [], logs: [], anneeSvc: [], moratoires: [],
    famillesTampon: [], elevesTampon: [], pensionsTampon: [], demandesPaiement: [],
  };
}

// Tables sauvegardées dans IndexedDB
// (users et pointages restent en mémoire seulement : données sensibles / éphémères)
export const PERSISTED: TableName[] = Object.keys(emptyDb()) as TableName[];