// renderer-technique.ts
// Même header/footer que secondaire.
// Différence : colonne TP par matière + note finale = (Th*2 + TP) / 3

import jsPDF from 'jspdf';
import { BulletinData } from '../../helper/bulletin.models';
import { cell, BLANC, toFloat, toNote, moyenneSimple, NOIR, ROUGE, fmt, VERT } from '../../helper/pdf-helpers';
import { sectionBandeVerticale, sectionEntete, sectionTitreBulletin, sectionInfoEleve, calcDims, ML, IW, sectionTotauxGlobaux, sectionRecap } from './bulletin-sections';


export function renderBulletinTechnique(doc: jsPDF, d: BulletinData): void {
  sectionBandeVerticale(doc);
  let y = sectionEntete(doc, 6, d.config.annee);
  y = sectionTitreBulletin(doc, y, d.config.titre || `BULLETIN TECHNIQUE TRIMESTRIEL ${d.config.trimestre}`);
  y = sectionInfoEleve(doc, y, d);

  const seqs = d.config.sequences;
  const dims = calcDims(seqs);
  const { wMat, wCoef, wSeq, wMoy, wCoef2, wApp, hH, rH } = dims;
  const wTh = Math.floor(wSeq * 0.55), wTP = wSeq - wTh;
  const xMoy = ML + wMat + wCoef + seqs.length * wSeq;

  // En-tête — ligne 1 : noms colonnes
  cell(doc, ML,          y, wMat,  hH, 'MATIERES',  { fill: BLANC, bold: true, fontSize: 9, align: 'left', border: true });
  cell(doc, ML + wMat,   y, wCoef, hH, 'COEF',      { fill: BLANC, bold: true, fontSize: 8,  border: true });
  seqs.forEach((s, i) =>
    cell(doc, ML + wMat + wCoef + i * wSeq, y, wSeq, hH, s.replace('SEQ', 'SEC'), { fill: BLANC, bold: true, fontSize: 7.5, border: true })
  );
  cell(doc, xMoy,        y, wMoy,   hH, 'MOY/20',   { fill: BLANC, bold: true, fontSize: 8, border: true });
  cell(doc, xMoy + wMoy, y, wCoef2, hH, 'NOTE FIN.', { fill: BLANC, bold: true, fontSize: 7.5, border: true });
  cell(doc, xMoy + wMoy + wCoef2, y, wApp, hH, 'APP', { fill: BLANC, bold: true, fontSize: 8, border: true });
  y += hH;

  // En-tête ligne 2 : Th. / TP par séquence
  cell(doc, ML, y, wMat + wCoef, hH / 2, '', { fill: BLANC, border: true });
  seqs.forEach((_, i) => {
    const cx = ML + wMat + wCoef + i * wSeq;
    cell(doc, cx,        y, wTh, hH / 2, 'Th.',  { fill: [220, 235, 255], bold: true, fontSize: 6, border: true });
    cell(doc, cx + wTh,  y, wTP, hH / 2, 'TP',   { fill: [220, 255, 220], bold: true, fontSize: 6, border: true });
  });
  [xMoy, xMoy + wMoy, xMoy + wMoy + wCoef2].forEach((cx, ci) =>
    cell(doc, cx, y, [wMoy, wCoef2, wApp][ci], hH / 2, '', { fill: BLANC, border: true })
  );
  y += hH / 2;

  let totalPts = 0, totalCoef = 0;

  d.groupes.forEach((groupe, gi) => {
    let ptsSG = 0, coefSG = 0;
    groupe.matieres.forEach(mat => {
      const coeff = toFloat(mat.coefficient);
      const notesThSeq = seqs.map(seq => toNote(d.eleve.sequences?.find((s: any) => s.sequence === seq)?.notes_eleve?.find((n: any) => n.matiere === mat.nom_matiere)?.note_obtenue));
      const notesTPSeq = seqs.map(seq => toNote(d.eleve.sequences?.find((s: any) => s.sequence === seq)?.notes_eleve?.find((n: any) => n.matiere === `TP_${mat.nom_matiere}`)?.note_obtenue));
      const moyTh = moyenneSimple(notesThSeq);
      const moyTP = moyenneSimple(notesTPSeq);
      const noteFin = moyTh !== null ? (moyTP !== null ? (moyTh * 2 + moyTP) / 3 : moyTh) : null;
      const moyCoef = noteFin !== null ? noteFin * coeff : null;
      if (moyCoef !== null) { ptsSG += moyCoef; totalPts += moyCoef; }
      coefSG += coeff; totalCoef += coeff;

      const h2 = rH * 2;
      doc.setFillColor(...BLANC); doc.setDrawColor(...NOIR); doc.setLineWidth(0.3);
      doc.rect(ML, y, wMat, h2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...NOIR);
      doc.text(mat.nom_matiere, ML + 1.5, y + rH / 2 + 1, { baseline: 'middle' });
      doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
      doc.text((mat as any).professeur ?? '', ML + 1.5, y + rH + rH / 2 + 1, { baseline: 'middle' });

      cell(doc, ML + wMat, y, wCoef, h2, String(coeff), { fill: BLANC, fontSize: 9, border: true });
      seqs.forEach((_, i) => {
        const cx = ML + wMat + wCoef + i * wSeq;
        const nth = notesThSeq[i], ntp = notesTPSeq[i];
        cell(doc, cx,       y, wTh, h2, nth !== null ? nth.toFixed(2) : '', { fill: BLANC, fontSize: 9, border: true, textColor: nth !== null && nth < 10 ? ROUGE : NOIR });
        cell(doc, cx + wTh, y, wTP, h2, ntp !== null ? ntp.toFixed(2) : '', { fill: [248, 255, 248], fontSize: 9, border: true, textColor: ntp !== null && ntp < 10 ? ROUGE : NOIR });
      });
      cell(doc, xMoy,          y, wMoy,   h2, fmt(moyTh),   { fill: BLANC, bold: true, fontSize: 9, border: true, textColor: moyTh !== null && moyTh < 10 ? ROUGE : NOIR });
      cell(doc, xMoy + wMoy,   y, wCoef2, h2, fmt(noteFin),  { fill: [240, 252, 240], bold: true, fontSize: 9, border: true, textColor: noteFin !== null && noteFin < 10 ? ROUGE : VERT });
      cell(doc, xMoy + wMoy + wCoef2, y, wApp, h2, (mat as any).appreciation ?? '', { fill: BLANC, fontSize: 8, border: true });
      y += h2;
    });

    // Total groupe
    doc.setFillColor(245, 245, 245); doc.setDrawColor(...NOIR); doc.rect(ML, y, IW, rH, 'FD');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...NOIR);
    doc.text(`Total coef ${coefSG}   Points ${ptsSG.toFixed(0)}`, ML + 2, y + rH / 2 + 0.5, { baseline: 'middle' });
    const moyG = coefSG > 0 ? ptsSG / coefSG : null;
    if (moyG !== null) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`Moyenne du ${['premier','deuxieme','troisieme'][gi]} groupe  ${moyG.toFixed(4)} /20`, ML + IW - 2, y + rH / 2 + 0.5, { align: 'right', baseline: 'middle' });
    }
    y += rH + 1;
  });

  const { y: y2, moyGlobale } = sectionTotauxGlobaux(doc, y, totalCoef, totalPts, { ...calcDims(seqs) });
  sectionRecap(doc, y2, d, moyGlobale);
}