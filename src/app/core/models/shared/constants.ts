// shared/constants.ts — Constantes globales de l'application

import type { Sequence } from './types';

export const SEQUENCES: Sequence[] = [
  'SEQ1', 'SEQ2', 'SEQ3', 'SEQ4', 'SEQ5', 'SEQ6',
];

export const PERMISSIONS = [
  { id: 'familles',            label: 'Familles',              section: 'both' },
  { id: 'eleves',              label: 'Élèves',                section: 'both' },
  { id: 'classes',             label: 'Classes',               section: 'both' },
  { id: 'validation_parents',  label: 'Validation parents',    section: 'both' },
  { id: 'insolvables',         label: 'Insolvables',           section: 'both' },
  { id: 'notes',               label: 'Notes',                 section: 'both' },
  { id: 'bulletins',           label: 'Bulletins',             section: 'both' },
  { id: 'absences',            label: 'Absences',              section: 'both' },
  { id: 'whatsapp',            label: 'WhatsApp',              section: 'both' },
  { id: 'users',               label: 'Gestion utilisateurs',  section: 'both' },
  { id: 'matieres',            label: 'Matières',              section: 'both' },
] as const;

export type PermissionId = typeof PERMISSIONS[number]['id'];

export const ANNEE_SCOLAIRE = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`
export const ANNEE_EN_COURS = new Date().getFullYear()