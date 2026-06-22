// identity/user.model.ts

import type { Role, Section } from '../shared/types';
import type { PermissionId }  from '../shared/constants';

// ── Base ─────────────────────────────────────────────────────────
export interface AppUser {
  id:           string;
  username:     string;
  mot_de_passe: string;        // hashé bcrypt (stocké dans Sheets)
  nom:          string;
  role:         Role;
  is_admin:     boolean;
  section:      Section;
  permissions:  PermissionId[];
}

// ── Enrichi ───────────────────────────────────────────────────────
/** AppUser avec la liste complète des objets Permission résolus */
export interface AppUserEnrichi extends AppUser {
  permissions_detail: PermissionDetail[];
}

export interface PermissionDetail {
  id:    PermissionId;
  label: string;
  date_assignation?: string;   // ISO — présent si log disponible
}