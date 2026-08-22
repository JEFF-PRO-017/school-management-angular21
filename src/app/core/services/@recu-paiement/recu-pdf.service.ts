// shared/utils/recu-pdf-builder.ts
import jsPDF from 'jspdf';

// ── Palette ──────────────────────────────────────────────────
const NAVY   = '#122A4C';
const GOLD   = '#B8933A';
const RED    = '#D64541';
const GREEN  = '#25D366';
const GRIS   = '#EEF1F4';
const BORDER = '#D9DEE3';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGE  = 8;
const LARGEUR = PAGE_W - MARGE * 2;

// ── Types ────────────────────────────────────────────────────
export interface EcoleInfo {
  nom: string;
  slogan?: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
}

export interface EnfantLigne {
  numero: number;
  nomPrenom: string;
  classe: string;
}

export interface RecuBonConfig {
  ecole: EcoleInfo;
  idRecu: string;
  numeroParent: string;
  nomFamille: string;
  enfants: EnfantLigne[];
  montantPaiement: number;
  montantVerseTotal: number;
  montantRestant: number;
  datePaiement: string; // JJ/MM/AAAA
  heurePaiement: string; // HH:MM
}

/** Valeurs par défaut de l'école — utilisées si l'appelant ne fournit rien. */
export const ECOLE_DEFAUT: EcoleInfo = {
  nom: 'GROUPE SCOLAIRE BERCEAU DU SAVOIR',
  slogan: 'EXCELLENCE · DISCIPLINE · RÉUSSITE',
  adresse: 'Cocody, Riviera 3\nAbidjan - Côte d\'Ivoire',
  telephone: '+225 07 89 12 34 56',
  email: 'contact@berceaudusavoir.ci',
  siteWeb: 'www.berceaudusavoir.ci',
};

// ── Fonction publique ────────────────────────────────────────
/** Génère un reçu A4 avec 2 exemplaires identiques (Parent + Archive), séparés par une ligne de découpe. */
export function genererRecuPdf(config: RecuBonConfig): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = MARGE;
  y = dessinerExemplaireComplet(doc, y, config, 'REÇU PARENT');
  y = dessinerLigneDecoupe(doc, y);
  y = dessinerExemplaireComplet(doc, y, config, 'COPIE ARCHIVE');

  return doc;
}

// ── Un exemplaire complet (réutilisé pour Parent ET Archive) ──
function dessinerExemplaireComplet(doc: jsPDF, y0: number, cfg: RecuBonConfig, libelle: string): number {
  let y = y0;
  y = dessinerEntete(doc, y, cfg, libelle);
  y = dessinerCorps(doc, y, cfg);
  y = dessinerSignatureEtContact(doc, y);
  y = dessinerMerci(doc, y);
  y = dessinerPiedContact(doc, y, cfg.ecole);
  return y;
}

// ── En-tête : logo + titre + ID reçu + onglet latéral ─────────
function dessinerEntete(doc: jsPDF, y0: number, cfg: RecuBonConfig, libelle: string): number {
  const x0 = MARGE;
  let y = y0 + 4;

  // Logo vectoriel simplifié (blason + livre)
  dessinerLogo(doc, x0 + 8, y + 6, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.text(cfg.ecole.nom, x0 + 18, y + 3);

  if (cfg.ecole.slogan) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(GOLD);
    doc.text(cfg.ecole.slogan, x0 + 18, y + 7.5);
  }

  // Titre central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(NAVY);
  doc.text(libelle, x0 + LARGEUR / 2 - 6, y + 6, { align: 'center' });

  // Boîte ID reçu (haut droite)
  const boiteW = 34, boiteH = 12, boiteX = x0 + LARGEUR - boiteW - 8, boiteY = y - 1;
  doc.setDrawColor(BORDER);
  doc.roundedRect(boiteX, boiteY, boiteW, boiteH, 1.5, 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor('#888');
  doc.text('ID REÇU', boiteX + 3, boiteY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(GOLD);
  doc.text(cfg.idRecu, boiteX + 3, boiteY + 9);

  y += 12;
  doc.setDrawColor(GOLD);
  doc.setLineDashPattern([1, 0.8], 0);
  doc.line(x0, y, x0 + LARGEUR - 8, y);
  doc.setLineDashPattern([], 0);

  // Onglet vertical à droite
  dessinerOngletLateral(doc, y0, libelle);

  return y + 4;
}

function dessinerOngletLateral(doc: jsPDF, y0: number, libelle: string): void {
  const largeurOnglet = 7, hauteurOnglet = 118;
  const x = PAGE_W - MARGE - largeurOnglet + 2;
  doc.setFillColor(NAVY);
  doc.roundedRect(x, y0, largeurOnglet, hauteurOnglet, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#fff');
  doc.text(libelle, x + largeurOnglet / 2 + 1, y0 + hauteurOnglet / 2, { angle: 90, align: 'center' });
}

function dessinerLogo(doc: jsPDF, cx: number, cy: number, r: number): void {
  doc.setDrawColor(GOLD);
  doc.setFillColor('#fff');
  doc.circle(cx, cy, r, 'FD');
  doc.setFillColor(NAVY);
  doc.circle(cx, cy - 1, r * 0.35, 'F'); // "livre/étoile" simplifié
  doc.setDrawColor(GOLD);
  doc.line(cx - r * 0.6, cy + r * 0.4, cx + r * 0.6, cy + r * 0.4);
}

// ── Corps : colonne infos famille + tableau enfants | colonne montant ──
function dessinerCorps(doc: jsPDF, y0: number, cfg: RecuBonConfig): number {
  const x0 = MARGE;
  const colGaucheW = LARGEUR * 0.52;
  const colDroiteX = x0 + colGaucheW + 6;
  const colDroiteW = LARGEUR - colGaucheW - 6 - 8; // -8 pour l'onglet latéral

  let yG = dessinerColonneFamille(doc, x0, y0, colGaucheW, cfg);
  let yD = dessinerColonneMontant(doc, colDroiteX, y0, colDroiteW, cfg);

  return Math.max(yG, yD) + 4;
}

function dessinerColonneFamille(doc: jsPDF, x: number, y0: number, w: number, cfg: RecuBonConfig): number {
  let y = y0 + 3;

  ligneIcone(doc, x, y, 'personne');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#555');
  doc.text('N° PARENT', x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(cfg.numeroParent, x + w - 2, y + 0.5, { align: 'right' });
  y += 7;

  ligneIcone(doc, x, y, 'groupe');
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text('NOM DE LA FAMILLE', x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(cfg.nomFamille.toUpperCase(), x + w - 2, y + 0.5, { align: 'right' });
  y += 6;

  doc.setDrawColor(BORDER);
  doc.line(x, y, x + w, y);
  y += 5;

  ligneIcone(doc, x, y, 'personne');
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text(`NOMBRE D'ENFANT(S)`, x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(`${cfg.enfants.length}`, x + w - 2, y + 0.5, { align: 'right' });
  y += 5;

  // Tableau enfants
  const hEntete = 5.5, hLigne = 5.5;
  doc.setFillColor(NAVY);
  doc.rect(x, y, w, hEntete, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor('#fff');
  doc.text('N°', x + 2, y + 3.8);
  doc.text('NOM ET PRÉNOM', x + 10, y + 3.8);
  doc.text('CLASSE', x + w - 18, y + 3.8);
  y += hEntete;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  for (const e of cfg.enfants) {
    doc.setDrawColor(BORDER);
    doc.rect(x, y, w, hLigne);
    doc.setFillColor(NAVY);
    doc.circle(x + 3.2, y + hLigne / 2, 1.6, 'F');
    doc.setTextColor('#fff'); doc.setFontSize(6);
    doc.text(`${e.numero}`, x + 3.2, y + hLigne / 2 + 0.8, { align: 'center' });
    doc.setFontSize(7.5); doc.setTextColor(NAVY);
    doc.text(e.nomPrenom, x + 8, y + hLigne / 2 + 1);
    doc.setTextColor('#555');
    doc.text(e.classe, x + w - 18, y + hLigne / 2 + 1);
    y += hLigne;
  }

  return y;
}

function dessinerColonneMontant(doc: jsPDF, x: number, y0: number, w: number, cfg: RecuBonConfig): number {
  let y = y0;

  // Bandeau montant du paiement
  const hBandeau = 15;
  doc.setFillColor(NAVY);
  doc.roundedRect(x, y, w, hBandeau, 2, 2, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor('#cfd8e6');
  doc.text('MONTANT DU PAIEMENT', x + w / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor('#fff');
  doc.text(`${fmt(cfg.montantPaiement)} FCFA`, x + w / 2, y + 11.5, { align: 'center' });
  y += hBandeau + 3;

  doc.setDrawColor(BORDER);
  doc.roundedRect(x, y, w, 16, 2, 2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor('#555');
  doc.text('MONTANT DÉJÀ VERSÉ', x + 3, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(`${fmt(cfg.montantVerseTotal)} FCFA`, x + w - 3, y + 5.5, { align: 'right' });

  doc.setDrawColor(BORDER);
  doc.line(x + 3, y + 8, x + w - 3, y + 8);

  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text('MONTANT RESTANT', x + 3, y + 12.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(cfg.montantRestant > 0 ? RED : NAVY);
  doc.text(`${fmt(cfg.montantRestant)} FCFA`, x + w - 3, y + 12.5, { align: 'right' });
  y += 20;

  // Date + heure
  doc.setDrawColor(BORDER);
  doc.roundedRect(x, y, w, 14, 2, 2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor('#555');
  doc.text('DATE DE PAIEMENT :', x + 3, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(cfg.datePaiement, x + w - 3, y + 5.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text('HEURE :', x + 3, y + 11);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(cfg.heurePaiement, x + w - 3, y + 11, { align: 'right' });
  y += 14;

  return y;
}

// ── Signature / Cachet / Service client ────────────────────────
function dessinerSignatureEtContact(doc: jsPDF, y0: number): number {
  const x0 = MARGE;
  const largeurTotale = LARGEUR - 8; // -8 onglet
  const h = 20;
  const wSignCachet = largeurTotale * 0.62;
  const wContact = largeurTotale - wSignCachet - 4;

  const y = y0;
  doc.setDrawColor(BORDER);
  doc.rect(x0, y, wSignCachet, h);
  doc.line(x0 + wSignCachet / 2, y, x0 + wSignCachet / 2, y + h);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor('#888');
  doc.text('SIGNATURE CACHET', x0 + wSignCachet / 4, y + 4, { align: 'center' });
  doc.text(`CACHET DE L'ÉCOLE`, x0 + wSignCachet * 0.75, y + 4, { align: 'center' });

  // Zone cachet école (cercle pointillé)
  doc.setDrawColor('#bbb');
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.circle(x0 + wSignCachet * 0.75, y + h / 2 + 3, 6.5);
  doc.setLineDashPattern([], 0);

  // Bloc service client
  const xC = x0 + wSignCachet + 4;
  doc.setFillColor(NAVY);
  doc.rect(xC, y, wContact, 5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor('#fff');
  doc.text('SERVICE CLIENT', xC + 3, y + 3.4);
  doc.setDrawColor(BORDER);
  doc.rect(xC, y + 5, wContact, h - 5);

  doc.setFillColor(GREEN);
  doc.circle(xC + 4, y + 10, 1.8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY);
  doc.text('WhatsApp', xC + 8, y + 11);

  doc.setFillColor(NAVY);
  doc.circle(xC + 4, y + 16, 1.8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text('Appel', xC + 8, y + 17);

  return y + h + 4;
}

function dessinerMerci(doc: jsPDF, y0: number): number {
  const x0 = MARGE, w = LARGEUR - 8;
  const y = y0 + 4;
  doc.setDrawColor(GOLD);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(x0 + w * 0.2, y, x0 + w * 0.42, y);
  doc.line(x0 + w * 0.58, y, x0 + w * 0.8, y);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(NAVY);
  doc.text('Merci pour votre confiance !', x0 + w / 2, y + 1, { align: 'center' });
  return y + 5;
}

// ── Pied de page contact (identique sur les 2 exemplaires) ──────
function dessinerPiedContact(doc: jsPDF, y0: number, ecole: EcoleInfo): number {
  const x0 = MARGE, w = LARGEUR - 8, h = 12;
  doc.setFillColor(NAVY);
  doc.rect(x0, y0, w, h, 'F');

  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor('#fff');
  const adresse = ecole.adresse.replace('\n', ' — ');
  doc.text(adresse, x0 + 3, y0 + 5);
  doc.text(ecole.email, x0 + w / 2 - 8, y0 + 5);
  doc.text(ecole.siteWeb, x0 + w - 3, y0 + 5, { align: 'right' });

  return y0 + h + 6;
}

// ── Ligne de découpe entre les deux exemplaires ─────────────────
function dessinerLigneDecoupe(doc: jsPDF, y0: number): number {
  const x0 = MARGE, w = LARGEUR;
  const y = y0 + 3;
  doc.setDrawColor('#999');
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(x0 + 6, y, x0 + w, y);
  doc.setLineDashPattern([], 0);

  // Icône ciseaux simplifiée (deux cercles + lignes)
  doc.setDrawColor('#999');
  doc.circle(x0 + 2, y - 1, 0.8);
  doc.circle(x0 + 2, y + 1, 0.8);
  doc.line(x0 + 2.6, y - 0.6, x0 + 5, y);
  doc.line(x0 + 2.6, y + 0.6, x0 + 5, y);

  return y + 6;
}

// ── Icônes miniatures pour les lignes d'info ────────────────────
function ligneIcone(doc: jsPDF, x: number, y: number, type: 'personne' | 'groupe'): void {
  doc.setFillColor(GRIS);
  doc.roundedRect(x, y - 3, 4.5, 4.5, 1, 1, 'F');
  doc.setDrawColor(NAVY);
  if (type === 'personne') {
    doc.circle(x + 2.25, y - 1.4, 0.7);
    doc.line(x + 1.3, y + 0.6, x + 3.2, y + 0.6);
  } else {
    doc.circle(x + 1.6, y - 1.2, 0.55);
    doc.circle(x + 3, y - 1.2, 0.55);
  }
}

// ── Formatage ────────────────────────────────────────────────
function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}