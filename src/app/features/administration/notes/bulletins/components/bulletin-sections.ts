// bulletin-sections.ts — v3
// Simulation : 249.5mm sur 297mm — marge 47.5mm
//
// Changements vs v2 :
//   calcDims          rH 4.5 → 4.3   hH 5.5 (inchangé)
//   sectionEntete     y + 17 → y + 16  (fontSize école 16→14)
//   sectionTitreBulletin  +1 → +0     (suppression espacement après titre)
//   sectionInfoEleve  bande +1 → +0   (TRIMESTRE sans espacement)
//   sectionGroupe     h2 = rH*2 = 8.6mm
//   sectionTotalGroupe rH 4.5→4.3, espacement 0.5→0
//   sectionTotauxGlobaux rH 4.5→4.3, espacement 0.5→0.3
//   sectionRecap      rH 4.5→4.3, sigH 4→3.5

import jsPDF from 'jspdf';
import { Sequence, MatiereConfig } from '../../../../../core/models/last_index';
import { BulletinData, PVData, FicheSaisieData } from '../../helper/bulletin.models';
import { RGB, BLANC, NOIR, cell, toFloat, toNote, moyenneSimple, ROUGE, fmt, VERT } from '../../helper/pdf-helpers';

export const ML = 10, MR = 10, W = 210, H = 297;
export const BANDE_X = W - MR;
export const IW = BANDE_X - ML - 1;

const NOIR_FOND: RGB = [0, 0, 0];

// ── Bande verticale droite ────────────────────────────────────────────────
export function sectionBandeVerticale(doc: jsPDF): void {
  doc.setFillColor(...NOIR_FOND);
  doc.rect(BANDE_X, 0, 10, H, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLANC);
  doc.text('CSB BERCEAU DU SAVOIR', BANDE_X + 5, H / 2,
    { angle: 90, align: 'center', baseline: 'middle' });
}

// ── En-tête ───────────────────────────────────────────────────────────────
// v3 : y+16 au lieu de y+17 (-1mm), fontSize école 16→14
export function sectionEntete(doc: jsPDF, y: number, annee: string, logoBase64?: any): number {
  const xR = IW + ML;


  const xTxt = ML;

  doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(...NOIR);
  doc.text('MINEDUC/DELEGATION REGIONALE DU CENTRE/DDES-MAK', xTxt, y + 3, { baseline: 'middle' });

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...NOIR);
  doc.text('CSB BERCEAU DU SAVOIR', xTxt, y + 9, { baseline: 'middle' });

  doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(...NOIR);
  doc.text('Tél: +237 679 33 78 60 / 656 48 82 90 / 674 73 50 44', xTxt, y + 14, { baseline: 'middle' });


  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', ML +105, y, 15, 14); } catch {
    }
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...NOIR);
  doc.text('REPUBLIQUE DU CAMEROUN', xR, y + 3, { align: 'right', baseline: 'middle' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('PAIX-TRAVAIL-PATRIE', xR, y + 7, { align: 'right', baseline: 'middle' });
  doc.text(`ANNÉE SCOLAIRE: ${annee}`, xR, y + 11, { align: 'right', baseline: 'middle' });

  return y + 16;  // v3 : 16 au lieu de 17
}

// ── Titre bulletin ────────────────────────────────────────────────────────
// v3 : suppression du +1 d'espacement après le bandeau
export function sectionTitreBulletin(doc: jsPDF, y: number, titre: string): number {
  const h = 8;
  doc.setFillColor(...NOIR_FOND);
  doc.rect(ML, y, IW, h, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(12); doc.setTextColor(...BLANC);
  doc.text(titre.toUpperCase(), ML + IW / 2, y + h / 2 + 0.4,
    { align: 'center', baseline: 'middle' });
  return y + h;  // v3 : plus de +1
}

// ── Infos élève ───────────────────────────────────────────────────────────
// v3 : bande TRIMESTRE sans espacement après (+0 au lieu de +1)
export function sectionInfoEleve(doc: jsPDF, y: number, d: BulletinData): number {
  const { eleve } = d;
  const rH = 5;
  const px = 1.5;
  const cy = rH - 1.5;

  doc.setDrawColor(...NOIR); doc.setLineWidth(0.25);

  // Ligne 1 — Nom + Classe
  const w1 = IW * 0.20, w2 = IW * 0.45, w3 = IW * 0.20, w4 = IW - w1 - w2 - w3;
  let x = ML;
  [w1, w2, w3, w4].forEach(w => { cell(doc, x, y, w, rH, '', { fill: BLANC, border: true }); x += w; });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 80);
  doc.text("NOM DE L'ELEVE", ML + px, y + cy);
  doc.text('CLASSE', ML + w1 + w2 + px, y + cy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
  doc.text(`${eleve.nom.toLocaleUpperCase()} ${eleve.prenom.toLocaleUpperCase()}`, ML + w1 + px, y + cy);
  doc.text(d.nomClasse, ML + w1 + w2 + w3 + px, y + cy);
  y += rH;

  // Ligne 2 — Né le / à / Sexe / Redouble
  const lW = IW * 0.10, vW = IW * 0.15;
  const labels2 = ['NE LE', 'A', 'SEXE', 'REDOUBLE'];
  const vals2 = [eleve.date_naissance ?? '', eleve.lieu_naissance ?? '', eleve.sexe ?? '', ''];
  x = ML;
  for (let i = 0; i < 4; i++) {
    cell(doc, x, y, lW, rH, '', { fill: BLANC, border: true });
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
    doc.text(labels2[i], x + px, y + cy);
    x += lW;
    cell(doc, x, y, vW, rH, '', { fill: BLANC, border: true });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
    doc.text(vals2[i], x + px, y + cy);
    x += vW;
  }
  y += rH;

  // Ligne 3 — Matricule + ID élève
  const m1 = IW * 0.20, m2 = IW * 0.55, m3 = IW * 0.10, m4 = IW - m1 - m2 - m3;
  x = ML;
  [m1, m2, m3, m4].forEach(w => { cell(doc, x, y, w, rH, '', { fill: BLANC, border: true }); x += w; });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 80);
  doc.text('MATRICULE', ML + px, y + cy);
  doc.text('ID ELEVE', ML + m1 + m2 + px, y + cy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
  doc.text(eleve.matricule ?? '', ML + m1 + px, y + cy);
  doc.text(d.numero_eleve ?? '', ML + m1 + m2 + m3 + px, y + cy);
  y += rH;

  // Bande trimestre — v3 : pas d'espacement après
  doc.setFillColor(...BLANC); doc.rect(ML, y, IW, rH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
  doc.text(`TRIMESTRE ${d.config.trimestre}`, ML + IW / 2, y + rH / 2,
    { align: 'center', baseline: 'middle' });
  doc.text(`EFFECTIF ${d.effectif}`, ML + IW - 2, y + rH / 2,
    { align: 'right', baseline: 'middle' });
  y += rH;  // v3 : pas de +1

  return y;
}

// ── En-tête colonnes tableau ──────────────────────────────────────────────
export function sectionTableauHeader(doc: jsPDF, y: number, seqs: Sequence[], dims: TableDims): number {
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, hH } = dims;
  const xAM = ML + wMat + wCoef;
  cell(doc, ML, y, wMat, hH, 'MATIERES', { fill: BLANC, textColor: NOIR, bold: true, fontSize: 8, align: 'left', border: true });
  cell(doc, ML + wMat, y, wCoef, hH, 'COEF', { fill: BLANC, textColor: NOIR, bold: true, fontSize: 7.5, border: true });
  seqs.forEach((s, i) =>
    cell(doc, xAM + i * wSeq, y, wSeq, hH, s.replace('SEQ', 'SEC'),
      { fill: BLANC, textColor: NOIR, bold: true, fontSize: 7.5, border: true })
  );
  const xM = xAM + seqs.length * wSeq;
  cell(doc, xM, y, wMoy, hH, 'MOY/20', { fill: BLANC, textColor: NOIR, bold: true, fontSize: 7.5, border: true });
  cell(doc, xM + wMoy, y, wCoef2, hH, 'MOY×C', { fill: BLANC, textColor: NOIR, bold: true, fontSize: 7, border: true });
  cell(doc, xM + wMoy + wCoef2, y, wApp, hH, 'APP', { fill: BLANC, textColor: NOIR, bold: true, fontSize: 7.5, border: true });
  return y + hH;
}

// ── Groupe de matières ────────────────────────────────────────────────────
// v3 : rH = 4.3 → h2 = 8.6mm
export function sectionGroupe(
  doc: jsPDF, y: number,
  groupe: { nom: string; matieres: MatiereConfig[] },
  gi: number, seqs: Sequence[], eleve: any, dims: TableDims
): { y: number; totalPts: number; totalCoef: number } {
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, rH } = dims;
  const xAM = ML + wMat + wCoef;
  const xM = xAM + seqs.length * wSeq;
  let totalPts = 0, totalCoef = 0;

  groupe.matieres.forEach((mat: MatiereConfig) => {
    const coeff = toFloat(mat.coefficient);
    const notesSeq: (number | null)[] = seqs.map(seq =>
      toNote(eleve.sequences?.find((s: any) => s.sequence === seq)
        ?.notes_eleve?.find((n: any) => n.matiere === mat.nom_matiere)?.note_obtenue)
    );
    const moy = moyenneSimple(notesSeq);
    const moyCoef = moy !== null ? moy * coeff : null;
    if (moyCoef !== null) totalPts += moyCoef;
    totalCoef += coeff;

    const h2 = rH * 2;  // 4.3 * 2 = 8.6mm
    doc.setFillColor(...BLANC);
    doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);
    doc.rect(ML, y, wMat, h2, 'FD');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NOIR);
    doc.text(mat.nom_matiere, ML + 1.5, y + rH / 2 + 0.6, { baseline: 'middle' });

    doc.setFont('times', 'italic'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60);
    doc.text(
      `${mat?.enseignant?.nom?.toLocaleUpperCase() ?? ''} ${mat?.enseignant?.prenom?.toLocaleUpperCase() ?? ''}`,
      ML + 1.5, y + rH + rH / 2, { baseline: 'middle' }
    );

    cell(doc, ML + wMat, y, wCoef, h2, String(coeff), { fill: BLANC, fontSize: 7.5, border: true });
    notesSeq.forEach((n, i) => {
      const nc: RGB = n !== null && n < 10 ? ROUGE : NOIR;
      cell(doc, xAM + i * wSeq, y, wSeq, h2,
        n !== null ? n.toFixed(2) : '',
        { fill: BLANC, fontSize: 7.5, textColor: nc, border: true });
    });
    cell(doc, xM, y, wMoy, h2, fmt(moy),
      {
        fill: BLANC, bold: true, fontSize: 7.5,
        textColor: moy !== null && moy < 10 ? ROUGE : NOIR, border: true
      });
    cell(doc, xM + wMoy, y, wCoef2, h2,
      moyCoef !== null ? moyCoef.toFixed(0) : '',
      { fill: BLANC, fontSize: 7.5, border: true });
    cell(doc, xM + wMoy + wCoef2, y, wApp, h2,
      apprecLabel(moy), { fill: BLANC, fontSize: 7, border: true });

    y += h2;
  });

  return { y, totalPts, totalCoef };
}

function apprecLabel(moy: number | null): string {
  if (moy === null) return '';
  if (moy < 10) return 'NA';
  if (moy < 12) return 'CMA';
  if (moy < 14) return 'CA';
  if (moy < 16) return 'CBA';
  return 'A+';
}

// ── Total + Moyenne groupe ────────────────────────────────────────────────
// v3 : rH 4.3, espacement 0.5→0
export function sectionTotalGroupe(
  doc: jsPDF, y: number, gi: number, seqs: Sequence[],
  totalCoef: number, totalPts: number, dims: TableDims
): number {
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, rH } = dims;
  const xAM = ML + wMat + wCoef;
  const xM = xAM + seqs.length * wSeq;
  const moy = totalCoef > 0 ? totalPts / totalCoef : null;

  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...NOIR);
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);

  cell(doc, ML, y, wMat, rH, 'Total', { fill: BLANC, fontSize: 7.5, align: 'left', border: true });
  cell(doc, ML + wMat, y, wCoef, rH, String(totalCoef), { fill: BLANC, fontSize: 7.5, border: true });
  seqs.forEach((_, i) =>
    cell(doc, xAM + i * wSeq, y, wSeq, rH, '', { fill: BLANC, border: true })
  );
  cell(doc, xM, y, wMoy, rH, '', { fill: BLANC, border: true });
  cell(doc, xM + wMoy, y, wCoef2, rH, totalPts.toFixed(0),
    { fill: BLANC, bold: true, fontSize: 7.5, border: true });
  cell(doc, xM + wMoy + wCoef2, y, wApp, rH, '', { fill: BLANC, border: true });
  y += rH;

  const labels = ['premier', 'deuxieme', 'troisieme'];
  doc.setFillColor(...BLANC); doc.rect(ML, y, IW, rH, 'FD');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...NOIR);
  doc.text(`Moy. ${labels[gi] ?? (gi + 1) + 'e'} groupe`,
    ML + 2, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(moy !== null ? moy.toFixed(3) : '—',
    xM + wMoy - 1, y + rH / 2 + 0.2, { align: 'right', baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('/20', xM + wMoy + wCoef2 / 2, y + rH / 2 + 0.2,
    { align: 'center', baseline: 'middle' });
  y += rH;  // v3 : plus de +0.5

  return y;
}

// ── Totaux globaux ────────────────────────────────────────────────────────
// v3 : rH 4.3, espacement 0.5→0.3
export function sectionTotauxGlobaux(
  doc: jsPDF, y: number, totalCoef: number, totalPts: number, dims: TableDims
): { y: number; moyGlobale: number | null } {
  const rH = dims.rH;
  const moyGlobale = totalCoef > 0 ? totalPts / totalCoef : null;

  doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);
  doc.rect(ML, y, IW, rH, 'FD');

  const midX = ML + IW / 2;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...NOIR);
  doc.text('Total Coef', ML + 2, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(String(totalCoef), ML + IW * 0.22, y + rH / 2 + 0.2,
    { align: 'center', baseline: 'middle' });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
  doc.text('Total Points', midX + 2, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(String(totalPts.toFixed(0)), midX + IW * 0.22, y + rH / 2 + 0.2,
    { align: 'center', baseline: 'middle' });
  y += rH + 0.3;  // v3 : 0.5→0.3

  return { y, moyGlobale };
}

// ── Récapitulatif ─────────────────────────────────────────────────────────
// v3 : rH 4.3, sigH 3.5
export function sectionRecap(doc: jsPDF, y: number, d: BulletinData, moyGlobale: number | null): number {
  const seqs = d.config.sequences;
  const rH = 4.3;   // v3
  const sigH = 3.5;   // v3
  const col1W = IW * 0.4, col2W = IW * 0.3, col3W = IW - col1W - col2W;

  // Moyenne trimestrielle
  doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);
  doc.rect(ML, y, IW, rH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NOIR);
  doc.text('MOYENNE TRIMESTRIELLE', ML + 2, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(fmt(moyGlobale, 4), ML + col1W + 2, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('/20', ML + col1W + 24, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('RANG TRIM.', ML + IW * 0.67, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('courier', 'bold'); doc.setFontSize(18);
  doc.text(String(d.rang ?? '—'), ML + IW - 2, y + rH / 2 + 0.2,
    { align: 'right', baseline: 'middle' });
  y += rH;

  // Tableau honneur
  doc.setFillColor(...BLANC); doc.rect(ML, y, IW, rH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NOIR);
  doc.text('TABLEAU HONNEUR', ML + col1W / 2, y + rH / 2 + 0.2,
    { align: 'center', baseline: 'middle' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(moyGlobale !== null && moyGlobale >= 14 ? 'OUI' : 'NON',
    ML + col1W + 26, y + rH / 2 + 0.2, { baseline: 'middle' });
  doc.setFont('courier', 'normal'); doc.setFontSize(8);
  doc.text(`/${d.effectif}`, ML + IW - 2, y + rH / 2 + 0.2,
    { align: 'right', baseline: 'middle' });
  y += rH + 0.4;

  // En-têtes 3 colonnes
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...NOIR);
  doc.setFillColor(235, 240, 255);
  doc.rect(ML, y, col1W, rH, 'FD');
  doc.rect(ML + col1W, y, col2W, rH, 'FD');
  doc.rect(ML + col1W + col2W, y, col3W, rH, 'FD');
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);
  doc.text("RESULTAT TRIMESTRIEL",
    ML + col1W / 2, y + rH / 2 + 0.2, { align: 'center', baseline: 'middle' });
  doc.text('PROFIL DE LA CLASSE',
    ML + col1W + col2W / 2, y + rH / 2 + 0.2, { align: 'center', baseline: 'middle' });
  doc.text('CONDUITE',
    ML + col1W + col2W + col3W / 2, y + rH / 2 + 0.2, { align: 'center', baseline: 'middle' });
  y += rH;

  const profil: [string, string][] = [
    ['Moy. Premier', fmt(d.moyPremier, 3)],
    ['Moy. Dernier', fmt(d.moyDernier, 3)],
    ['Taux reussite', d.tauxReussite !== null ? `${d.tauxReussite.toFixed(1)}%` : '—'],
    ['Moy. Generale', fmt(d.moyGeneraleClasse, 2)],
  ];
  const conduite: [string, string][] = [
    ['Abs. Justifiee', String(d.absJustifiees || '')],
    ['Abs. N. Justif.', String(d.absNonJustifiees || '')],
    ['Avert. Conduite', d.avertissementConduite ? 'OUI' : ''],
    ['Blame Conduite', d.blameConduite ? 'OUI' : ''],
    ['Consigne', d.consigne ? String(d.consigne) : ''],
    ['Exclusion', d.exclusion ? String(d.exclusion) : ''],
    ['Retards', d.retards ? String(d.retards) : ''],
    ['Conseil Disc.', d.conseilDiscipline ? 'OUI' : ''],
  ];

  const nRows = Math.max(seqs.length, profil.length, conduite.length);
  for (let i = 0; i < nRows; i++) {
    doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.18);
    doc.rect(ML, y, col1W, rH, 'FD');
    doc.rect(ML + col1W, y, col2W, rH, 'FD');
    doc.rect(ML + col1W + col2W, y, col3W, rH, 'FD');

    if (i < seqs.length) {
      const seqMoy = moyenneSimple(
        (d.groupes ?? []).flatMap(g => g.matieres).map(mat =>
          toNote(d.eleve.sequences?.find((s: any) => s.sequence === seqs[i])
            ?.notes_eleve?.find((n: any) => n.matiere === mat.nom_matiere)?.note_obtenue)
        )
      );
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NOIR);
      doc.text(seqs[i].replace('SEQ', 'SEQ '),
        ML + 1.5, y + rH / 2 + 0.2, { baseline: 'middle' });
      doc.text(fmt(seqMoy, 2),
        ML + col1W - 2, y + rH / 2 + 0.2, { align: 'right', baseline: 'middle' });
    }
    if (i < profil.length) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...NOIR);
      doc.text(profil[i][0], ML + col1W + 1.5, y + rH / 2 + 0.2, { baseline: 'middle' });
      doc.setFont('helvetica', 'bold');
      doc.text(profil[i][1], ML + col1W + col2W - 1.5, y + rH / 2 + 0.2,
        { align: 'right', baseline: 'middle' });
    }
    if (i < conduite.length) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...NOIR);
      doc.text(conduite[i][0], ML + col1W + col2W + 1.5, y + rH / 2 + 0.2,
        { baseline: 'middle' });
      if (conduite[i][1]) {
        doc.setFont('helvetica', 'bold');
        doc.text(conduite[i][1], ML + IW - 1.5, y + rH / 2 + 0.2,
          { align: 'right', baseline: 'middle' });
      }
    }
    y += rH;
  }

  // Signatures — sigH = 3.5mm
  const sigRows: [string, string, string][] = [
    ['APPRE. ET SANCTION TRAV.', 'OBSERVATION', ''],
    ['', '', ''],
    ['', '', ''],
    ['VISA DU PARENT', 'VISA PROF PRINCIPAL', "VISA CHEF ETAB."],
    ['', '', ''],
    ['', '', ''],
  ];
  sigRows.forEach(([c1, c2, c3]) => {
    doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.22);
    doc.rect(ML, y, col1W, sigH, 'FD');
    doc.rect(ML + col1W, y, col2W, sigH, 'FD');
    doc.rect(ML + col1W + col2W, y, col3W, sigH, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...NOIR);
    if (c1) doc.text(c1, ML + 1.5, y + sigH / 2 + 0.2, { baseline: 'middle' });
    if (c2) doc.text(c2, ML + col1W + 1.5, y + sigH / 2 + 0.2, { baseline: 'middle' });
    if (c3) doc.text(c3, ML + col1W + col2W + 1.5, y + sigH / 2 + 0.2, { baseline: 'middle' });
    y += sigH;
  });

  return y;
}

// ── Dimensions tableau ────────────────────────────────────────────────────
// v3 : hH 5.5 (inchangé), rH 4.5 → 4.3
export interface TableDims {
  wMat: number; wCoef: number; wSeq: number;
  wMoy: number; wCoef2: number; wApp: number;
  hH: number; rH: number;
}

export function calcDims(seqs: Sequence[]): TableDims {
  const wMat = 46;
  const wCoef = 10;
  const wSeq = Math.min(15, Math.max(10,
    (IW - wMat - wCoef - 18 - 18) / Math.max(seqs.length, 1)));
  const wMoy = 16;
  const wCoef2 = 18;
  const wApp = IW - wMat - wCoef - wSeq * seqs.length - wMoy - wCoef2;
  return {
    wMat, wCoef, wSeq, wMoy, wCoef2, wApp,
    hH: 5.5,   // inchangé
    rH: 4.3,   // v3 : 4.5→4.3
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PV DE CLASSE — Paysage A4 (inchangé)
// ════════════════════════════════════════════════════════════════════════════

const WL = 297;
const GRIS_H: RGB = [211, 211, 211];

export function sectionPVEntete(doc: jsPDF, y: number, nomClasse: string, titreExamen: string): number {
  const mL = ML, mR = MR;
  const lignes: [string, string, boolean][] = [
    ['REPUBLIQUE DU CAMEROUN', 'REPUBLIC OF CAMEROON', true],
    ['PAIX-TRAVAIL-PATRIE', 'PEACE-WORK-FATHERLAND', false],
    ['MINISEC', 'MINISEC', true],
    ['DELEGATION REGIONALE DU CENTRE', 'CENTER REGIONAL DELEGATION', true],
    ['DDES-MAK', 'DDES-MAK', true],
    ['CSB BERCEAU DU SAVOIR', 'CSB BERCEAU DU SAVOIR', true],
  ];
  lignes.forEach(([fr, en, bold], i) => {
    doc.setFont('helvetica', bold ? 'bold' : 'italic');
    doc.setFontSize(8); doc.setTextColor(...NOIR);
    doc.text(fr, mL, y + i * 4 + 3, { baseline: 'middle' });
    doc.text(en, WL - mR, y + i * 4 + 3, { align: 'right', baseline: 'middle' });
  });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('Téléphone: +237 679 33 78 60', mL, y + 27, { baseline: 'middle' });
  doc.text('Téléphone: 237 679 33 78 60', WL - mR, y + 27, { align: 'right', baseline: 'middle' });
  y += 33;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NOIR);
  doc.text('COLLEGE BILINGUE BERCEAU DU SAVOIR', WL / 2, y + 4,
    { align: 'center', baseline: 'middle' });
  y += 9;
  const tw = doc.getTextWidth(titreExamen);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(titreExamen, WL / 2, y + 4, { align: 'center', baseline: 'middle' });
  doc.setLineWidth(0.4); doc.setDrawColor(...NOIR);
  doc.line(WL / 2 - tw / 2 - 1, y + 6, WL / 2 + tw / 2 + 1, y + 6);
  y += 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(`CLASSE: ${nomClasse}`, mL, y + 3, { baseline: 'middle' });
  y += 7;
  return y;
}

export function sectionPVTableau(doc: jsPDF, y: number, d: PVData): number {
  const HL = 210, MARGE_BAS = 18, Y_MAX = HL - MARGE_BAS;
  const usableW = WL - ML - MR;
  const seqs = d.config.sequences, mats = d.matieres;
  const wN = 7, wNom = 32;
  const wMats = mats.map(() =>
    Math.max(8, Math.min(12, (usableW - wN - wNom - 44) / mats.length)));
  const wMoySeq = seqs.length > 1 ? 11 : 0;
  const wTot = 15, wRang = 9, wMoy = 13;
  const wDec = usableW - wN - wNom
    - wMats.reduce((a, b) => a + b, 0)
    - seqs.length * wMoySeq - wTot - wRang - wMoy;
  const hH = 5.5, rH = 5.5;
  const totalCoef = mats.reduce((a, m) => a + toFloat(m.coefficient), 0);

  const drawHeader = (yh: number): number => {
    let cx = ML;
    cell(doc, cx, yh, wN + wNom, hH, 'COEFTS',
      { fill: BLANC, bold: true, fontSize: 8.5, align: 'left', border: true }); cx += wN + wNom;
    mats.forEach((m, i) => {
      cell(doc, cx, yh, wMats[i], hH, String(toFloat(m.coefficient)),
        { fill: GRIS_H, bold: true, fontSize: 8, border: true }); cx += wMats[i];
    });
    if (seqs.length > 1) seqs.forEach(() => {
      cell(doc, cx, yh, wMoySeq, hH, '', { fill: GRIS_H, border: true }); cx += wMoySeq;
    });
    cell(doc, cx, yh, wTot, hH, String(totalCoef),
      { fill: BLANC, bold: true, fontSize: 8, border: true }); cx += wTot;
    cell(doc, cx, yh, wRang, hH, '', { fill: BLANC, border: true }); cx += wRang;
    cell(doc, cx, yh, wMoy, hH, '', { fill: BLANC, border: true }); cx += wMoy;
    cell(doc, cx, yh, wDec, hH, '', { fill: BLANC, border: true });
    yh += hH;
    cx = ML;
    cell(doc, cx, yh, wN, hH, 'N°', { fill: GRIS_H, bold: true, fontSize: 8, border: true }); cx += wN;
    cell(doc, cx, yh, wNom, hH, 'NOMS & PRENOMS',
      { fill: GRIS_H, bold: true, fontSize: 8, align: 'left', border: true }); cx += wNom;
    mats.forEach((m, i) => {
      cell(doc, cx, yh, wMats[i], hH, m.nom_matiere.slice(0, 5),
        { fill: GRIS_H, bold: true, fontSize: 7, border: true }); cx += wMats[i];
    });
    if (seqs.length > 1) seqs.forEach(s => {
      cell(doc, cx, yh, wMoySeq, hH, `M.${s.replace('SEQ', '')}`,
        { fill: GRIS_H, bold: true, fontSize: 6.5, border: true }); cx += wMoySeq;
    });
    cell(doc, cx, yh, wTot, hH, 'TOTAUX', { fill: GRIS_H, bold: true, fontSize: 8, border: true }); cx += wTot;
    cell(doc, cx, yh, wRang, hH, 'RANG', { fill: GRIS_H, bold: true, fontSize: 8, border: true }); cx += wRang;
    cell(doc, cx, yh, wMoy, hH, 'MOY', { fill: GRIS_H, bold: true, fontSize: 8, border: true }); cx += wMoy;
    cell(doc, cx, yh, wDec, hH, 'DECISIONS', { fill: GRIS_H, bold: true, fontSize: 8, border: true });
    return yh + hH;
  };

  y = drawHeader(y);
  d.lignes.forEach((ligne, ri) => {
    if (y + rH > Y_MAX) {
      sectionPVSignatures(doc, y);
      doc.addPage('a4', 'landscape');
      y = drawHeader(6);
    }
    const alt: RGB = ri % 2 === 0 ? BLANC : [248, 250, 255];
    let cx = ML;
    cell(doc, cx, y, wN, rH, String(ligne.numero), { fill: alt, fontSize: 7.5, border: true }); cx += wN;
    cell(doc, cx, y, wNom, rH,
      `${ligne.eleve.nom.toLocaleUpperCase()} ${ligne.eleve.prenom.toLocaleUpperCase()}`.slice(0, 20),
      { fill: alt, fontSize: 7, align: 'left', border: true }); cx += wNom;
    mats.forEach((m, mi) => {
      const vals = seqs.map(seq =>
        toNote(ligne.eleve.sequences?.find((s: any) => s.sequence === seq)
          ?.notes_eleve?.find((n: any) => n.matiere === m.nom_matiere)?.note_obtenue));
      const n = seqs.length === 1 ? vals[0] : moyenneSimple(vals);
      cell(doc, cx, y, wMats[mi], rH, n !== null ? n.toFixed(2) : '',
        {
          fill: alt, fontSize: 7.5, border: true,
          textColor: n !== null && n < 10 ? ROUGE : NOIR
        }); cx += wMats[mi];
    });
    if (seqs.length > 1) seqs.forEach(seq => {
      const ms = ligne.moyParSeq?.[seq] ?? null;
      cell(doc, cx, y, wMoySeq, rH, fmt(ms),
        {
          fill: [240, 248, 240], bold: true, fontSize: 7, border: true,
          textColor: ms !== null && ms < 10 ? ROUGE : NOIR
        }); cx += wMoySeq;
    });
    cell(doc, cx, y, wTot, rH, fmt(ligne.total, 1), { fill: alt, fontSize: 7.5, border: true }); cx += wTot;
    cell(doc, cx, y, wRang, rH, ligne.rang !== null ? String(ligne.rang) : '',
      { fill: alt, fontSize: 7.5, border: true }); cx += wRang;
    cell(doc, cx, y, wMoy, rH, fmt(ligne.moyGlobale),
      {
        fill: alt, bold: true, fontSize: 7.5, border: true,
        textColor: ligne.moyGlobale !== null && ligne.moyGlobale < 10 ? ROUGE : NOIR
      }); cx += wMoy;
    cell(doc, cx, y, wDec, rH, ligne.decision,
      {
        fill: alt, bold: true, fontSize: 7.5, border: true,
        textColor: ligne.decision === 'ADMIS' ? VERT : ROUGE
      });
    y += rH;
  });
  return y;
}

export function sectionPVSignatures(doc: jsPDF, y: number): void {
  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NOIR);
  doc.text('CELLULE INFORMATIQUE', ML, y, { baseline: 'middle' });
  doc.text('DIRECTION DES ETUDES', WL / 2, y, { align: 'center', baseline: 'middle' });
  doc.text('LE PRINCIPAL', WL - MR, y, { align: 'right', baseline: 'middle' });
}

// ── Fiche de saisie (inchangée) ───────────────────────────────────────────
export function sectionFicheSaisie(doc: jsPDF, d: FicheSaisieData, seq: Sequence): void {
  const HP = 297, MARGE_BAS = 16, Y_MAX = HP - MARGE_BAS;
  const WP = 210, rH = 7;
  const BLEU_F: RGB = [0, 84, 166];

  const startPage = (mat: MatiereConfig): number => {
    let y = 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BLEU_F);
    doc.text(d.nomEcole, WP / 2, y, { align: 'center', baseline: 'middle' }); y += 7;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NOIR);
    doc.text(
      `FICHE DE SAISIE — ${seq} — Classe : ${d.nomClasse} — Année : ${d.annee}`,
      WP / 2, y, { align: 'center', baseline: 'middle' }); y += 7;
    doc.setFillColor(...BLEU_F);
    doc.rect(ML, y, WP - ML - MR, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...BLANC);
    doc.text(mat.nom_matiere.toUpperCase(), WP / 2, y + 4.5,
      { align: 'center', baseline: 'middle' });
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(200, 220, 255);
    doc.text(((mat as any).professeur ?? ''), WP / 2, y + 10,
      { align: 'center', baseline: 'middle' });
    y += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text(`Coefficient : ${toFloat(mat.coefficient)}   /20`, ML, y, { baseline: 'middle' }); y += 6;
    const wNom = WP - ML - MR - 30 - 20, wNote = 30, wApp = 20;
    cell(doc, ML, y, wNom, 8, 'NOM & PRÉNOM', { fill: BLEU_F, textColor: BLANC, bold: true, fontSize: 8, align: 'left', border: true });
    cell(doc, ML + wNom, y, wNote, 8, 'NOTE /20', { fill: BLEU_F, textColor: BLANC, bold: true, fontSize: 8, border: true });
    cell(doc, ML + wNom + wNote, y, wApp, 8, 'APP.', { fill: BLEU_F, textColor: BLANC, bold: true, fontSize: 8, border: true });
    y += 8;
    return y;
  };

  const drawFooter = (y: number, mat: MatiereConfig): void => {
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NOIR);
    doc.text(((mat as any).professeur ?? 'Prof. :'), ML, y, { baseline: 'middle' });
    doc.text(`${seq} — ${mat.nom_matiere}`, WP / 2, y, { align: 'center', baseline: 'middle' });
    doc.text('VISA DIRECTION', WP - MR, y, { align: 'right', baseline: 'middle' });
  };

  const wNom = WP - ML - MR - 30 - 20, wNote = 30, wApp = 20;
  let firstPage = true;
  d.matieres.forEach(mat => {
    if (!firstPage) doc.addPage('a4', 'portrait');
    firstPage = false;
    let y = startPage(mat);
    d.eleves.forEach((eleve, i) => {
      if (y + rH > Y_MAX) {
        drawFooter(y, mat);
        doc.addPage('a4', 'portrait');
        y = startPage(mat);
      }
      const alt: RGB = i % 2 === 0 ? BLANC : [248, 250, 255];
      cell(doc, ML, y, wNom, rH,
        `${i + 1}. ${eleve.nom.toLocaleUpperCase()} ${eleve.prenom.toLocaleUpperCase()}`,
        { fill: alt, align: 'left', fontSize: 7.5, border: true });
      cell(doc, ML + wNom, y, wNote, rH, '', { fill: alt, border: true });
      cell(doc, ML + wNom + wNote, y, wApp, rH, '', { fill: alt, border: true });
      y += rH;
    });
    drawFooter(y, mat);
  });
}