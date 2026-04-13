// pdf-helpers.ts — fonctions utilitaires partagées par tous les renderers
// parseFloat sécurisé partout : les notes et coefficients viennent parfois en string.

import jsPDF from 'jspdf';

// ── Types couleurs ─────────────────────────────────────────────────────────
export type RGB = [number, number, number];
export const BLEU:   RGB = [0, 84, 166];
export const BLEU_L: RGB = [220, 235, 252];
export const GRIS:   RGB = [180, 180, 180];
export const ROUGE:  RGB = [180, 0, 0];
export const VERT:   RGB = [0, 110, 56];
export const BLANC:  RGB = [255, 255, 255];
export const NOIR:   RGB = [0, 0, 0];


export const GRIS_HEADER: RGB = [211, 211, 211]; // #d3d3d3
export const GRIS_LIGHT: RGB = [245, 245, 245];
// ── Parsing sécurisé ───────────────────────────────────────────────────────

/** Toujours retourner un nombre valide, même si la valeur est string ou undefined */
export function toFloat(val: unknown): number {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? 0 : n;
}

/** Note sécurisée — retourne null si vide/NaN */
export function toNote(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

// ── Calculs ────────────────────────────────────────────────────────────────

/** Moyenne pondérée sécurisée sur une liste de {note, coeff} */
export function moyennePonderee(
  items: { note: number | null; coeff: number }[]
): number | null {
  let pts = 0, totC = 0, has = false;
  for (const { note, coeff } of items) {
    const c = toFloat(coeff);
    if (note !== null) { pts += toFloat(note) * c; has = true; }
    totC += c;
  }
  return has && totC > 0 ? pts / totC : null;
}

/** Moyenne simple d'un tableau de nombres (ignore null) */
export function moyenneSimple(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Formate un nombre en string avec N décimales, ou retourne '—' si null */
export function fmt(val: number | null, dec = 2): string {
  return val !== null ? val.toFixed(dec) : '—';
}

// ── Primitives PDF ─────────────────────────────────────────────────────────

/** Dessine une cellule (rect + texte centré) */
export function cell(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  text: string,
  opts: {
    fill?: RGB; textColor?: RGB; bold?: boolean;
    fontSize?: number; align?: 'left' | 'center' | 'right';
    border?: boolean;
  } = {}
): void {
  if (opts.fill) { doc.setFillColor(...opts.fill); doc.rect(x, y, w, h, 'F'); }
  if (opts.border !== false) {
    doc.setDrawColor(...GRIS); doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, 'S');
  }
  doc.setTextColor(...(opts.textColor ?? NOIR));
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.fontSize ?? 8);
  const tx = opts.align === 'right' ? x + w - 1.5
           : opts.align === 'left'  ? x + 1.5
           : x + w / 2;
  const anchor = opts.align === 'right' ? 'right'
               : opts.align === 'left'  ? 'left'
               : 'center';
  doc.text(text, tx, y + h / 2 + 0.5, { align: anchor, baseline: 'middle' });
}

/** Ligne de séparation horizontale */
export function hline(doc: jsPDF, x1: number, x2: number, y: number, color: RGB = GRIS): void {
  doc.setDrawColor(...color); doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

/** Texte simple avec font/couleur */
export function txt(
  doc: jsPDF, text: string,
  x: number, y: number,
  opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left'|'center'|'right' } = {}
): void {
  doc.setFontSize(opts.size ?? 8);
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setTextColor(...(opts.color ?? NOIR));
  doc.text(text, x, y, { align: opts.align ?? 'left', baseline: 'middle' });
}

/** Bande colorée pleine avec texte centré */
export function bande(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  text: string, fill: RGB = BLEU, textColor: RGB = BLANC, fontSize = 11
): void {
  doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F');
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.text(text, x + w / 2, y + h / 2 + 0.5, { align: 'center', baseline: 'middle' });
}

/** Texte vertical rotatif (pour bande latérale) */
export function txtVertical(
  doc: jsPDF, text: string,
  cx: number, cy: number,
  opts: { size?: number; color?: RGB } = {}
): void {
  doc.setFontSize(opts.size ?? 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(opts.color ?? BLANC));
  doc.text(text, cx, cy, { angle: 90, align: 'center', baseline: 'middle' });
}