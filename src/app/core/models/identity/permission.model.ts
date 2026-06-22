// identity/permission.model.ts

import type { PermissionId } from '../shared/constants';

export interface PermissionUser {
  id:                string;
  user_id:           string;
  permission_id:     PermissionId;
  date_dassignation: string;
}