export const BLANC: RGB = [255, 255, 255];
export const NOIR: RGB = [0, 0, 0];
export const BLEU: RGB = [21, 95, 165];
export const GRIS_H: RGB = [211, 211, 211];
export const GRIS_L: RGB = [248, 249, 252];
export const ROUGE: RGB = [153, 60, 29];
export const VERT: RGB = [15, 110, 86];
export const BLEU_L: RGB = [235, 243, 252];
export const BLEU_T: RGB = [12, 68, 124];
// ── Mise en page paysage A4 ───────────────────────────────────────
export const WL = 297;   // largeur landscape
export const HL = 210;   // hauteur landscape
export const ML = 10;    // marge gauche
export const MR = 10;    // marge droite

export const ECOLE_DEFAULT: InfosEcole = {
  nom: 'CSB BERCEAU DU SAVOIR',
  ville: 'Yaoundé — Cameroun',
  tel: '+237 679 33 78 60',
};

// ── Couleurs identiques à bulletin-sections ──────────────────────
export type RGB = [number, number, number];

export interface InfosEcole {
  nom: string;
  ville: string;
  tel: string;
}