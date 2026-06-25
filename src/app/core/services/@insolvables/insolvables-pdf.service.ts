// insolvables-pdf.service.ts
// PDF liste insolvables — paysage A4, suit le modèle sectionPVTableau
// Pattern identique à recu.service.ts : buildDoc() privé, generer() public
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { EleveData } from '../../../features/insolvables/insolvables-list/insolvables-list.component';
import { _fmtDate, _fcfa, _trunc, _dernierRdvFamille, InfosEcole, BLANC, BLEU_L, BLEU_T, ECOLE_DEFAULT, GRIS_H, GRIS_L, HL, ML, MR, NOIR, RGB, ROUGE, VERT, WL } from './index';





@Injectable({ providedIn: 'root' })
export class InsolvablesPdfService {

  // ── Point d'entrée public ─────────────────────────────────────────
  genererListeInsolvables(
    eleves: EleveData[],
    seuil: number,
    anneeScolaire: string,
    dateRef?: string,
    ecole: InfosEcole = ECOLE_DEFAULT,
  ): void {
    const doc = this._buildDoc(eleves, seuil, anneeScolaire, dateRef, ecole);
    const date = new Date().toISOString().slice(0, 10);
    doc.save(`insolvables_${anneeScolaire.replace('/', '-')}_${date}.pdf`);
  }

  // ── Construction du document ──────────────────────────────────────
  private _buildDoc(
    eleves: EleveData[],
    seuil: number,
    anneeScolaire: string,
    dateRef: string | undefined,
    ecole: InfosEcole,
  ): any {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let y = this.entete(doc, ecole, seuil, anneeScolaire, dateRef, eleves.length);
    y = this._tableau(doc, y, eleves);
    this.signatures(doc, y);
    return doc;
  }
  // ── En-tête — suit sectionPVEntete ───────────────────────────────
  private entete(
    doc: any,
    ecole: InfosEcole,
    seuil: number,
    annee: string,
    dateRef: string | undefined,
    nb: number,
  ): number {
    let y = 6;

    // Bloc gauche — établissement
    const lignes: [string, boolean][] = [
      ['REPUBLIQUE DU CAMEROUN', true],
      ['PAIX-TRAVAIL-PATRIE', false],
      ['MINEDUC / DDES-MAK', true],
      [ecole.nom, true],
    ];
    lignes.forEach(([txt, bold], i) => {
      doc.setFont('helvetica', bold ? 'bold' : 'italic');
      doc.setFontSize(8); doc.setTextColor(...NOIR);
      doc.text(txt, ML, y + i * 4 + 3, { baseline: 'middle' });
    });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(ecole.tel, ML, y + 20, { baseline: 'middle' });
    y += 26;

    // Titre centré — suit le style du PV
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NOIR);
    doc.text('LISTE DES FAMILLES EN RETARD DE PAIEMENT', WL / 2, y + 4,
      { align: 'center', baseline: 'middle' });
    y += 9;

    // Sous-titre avec soulignement
    const sousTitre = `Année scolaire ${annee} — Versé inférieur à ${_fcfa(seuil)}`;
    const tw = doc.getTextWidth(sousTitre);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(sousTitre, WL / 2, y + 4, { align: 'center', baseline: 'middle' });
    doc.setLineWidth(0.4); doc.setDrawColor(...NOIR);
    doc.line(WL / 2 - tw / 2 - 1, y + 6, WL / 2 + tw / 2 + 1, y + 6);
    y += 10;

    // Ligne méta : date édition + nb familles + RDV exclusion
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(...NOIR);
    const metaG = `Édité le ${_fmtDate(new Date().toISOString().slice(0, 10))}   •   ${nb} famille(s) concernée(s)`;
    const metaD = dateRef ? `RDV exclus après ${_fmtDate(dateRef)}` : '';
    doc.text(metaG, ML, y + 3, { baseline: 'middle' });
    if (metaD) doc.text(metaD, WL - MR, y + 3, { align: 'right', baseline: 'middle' });
    y += 7;

    return y;
  }

  // ── Tableau principal ─────────────────────────────────────────────
  private _tableau(doc: any, yStart: number, eleves: EleveData[]): number {
    const MARGE_BAS = 18;
    const Y_MAX = HL - MARGE_BAS;
    const usableW = WL - ML - MR;

    // Colonnes : élève | famille | classe | contact | versé/e | versé T | attendu | reste | rdv
    const wN = 6;
    const wNom = 32;
    const wFam = 28;
    const wCls = 20;
    const wCont = 24;
    const wVe = 20;  // versé/e
    const wVt = 20;  // versé T
    const wAtt = 22;  // attendu famille
    const wRest = 22;  // reste
    const wRdv = usableW - wN - wNom - wFam - wCls - wCont - wVe - wVt - wAtt - wRest;

    const hH = 5.5;
    const rH = 5.5;
    const aujourd = new Date().toISOString().slice(0, 10);

    const drawHeader = (y: number): number => {
      let cx = ML;
      this.cell(doc, cx, y, wN, hH, 'N°', { fill: GRIS_H, bold: true, fs: 8 }); cx += wN;
      this.cell(doc, cx, y, wNom, hH, 'ÉLÈVE', { fill: GRIS_H, bold: true, fs: 8, align: 'left' }); cx += wNom;
      this.cell(doc, cx, y, wFam, hH, 'FAMILLE', { fill: GRIS_H, bold: true, fs: 8, align: 'left' }); cx += wFam;
      this.cell(doc, cx, y, wCls, hH, 'CLASSE', { fill: GRIS_H, bold: true, fs: 8 }); cx += wCls;
      this.cell(doc, cx, y, wCont, hH, 'CONTACT', { fill: GRIS_H, bold: true, fs: 8 }); cx += wCont;
      this.cell(doc, cx, y, wVe, hH, 'VERSÉ/E', { fill: BLEU_L, bold: true, fs: 8, textColor: BLEU_T }); cx += wVe;
      this.cell(doc, cx, y, wVt, hH, 'VERSÉ T', { fill: BLEU_L, bold: true, fs: 8, textColor: BLEU_T }); cx += wVt;
      this.cell(doc, cx, y, wAtt, hH, 'ATTENDU T', { fill: GRIS_H, bold: true, fs: 8 }); cx += wAtt;
      this.cell(doc, cx, y, wRest, hH, 'RESTE T', { fill: BLEU_L, bold: true, fs: 8, textColor: ROUGE }); cx += wRest;
      this.cell(doc, cx, y, wRdv, hH, 'PROCHAIN RDV', { fill: GRIS_H, bold: true, fs: 8 });
      return y + hH;
    };

    let y = drawHeader(yStart);
    let totVe = 0, totVt = 0, totAtt = 0, totRest = 0;

    eleves.forEach((e, ri) => {
      if (y + rH > Y_MAX) {
        this.signatures(doc, y);
        doc.addPage('a4', 'landscape');
        y = drawHeader(6);
      }

      totVe += e.montant_par_enfant;
      totVt += e.verse_famille;
      totAtt += e.attendu_famille;
      totRest += e.reste_par_enfant;

      const alt: RGB = ri % 2 === 0 ? BLANC : GRIS_L;
      let cx = ML;

      this.cell(doc, cx, y, wN, rH, String(ri + 1),
        { fill: alt, fs: 7.5 }); cx += wN;

      this.cell(doc, cx, y, wNom, rH, _trunc(`${e.nom} ${e.prenom}`, 20),
        { fill: alt, fs: 7.5, bold: true, align: 'left' }); cx += wNom;

      this.cell(doc, cx, y, wFam, rH, _trunc(`${e.famille?.nom_famille ?? '—'}-(${e.nb_enfants_famille}) enfant(s) `  , 16),
        { fill: alt, fs: 7, align: 'left' }); cx += wFam;

      this.cell(doc, cx, y, wCls, rH, e.classe?.nom_classe ?? '—',
        { fill: alt, fs: 7 }); cx += wCls;

      this.cell(doc, cx, y, wCont, rH,
        e.famille?.tel_pere || e.famille?.tel_mere || '—',
        { fill: alt, fs: 7, align: 'left' }); cx += wCont;

      // Versé/e — vert si > 0
      this.cell(doc, cx, y, wVe, rH, _fcfa(e.montant_par_enfant),
        {
          fill: BLEU_L, fs: 7.5,
          textColor: e.montant_par_enfant > 0 ? VERT : NOIR
        }); cx += wVe;

      // Versé T famille
      this.cell(doc, cx, y, wVt, rH, _fcfa(e.verse_famille),
        {
          fill: BLEU_L, fs: 7.5,
          textColor: e.verse_famille > 0 ? VERT : NOIR
        }); cx += wVt;

      // Attendu famille
      this.cell(doc, cx, y, wAtt, rH, _fcfa(e.attendu_famille),
        { fill: alt, fs: 7.5 }); cx += wAtt;

      // Reste — fond rouge clair si moratoire dépassé
      const fillRest: RGB = e.moratoire_depasse ? [254, 226, 226] : BLEU_L;
      this.cell(doc, cx, y, wRest, rH, _fcfa(e.reste_par_enfant),
        { fill: fillRest, fs: 7.5, bold: true, textColor: ROUGE }); cx += wRest;

      // RDV — rouge si date dépassée
      const rdv = _dernierRdvFamille(e.famille);
      const rdvLabel = rdv ? _fmtDate(rdv) : '—';
      const rdvColor: RGB = rdv && rdv < aujourd ? ROUGE : NOIR;
      this.cell(doc, cx, y, wRdv, rH, rdvLabel,
        { fill: alt, fs: 7, textColor: rdvColor });

      y += rH;
    });

    // Ligne totaux
    // if (eleves.length > 0) {
    //   if (y + rH > Y_MAX) {
    //     this.signatures(doc, y);
    //     doc.addPage('a4', 'landscape');
    //     y = 6;
    //   }
    //   let cx = ML;
    //   const wSkip = wN + wNom + wFam + wCls + wCont;
    //   this.cell(doc, cx, y, wSkip, rH, 'TOTAL',
    //     { fill: GRIS_H, bold: true, fs: 8, align: 'left' }); cx += wSkip;
    //   this.cell(doc, cx, y, wVe, rH, _fcfa(totVe),
    //     { fill: BLEU_L, bold: true, fs: 8, textColor: VERT }); cx += wVe;
    //   this.cell(doc, cx, y, wVt, rH, _fcfa(totVt),
    //     { fill: BLEU_L, bold: true, fs: 8, textColor: VERT }); cx += wVt;
    //   this.cell(doc, cx, y, wAtt, rH, _fcfa(totAtt),
    //     { fill: GRIS_H, bold: true, fs: 8 }); cx += wAtt;
    //   this.cell(doc, cx, y, wRest, rH, _fcfa(totRest),
    //     { fill: BLEU_L, bold: true, fs: 8, textColor: ROUGE }); cx += wRest;
    //   this.cell(doc, cx, y, wRdv, rH, '',
    //     { fill: GRIS_H, fs: 8 });
    //   y += rH;
    // }

    return y;
  }

  // ── Signatures — suit sectionPVSignatures ────────────────────────
  private signatures(doc: any, y: number): void {
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NOIR);
    doc.text('CELLULE COMPTABILITE', ML, y, { baseline: 'middle' });
    doc.text('DIRECTION DES ETUDES', WL / 2, y, { align: 'center', baseline: 'middle' });
    doc.text('LE PRINCIPAL', WL - MR, y, { align: 'right', baseline: 'middle' });
  }

  // ── Utilitaire cell — suit exactement la fonction cell() de pdf-helpers ──
  // Options : fill, bold, fs (fontSize), textColor, align, border
  private cell(
    doc: any,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    opts: {
      fill?: RGB;
      bold?: boolean;
      fs?: number;
      textColor?: RGB;
      align?: 'left' | 'center' | 'right';
      border?: boolean;
    } = {}
  ): void {
    const { fill = BLANC, bold = false, fs = 8,
      textColor = NOIR, align = 'center', border = true } = opts;

    doc.setFillColor(...fill);
    doc.rect(x, y, w, h, 'F');

    if (border) {
      doc.setDrawColor(...NOIR);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h, 'S');
    }

    if (!text) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fs);
    doc.setTextColor(...textColor);

    const xText = align === 'right' ? x + w - 1.5
      : align === 'center' ? x + w / 2
        : x + 1.5;
    doc.text(text, xText, y + h / 2, { align, baseline: 'middle' });
  }


}