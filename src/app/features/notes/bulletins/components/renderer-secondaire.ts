// renderer-secondaire.ts — bulletin secondaire francophone (6e → Terminale)
// + PV de classe (paysage) + fiche de saisie manuscrite

import jsPDF from 'jspdf';
import { BulletinData, PVData, FicheSaisieData } from '../../helper/bulletin.models';
import { sectionBandeVerticale, sectionEntete, sectionTitreBulletin, sectionInfoEleve, sectionRecap, sectionPVEntete, sectionPVTableau, sectionPVSignatures, sectionFicheSaisie, calcDims, sectionGroupe, sectionTableauHeader, sectionTotalGroupe, sectionTotauxGlobaux } from './bulletin-sections';


// ── Bulletin individuel ────────────────────────────────────────────────────

export  function renderBulletinSecondaire(doc: jsPDF, d: BulletinData): void {
  // sectionBandeVerticale(doc);
  let y =   sectionEntete(doc, 6, d.config.annee);
  y = sectionTitreBulletin(doc, y, d.config.titre);
  y = sectionInfoEleve(doc, y, d);
  const dims = calcDims(d.config.sequences);
  y = sectionTableauHeader(doc, y, d.config.sequences, dims);
  let totalPts = 0, totalCoef = 0;
  d.groupes.forEach((groupe, gi) => {
    const res = sectionGroupe(doc, y, groupe, gi, d.config.sequences, d.eleve, dims);
    y = res.y;
    y = sectionTotalGroupe(doc, y, gi, d.config.sequences, res.totalCoef, res.totalPts, dims);
    totalPts += res.totalPts; totalCoef += res.totalCoef;
  });
  const { y: y2, moyGlobale } = sectionTotauxGlobaux(doc, y, totalCoef, totalPts, dims);
  sectionRecap(doc, y2, d, moyGlobale);
}


// ── PV de classe (paysage A4) ──────────────────────────────────────────────
// Délègue aux sections modulaires de bulletin-sections.ts

export function renderPV(doc: jsPDF, d: PVData): void {
  let y = sectionPVEntete(doc, 6, d.nomClasse, d.config.titre);
  y = sectionPVTableau(doc, y, d);
  sectionPVSignatures(doc, y);
}
// ── Fiche de saisie manuscrite ─────────────────────────────────────────────
// Délègue à sectionFicheSaisie — une page par séquence

export function renderFicheSaisie(doc: jsPDF, d: FicheSaisieData): void {
  d.sequences.forEach((seq, si) => {
    if (si > 0) doc.addPage();
    sectionFicheSaisie(doc, d, seq);
  });
}