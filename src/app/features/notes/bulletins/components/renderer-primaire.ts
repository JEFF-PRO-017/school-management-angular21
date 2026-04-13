// renderer-primaire.ts
// Header/footer identiques. Différences :
//   - Notation sur 10 (conversion si note_sur=20)
//   - Pas de groupes — liste simple
//   - Mentions TB/B/AB/P/I
//   - Décision ADMIS(E) / À REDOUBLER dans le récap

import jsPDF from 'jspdf';
import { BulletinData } from '../../helper/bulletin.models';
import { cell, BLANC, toFloat, toNote, moyenneSimple, NOIR, ROUGE, fmt } from '../../helper/pdf-helpers';
import { sectionBandeVerticale, sectionEntete, ML, IW, sectionInfoEleve, calcDims, sectionTotauxGlobaux, sectionRecap } from './bulletin-sections';


function men10(n: number | null): string {
  if (n === null) return '';
  const v = n * 2;
  if (v >= 18) return 'TB'; if (v >= 14) return 'B';
  if (v >= 12) return 'AB'; if (v >= 10) return 'P';
  if (v >= 8)  return 'I';  return 'TI';
}

function norm10(note: number | null, sur: number): number | null {
  return note === null ? null : (sur === 20 ? note / 2 : note);
}

export function renderBulletinPrimaire(doc: jsPDF, d: BulletinData): void {
  sectionBandeVerticale(doc);
  let y = sectionEntete(doc, 6, d.config.annee);

  // Titre avec "PÉRIODE" au lieu de "TRIMESTRE"
  const titres: Record<number, string> = { 1: 'PREMIER TRIMESTRE', 2: 'DEUXIÈME TRIMESTRE', 3: 'TROISIÈME TRIMESTRE' };
  doc.setFillColor(0, 0, 0); doc.rect(ML, y, IW, 11, 'F');
  doc.setFont('courier', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  doc.text((d.config.titre || `BULLETIN DU ${titres[d.config.trimestre] ?? ''}`).toUpperCase(), ML + IW / 2, y + 6, { align: 'center', baseline: 'middle' });
  y += 13;

  y = sectionInfoEleve(doc, y, d);

  const seqs = d.config.sequences;
  const dims = calcDims(seqs);
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, hH, rH } = dims;
  const xMoy = ML + wMat + wCoef + seqs.length * wSeq;

  // En-tête — /10 au lieu de /20, APP = mention
  cell(doc, ML,          y, wMat,  hH, 'MATIÈRES',  { fill: BLANC, bold: true, fontSize: 9, align: 'left', border: true });
  cell(doc, ML + wMat,   y, wCoef, hH, 'COEF.',     { fill: BLANC, bold: true, fontSize: 8, border: true });
  seqs.forEach((s, i) =>
    cell(doc, ML + wMat + wCoef + i * wSeq, y, wSeq, hH, s.replace('SEQ', '/10'), { fill: BLANC, bold: true, fontSize: 8, border: true })
  );
  cell(doc, xMoy,          y, wMoy,   hH, 'MOY/10',  { fill: BLANC, bold: true, fontSize: 8, border: true });
  cell(doc, xMoy + wMoy,   y, wCoef2, hH, 'M.COEF',  { fill: BLANC, bold: true, fontSize: 8, border: true });
  cell(doc, xMoy + wMoy + wCoef2, y, wApp, hH, 'MEN.', { fill: BLANC, bold: true, fontSize: 8, border: true });
  y += hH;

  let totalPts = 0, totalCoef = 0;
  const toutes = d.groupes.flatMap(g => g.matieres);

  toutes.forEach(mat => {
    const coeff   = toFloat(mat.coefficient);
    const noteSur = toFloat((mat as any).note_eliminatoire ?? 20);
    const notesSeq = seqs.map(seq =>
      norm10(toNote(d.eleve.sequences?.find((s: any) => s.sequence === seq)
        ?.notes_eleve?.find((n: any) => n.matiere === mat.nom_matiere)?.note_obtenue), noteSur)
    );
    const moy     = moyenneSimple(notesSeq);
    const moyCoef = moy !== null ? moy * coeff : null;
    if (moyCoef !== null) totalPts += moyCoef;
    totalCoef += coeff;

    const h2 = rH * 2;
    doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.3);
    doc.rect(ML, y, wMat, h2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...NOIR);
    doc.text(mat.nom_matiere, ML + 1.5, y + rH / 2 + 1, { baseline: 'middle' });
    doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
    doc.text((mat as any).professeur ?? '', ML + 1.5, y + rH + rH / 2 + 1, { baseline: 'middle' });

    cell(doc, ML + wMat, y, wCoef, h2, String(coeff), { fill: BLANC, fontSize: 9, border: true });
    notesSeq.forEach((n, i) =>
      cell(doc, ML + wMat + wCoef + i * wSeq, y, wSeq, h2,
        n !== null ? n.toFixed(2) : '', { fill: BLANC, fontSize: 9, border: true, textColor: n !== null && n < 5 ? ROUGE : NOIR })
    );
    cell(doc, xMoy,        y, wMoy,   h2, fmt(moy),  { fill: BLANC, bold: true, fontSize: 9, border: true, textColor: moy !== null && moy < 5 ? ROUGE : NOIR });
    cell(doc, xMoy + wMoy, y, wCoef2, h2, moyCoef !== null ? moyCoef.toFixed(1) : '', { fill: BLANC, fontSize: 9, border: true });
    cell(doc, xMoy + wMoy + wCoef2, y, wApp, h2, men10(moy), { fill: BLANC, bold: true, fontSize: 9, border: true, textColor: moy !== null && moy >= 5 ? [0, 100, 50] : ROUGE });
    y += h2;
  });

  const { y: y2, moyGlobale } = sectionTotauxGlobaux(doc, y, totalCoef, totalPts, dims);
  sectionRecap(doc, y2, d, moyGlobale);
}