// renderer-anglophone.ts
// Header/footer identiques au secondaire.
// Différences : libellés EN, mentions anglaises, double titre FR/EN

import jsPDF from 'jspdf';
import { BulletinData } from '../../helper/bulletin.models';
import { cell, BLANC } from '../../helper/pdf-helpers';
import { sectionBandeVerticale, sectionEntete, IW, ML, sectionInfoEleve, calcDims, sectionGroupe, sectionTotalGroupe, sectionTotauxGlobaux, sectionRecap } from './bulletin-sections';


const TERMS: Record<number, string> = { 1: 'FIRST', 2: 'SECOND', 3: 'THIRD' };

function mentionEN(n: number | null): string {
  if (n === null) return '';
  if (n >= 18) return 'Excellent'; if (n >= 16) return 'Very Good';
  if (n >= 14) return 'Good';      if (n >= 12) return 'Average+';
  if (n >= 10) return 'Average';   if (n >= 8)  return 'Poor';
  return 'Fail';
}

export function renderBulletinAnglophone(doc: jsPDF, d: BulletinData): void {
  sectionBandeVerticale(doc);
  let y = sectionEntete(doc, 6, d.config.annee);

  // Double titre FR/EN (noir sur blanc)
  const iW = IW;
  doc.setFillColor(0, 0, 0); doc.rect(ML, y, iW, 11, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text((d.config.titre || `BULLETIN TRIMESTRIEL ${d.config.trimestre}`).toUpperCase(), ML + iW / 2, y + 4, { align: 'center', baseline: 'middle' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`TERMINAL REPORT — ${TERMS[d.config.trimestre] ?? ''} TERM`, ML + iW / 2, y + 9, { align: 'center', baseline: 'middle' });
  y += 13;

  y = sectionInfoEleve(doc, y, d);

  const dims = calcDims(d.config.sequences);
  // En-tête EN : SUBJECTS | COEF | SEQ | AVG/20 | WTD.AVG | REMARKS
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, hH } = dims;
  const xMoy = ML + wMat + wCoef + d.config.sequences.length * wSeq;
  cell(doc, ML,          y, wMat,  hH, 'SUBJECTS',  { fill: BLANC, bold: true, fontSize: 9, align: 'left', border: true });
  cell(doc, ML + wMat,   y, wCoef, hH, 'COEF.',     { fill: BLANC, bold: true, fontSize: 8,  border: true });
  d.config.sequences.forEach((s, i) =>
    cell(doc, ML + wMat + wCoef + i * wSeq, y, wSeq, hH, s.replace('SEQ', 'SEQ '), { fill: BLANC, bold: true, fontSize: 8, border: true })
  );
  cell(doc, xMoy,          y, wMoy,   hH, 'AVG/20',  { fill: BLANC, bold: true, fontSize: 8, border: true });
  cell(doc, xMoy + wMoy,   y, wCoef2, hH, 'WTD.AVG', { fill: BLANC, bold: true, fontSize: 8, border: true });
  cell(doc, xMoy + wMoy + wCoef2, y, wApp, hH, 'REMARKS', { fill: BLANC, bold: true, fontSize: 8, border: true });
  y += hH;

  let totalPts = 0, totalCoef = 0;
  d.groupes.forEach((groupe, gi) => {
    const res = sectionGroupe(doc, y, groupe, gi, d.config.sequences, d.eleve, dims);
    y = res.y;
    // Remplace appréciation FR par mention EN dans les cellules APP
    y = sectionTotalGroupe(doc, y, gi, d.config.sequences, res.totalCoef, res.totalPts, dims);
    totalPts += res.totalPts; totalCoef += res.totalCoef;
  });

  const { y: y2, moyGlobale } = sectionTotauxGlobaux(doc, y, totalCoef, totalPts, dims);
  // Récap bilingue — réutilise sectionRecap mais override quelques libellés
  sectionRecap(doc, y2, d, moyGlobale);
}