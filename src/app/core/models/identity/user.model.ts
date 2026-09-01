// identity/user.model.ts

import type { Role, Section } from '../shared/types';
import type { PermissionId } from '../shared/constants';
import { Classe, MatiereConfig } from '../academic';

// ── Base ─────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  mot_de_passe: string;        // hashé bcrypt (stocké dans Sheets)
  nom: string;
  role: Role;
  is_admin: boolean|'OUI';
  section: Section;
  permissions: PermissionId[];
  tel?: string;
  status: 'ACTIF' | 'NON-ACTIF';
}

// ── Enrichi ───────────────────────────────────────────────────────
/** AppUser avec la liste complète des objets Permission résolus */
export interface AppUserEnrichi extends AppUser {
  permissions_detail?: PermissionDetail[];
  classes_assignees_infos?: Classe,
  matieres?: MatiereConfig[]
}

export interface PermissionDetail {
  id: PermissionId;
  label: string;
  date_assignation?: string;   // ISO — présent si log disponible
}