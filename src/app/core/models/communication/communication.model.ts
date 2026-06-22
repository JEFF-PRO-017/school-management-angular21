import { NotifType, StatutLog } from "../shared";

export interface MsgTemplate {
  id_template:           string;
  type:                  string;
  objet:                 string;
  contenu:               string;
  variables_dynamiques?: string;
  actif:                 boolean;
  langue:                string;
  destinataire:          string;
}

export interface LogAlerte {
  id_log:      string;
  id_eleve:    string;
  id_famille:  string;
  id_template: string;
  numero_dest: string;
  date_envoi:  string;
  statut:      StatutLog;
  hash_dedup:  string;
}

export interface NotifParent {
  id:      string;
  type:    NotifType;
  titre:   string;
  corps:   string;
  date:    string;
  lue:     boolean;
  urgente: boolean;
}