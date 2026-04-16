// insolvables-pdf.service.ts
// PDF liste insolvables — paysage A4, suit le modèle sectionPVTableau
// Pattern identique à recu.service.ts : buildDoc() privé, generer() public
import { Injectable } from '@angular/core';
import { Famille } from '../../core/models';
import jsPDF from 'jspdf';


// ── Couleurs identiques à bulletin-sections ──────────────────────
type RGB = [number, number, number];
const BLANC:  RGB = [255, 255, 255];
const NOIR:   RGB = [0, 0, 0];
const BLEU:   RGB = [21, 95, 165];
const GRIS_H: RGB = [211, 211, 211];
const GRIS_L: RGB = [248, 249, 252];
const ROUGE:  RGB = [153, 60, 29];
const VERT:   RGB = [15, 110, 86];

// ── Mise en page paysage A4 ───────────────────────────────────────
const WL = 297;   // largeur landscape
const HL = 210;   // hauteur landscape
const ML = 10;    // marge gauche
const MR = 10;    // marge droite

export interface InfosEcole {
  nom:   string;
  ville: string;
  tel:   string;
}

const ECOLE_DEFAULT: InfosEcole = {
  nom:   'CSB BERCEAU DU SAVOIR',
  ville: 'Yaoundé — Cameroun',
  tel:   '+237 679 33 78 60',
};

@Injectable({ providedIn: 'root' })
export class InsolvablesPdfService {

  genererListeInsolvables(
    familles:      Famille[],
    seuil:         number,
    anneeScolaire: string,
    dateRef?:      string,
    ecole:         InfosEcole = ECOLE_DEFAULT,
  ): void {
    const doc  = this.buildDoc(familles, seuil, anneeScolaire, dateRef, ecole);
    const date = new Date().toISOString().slice(0, 10);
    doc.save(`insolvables_${anneeScolaire.replace('/', '-')}_${date}.pdf`);
  }

  apercu(
    familles:      Famille[],
    seuil:         number,
    anneeScolaire: string,
    dateRef?:      string,
    ecole:         InfosEcole = ECOLE_DEFAULT,
  ): void {
    const doc = this.buildDoc(familles, seuil, anneeScolaire, dateRef, ecole);
    window.open(doc.output('bloburl') as string, '_blank');
  }

  // ── Construction ─────────────────────────────────────────────────

  private buildDoc(
    familles:      Famille[],
    seuil:         number,
    anneeScolaire: string,
    dateRef:       string | undefined,
    ecole:         InfosEcole,
  ): any {
    const jsPDFClass = (window as any).jspdf?.jsPDF;
    const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let y = this.entete(doc, ecole, seuil, anneeScolaire, dateRef, familles.length);
    y = this.tableau(doc, y, familles);
    this.signatures(doc, y);

    return doc;
  }

  // ── En-tête — suit sectionPVEntete ───────────────────────────────
  private entete(
    doc:    any,
    ecole:  InfosEcole,
    seuil:  number,
    annee:  string,
    dateRef: string | undefined,
    nb:     number,
  ): number {
    let y = 6;

    // Bloc gauche — établissement
    const lignes: [string, boolean][] = [
      ['REPUBLIQUE DU CAMEROUN', true],
      ['PAIX-TRAVAIL-PATRIE',    false],
      ['MINEDUC / DDES-MAK',     true],
      [ecole.nom,                true],
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
    const sousTitre = `Année scolaire ${annee} — Versé inférieur à ${this.fcfa(seuil)}`;
    const tw = doc.getTextWidth(sousTitre);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(sousTitre, WL / 2, y + 4, { align: 'center', baseline: 'middle' });
    doc.setLineWidth(0.4); doc.setDrawColor(...NOIR);
    doc.line(WL / 2 - tw / 2 - 1, y + 6, WL / 2 + tw / 2 + 1, y + 6);
    y += 10;

    // Ligne méta : date édition + nb familles + RDV exclusion
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(...NOIR);
    const metaG = `Édité le ${this.fmtDate(new Date().toISOString().slice(0, 10))}   •   ${nb} famille(s) concernée(s)`;
    const metaD = dateRef ? `RDV exclus après ${this.fmtDate(dateRef)}` : '';
    doc.text(metaG, ML, y + 3, { baseline: 'middle' });
    if (metaD) doc.text(metaD, WL - MR, y + 3, { align: 'right', baseline: 'middle' });
    y += 7;

    return y;
  }

  // ── Tableau — suit exactement sectionPVTableau ────────────────────
  private tableau(doc: any, yStart: number, familles: Famille[]): number {
    const MARGE_BAS = 18;
    const Y_MAX     = HL - MARGE_BAS;
    const usableW   = WL - ML - MR;

    // Colonnes : n° | nom famille | enfants | contact | attendu | versé | restant | rdv
    const wN    = 7;
    const wNom  = 38;
    const wEnf  = 22;
    const wCont = 26;
    const wAtt  = 22;
    const wVer  = 22;
    const wRest = 28;
    const wRdv  = usableW - wN - wNom - wEnf - wCont - wAtt - wVer - wRest;

    const hH = 5.5;   // hauteur en-tête
    const rH = 5.5;   // hauteur ligne

    // Dessine l'en-tête — réutilisé à chaque saut de page
    const drawHeader = (y: number): number => {
      let cx = ML;

      // Ligne 1 — en-têtes colonnes
      this.cell(doc, cx, y, wN,    hH, 'N°',       { fill: GRIS_H, bold: true, fs: 8 }); cx += wN;
      this.cell(doc, cx, y, wNom,  hH, 'FAMILLE',  { fill: GRIS_H, bold: true, fs: 8, align: 'left' }); cx += wNom;
      this.cell(doc, cx, y, wEnf,  hH, 'ENFANTS',  { fill: GRIS_H, bold: true, fs: 8 }); cx += wEnf;
      this.cell(doc, cx, y, wCont, hH, 'CONTACT',  { fill: GRIS_H, bold: true, fs: 8 }); cx += wCont;
      this.cell(doc, cx, y, wAtt,  hH, 'ATTENDU',  { fill: GRIS_H, bold: true, fs: 8 }); cx += wAtt;
      this.cell(doc, cx, y, wVer,  hH, 'VERSÉ',    { fill: GRIS_H, bold: true, fs: 8 }); cx += wVer;
      this.cell(doc, cx, y, wRest, hH, 'RESTANT',  { fill: [235, 243, 252] as RGB, bold: true, fs: 8, textColor: [12, 68, 124] as RGB }); cx += wRest;
      this.cell(doc, cx, y, wRdv,  hH, 'PROCHAIN RDV', { fill: GRIS_H, bold: true, fs: 8 });

      return y + hH;
    };

    let y = drawHeader(yStart);

    // Totaux courants pour la ligne récapitulative
    let totAttendu = 0, totVerse = 0, totRestant = 0;

    familles.forEach((f, ri) => {
      // Saut de page automatique avec répétition de l'en-tête — suit sectionPVTableau
      if (y + rH > Y_MAX) {
        this.signatures(doc, y);
        doc.addPage('a4', 'landscape');
        y = drawHeader(6);
      }

      const attendu = this.montantAttendu(f);
      const verse   = this.totalVerse(f);
      const restant = Math.max(0, attendu - verse);
      totAttendu += attendu;
      totVerse   += verse;
      totRestant += restant;

      const alt: RGB = ri % 2 === 0 ? BLANC : GRIS_L;
      let cx = ML;

      this.cell(doc, cx, y, wN,    rH, String(ri + 1),            { fill: alt, fs: 7.5 }); cx += wN;
      this.cell(doc, cx, y, wNom,  rH, this.trunc(f.nom_famille, 20), { fill: alt, fs: 7.5, bold: true, align: 'left' }); cx += wNom;

      // Enfants + classes
      const enfants = (f.eleves ?? []).filter(e => e.statut === 'actif');
      const classes = [...new Set(enfants.map(e => e.id_classe))].join('/');
      this.cell(doc, cx, y, wEnf, rH, `${enfants.length} · ${this.trunc(classes, 8)}`,
        { fill: alt, fs: 7 }); cx += wEnf;

      // Contact
      this.cell(doc, cx, y, wCont, rH, f.tel_pere || f.tel_mere || '—',
        { fill: alt, fs: 7, align: 'left' }); cx += wCont;

      // Attendu
      this.cell(doc, cx, y, wAtt, rH, this.fcfa(attendu),
        { fill: alt, fs: 7.5 }); cx += wAtt;

      // Versé — vert si > 0
      this.cell(doc, cx, y, wVer, rH, this.fcfa(verse),
        { fill: alt, fs: 7.5, textColor: verse > 0 ? VERT : NOIR }); cx += wVer;

      // Restant — rouge, fond bleu clair, gras
      this.cell(doc, cx, y, wRest, rH, this.fcfa(restant),
        { fill: [235, 243, 252] as RGB, fs: 7.5, bold: true, textColor: ROUGE }); cx += wRest;

      // RDV
      const rdv = this.dernierRdv(f);
      this.cell(doc, cx, y, wRdv, rH, rdv ? this.fmtDate(rdv) : '—',
        { fill: alt, fs: 7 });

      y += rH;
    });

    // ── Ligne TOTAUX — suit la ligne Total du PV ──────────────────
    y += 1;
    doc.setFillColor(...BLEU);
    doc.rect(ML, y, usableW, rH + 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLANC);

    const xAtt  = ML + wN + wNom + wEnf + wCont;
    const xVer  = xAtt + wAtt;
    const xRest = xVer + wVer;

    doc.text('TOTAUX', ML + 4, y + (rH + 1) / 2, { baseline: 'middle' });
    doc.text(this.fcfa(totAttendu), xAtt + wAtt - 2, y + (rH + 1) / 2,
      { align: 'right', baseline: 'middle' });
    doc.text(this.fcfa(totVerse),   xVer + wVer - 2, y + (rH + 1) / 2,
      { align: 'right', baseline: 'middle' });
    // Restant total en jaune sur fond bleu (identique PV decisions ADMIS)
    doc.setTextColor(255, 235, 59);
    doc.text(this.fcfa(totRestant), xRest + wRest - 2, y + (rH + 1) / 2,
      { align: 'right', baseline: 'middle' });

    y += rH + 3;
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
    doc:   any,
    x:     number,
    y:     number,
    w:     number,
    h:     number,
    text:  string,
    opts:  {
      fill?:      RGB;
      bold?:      boolean;
      fs?:        number;
      textColor?: RGB;
      align?:     'left' | 'center' | 'right';
      border?:    boolean;
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

    const xText = align === 'right'  ? x + w - 1.5
                : align === 'center' ? x + w / 2
                : x + 1.5;
    doc.text(text, xText, y + h / 2, { align, baseline: 'middle' });
  }

  // ── Helpers métier (mêmes calculs que le composant) ──────────────

  private montantAttendu(f: Famille): number {
    return +(f.montant_total_attendu ?? 0) - +(f.montant_reduction ?? 0);
  }
  private totalVerse(f: Famille): number {
    return (f.paiements ?? []).reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
  }
  private dernierRdv(f: Famille): string | null {
    const rdvs = (f.paiements ?? [])
      .map((p) => p.date_prochain_rdv).filter(Boolean) as string[];
    return rdvs.length ? rdvs.sort().at(-1)! : null;
  }

  // ── Formatters ────────────────────────────────────────────────────

  private fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
  }
  private fmtDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }
  private trunc(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
}