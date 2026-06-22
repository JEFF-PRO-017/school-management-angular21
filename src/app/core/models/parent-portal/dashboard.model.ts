import { Famille } from "../family";
import { EleveParent, NotifParent, PaiementParent } from "../parent.models";

export interface DashboardParent {
  famille:       Famille;
  eleves:        EleveParent[];
  paiement:      PaiementParent;
  notifications: NotifParent[];
}