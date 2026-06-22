import { EleveTampon } from "./eleve-tampon.model";
import { FamilleTampon } from "./famille-tampon.model";
import { PensionTampon } from "./pension-tampon.model";

export interface WizardState {
  etape:   1 | 2 | 3 | 4;
  famille: Partial<FamilleTampon>;
  eleves:  Partial<EleveTampon>[];
  pension: Partial<PensionTampon>;
}   