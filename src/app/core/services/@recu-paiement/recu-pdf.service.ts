// features/paiements/modal/recu-pdf.service.ts
import jsPDF from 'jspdf';
import { dessinerIconeSvg, IconName } from './pdf-icons';

// ── Palette ──────────────────────────────────────────────────
const NAVY   = '#122A4C';
const GOLD   = '#B8933A';
const RED    = '#D64541';
const GREEN  = '#25D366';
const BORDER = '#D9DEE3';
const RAYON  = 1.6; // rayon d'arrondi standard pour tous les cadres

const PAGE_W = 210;
const MARGE  = 8;
const LARGEUR = PAGE_W - MARGE * 2;

const MAX_ENFANTS_AFFICHES = 5; // borne stricte anti-débordement

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
  datePaiement: string;
  heurePaiement: string;
}

export const ECOLE_DEFAUT: EcoleInfo = {
  nom: 'GROUPE SCOLAIRE BERCEAU DU SAVOIR',
  slogan: 'EXCELLENCE · DISCIPLINE · RÉUSSITE',
  adresse: 'Cocody, Riviera 3\nAbidjan - Côte d\'Ivoire',
  telephone: '+225 07 89 12 34 56',
  email: 'contact@berceaudusavoir.ci',
  siteWeb: 'www.berceaudusavoir.ci',
};

/** Valeur ou 8 tirets si absente/vide. */
function v(val?: string | null): string {
  return val && val.trim() !== '' ? val : '--------';
}

// ── Fonction publique ────────────────────────────────────────
/** Génère un reçu A4 avec 2 exemplaires identiques (Parent + Archive), séparés par une ligne de découpe. */
export async function genererRecuPdf(config: RecuBonConfig): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = MARGE;
  y = await dessinerExemplaireComplet(doc, y, config, 'REÇU PARENT');
  y = dessinerLigneDecoupe(doc, y);
  y = await dessinerExemplaireComplet(doc, y, config, 'COPIE ARCHIVE');

  return doc;
}

// ── Un exemplaire complet (réutilisé pour Parent ET Archive) ──
async function dessinerExemplaireComplet(doc: jsPDF, y0: number, cfg: RecuBonConfig, libelle: string): Promise<number> {
  let y = y0;
  y = await dessinerEntete(doc, y, cfg, libelle);
  y = await dessinerCorps(doc, y, cfg);
  y = await dessinerSignatureEtContact(doc, y);
  y = dessinerMerci(doc, y);
  y = dessinerPiedContact(doc, y, cfg.ecole);

  // Onglet latéral dessiné en dernier avec la hauteur RÉELLE du contenu → jamais de débordement/mismatch
  dessinerOngletLateral(doc, y0, y - y0 - 3, libelle);

  return y;
}

// ── En-tête : logo + titre + ID reçu ───────────────────────────
async function dessinerEntete(doc: jsPDF, y0: number, cfg: RecuBonConfig, libelle: string): Promise<number> {
  const x0 = MARGE;
  let y = y0 + 4;

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(NAVY);
  doc.text(libelle, x0 + LARGEUR / 2 - 6, y + 6, { align: 'center' });

  // Boîte ID reçu (haut droite) — coins arrondis + icône reçu
  const boiteW = 38, boiteH = 12, boiteX = x0 + LARGEUR - boiteW - 8, boiteY = y - 1;
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(boiteX, boiteY, boiteW, boiteH, RAYON, RAYON);
  await dessinerIconeSvg(doc, 'receipt', boiteX + boiteW - 8, boiteY + 3, 5.5, NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor('#888');
  doc.text('ID REÇU', boiteX + 3, boiteY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(GOLD);
  doc.text(v(cfg.idRecu), boiteX + 3, boiteY + 9);

  y += 12;
  doc.setDrawColor(GOLD);
  doc.setLineDashPattern([1, 0.8], 0);
  doc.line(x0, y, x0 + LARGEUR - 8, y);
  doc.setLineDashPattern([], 0);

  return y + 4;
}

function dessinerOngletLateral(doc: jsPDF, y0: number, hauteur: number, libelle: string): void {
  const largeurOnglet = 7;
  const x = PAGE_W - MARGE - largeurOnglet + 2;
  doc.setFillColor(NAVY);
  doc.roundedRect(x, y0, largeurOnglet, hauteur, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#fff');
  doc.text(libelle, x + largeurOnglet / 2 + 1, y0 + hauteur / 2, { angle: 90, align: 'center' });
}

function dessinerLogo(doc: jsPDF, cx: number, cy: number, r: number): void {
  doc.setDrawColor(GOLD);
  doc.setFillColor('#fff');
  doc.circle(cx, cy, r, 'FD');
  doc.setFillColor(NAVY);
  doc.circle(cx, cy - 1, r * 0.35, 'F');
  doc.setDrawColor(GOLD);
  doc.line(cx - r * 0.6, cy + r * 0.4, cx + r * 0.6, cy + r * 0.4);
}

// ── Corps : colonne infos famille + tableau enfants | colonne montant ──
async function dessinerCorps(doc: jsPDF, y0: number, cfg: RecuBonConfig): Promise<number> {
  const x0 = MARGE;
  const colGaucheW = LARGEUR * 0.52;
  const colDroiteX = x0 + colGaucheW + 6;
  const colDroiteW = LARGEUR - colGaucheW - 6 - 8;

  const yG = await dessinerColonneFamille(doc, x0, y0, colGaucheW, cfg);
  const yD = await dessinerColonneMontant(doc, colDroiteX, y0, colDroiteW, cfg);

  return Math.max(yG, yD) + 4;
}

async function dessinerColonneFamille(doc: jsPDF, x: number, y0: number, w: number, cfg: RecuBonConfig): Promise<number> {
  let y = y0 + 3;

  await badgeIcone(doc, 'person-fill', x, y - 3.2, 4.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#555');
  doc.text('N° PARENT', x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(v(cfg.numeroParent), x + w - 2, y + 0.5, { align: 'right' });
  y += 7;

  await badgeIcone(doc, 'people-fill', x, y - 3.2, 4.5);
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text('NOM DE LA FAMILLE', x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(v(cfg.nomFamille).toUpperCase(), x + w - 2, y + 0.5, { align: 'right' });
  y += 6;

  doc.setDrawColor(BORDER);
  doc.line(x, y, x + w, y);
  y += 5;

  await badgeIcone(doc, 'person-fill', x, y - 3.2, 4.5);
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text(`NOMBRE D'ENFANT(S)`, x + 6, y + 0.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(`${cfg.enfants.length}`, x + w - 2, y + 0.5, { align: 'right' });
  y += 5;

  // Tableau enfants — coins arrondis, borné à MAX_ENFANTS_AFFICHES lignes
  const hEntete = 5.5, hLigne = 5.5;
  const affiches = cfg.enfants.slice(0, MAX_ENFANTS_AFFICHES);

  doc.setFillColor(NAVY);
  doc.roundedRect(x, y, w, hEntete, RAYON, RAYON, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor('#fff');
  doc.text('N°', x + 2, y + 3.8);
  doc.text('NOM ET PRÉNOM', x + 10, y + 3.8);
  doc.text('CLASSE', x + w - 18, y + 3.8);
  y += hEntete;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  for (const e of affiches) {
    doc.setDrawColor(BORDER);
    doc.line(x, y, x + w, y);
    doc.setFillColor(NAVY);
    doc.circle(x + 3.2, y + hLigne / 2, 1.6, 'F');
    doc.setTextColor('#fff'); doc.setFontSize(6);
    doc.text(`${e.numero}`, x + 3.2, y + hLigne / 2 + 0.8, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY);
    doc.text(e.nomPrenom, x + 8, y + hLigne / 2 + 1);
    doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
    doc.text(e.classe, x + w - 18, y + hLigne / 2 + 1);
    y += hLigne;
  }
  doc.setDrawColor(BORDER);
  doc.roundedRect(x, y - hEntete - affiches.length * hLigne, w, hEntete + affiches.length * hLigne, RAYON, RAYON);

  if (cfg.enfants.length > MAX_ENFANTS_AFFICHES) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor('#888');
    doc.text(`+ ${cfg.enfants.length - MAX_ENFANTS_AFFICHES} autre(s) enfant(s) non affiché(s)`, x, y + 3.5);
    y += 5.5;
  }

  return y;
}

async function dessinerColonneMontant(doc: jsPDF, x: number, y0: number, w: number, cfg: RecuBonConfig): Promise<number> {
  let y = y0;

  // Bandeau montant du paiement — coins arrondis + icône portefeuille
  const hBandeau = 15;
  doc.setFillColor(NAVY);
  doc.roundedRect(x, y, w, hBandeau, RAYON + 0.4, RAYON + 0.4, 'F');
  doc.setFillColor('#fff');
  doc.circle(x + 8, y + 7.5, 3.6, 'F');
  await dessinerIconeSvg(doc, 'wallet2', x + 5.7, y + 5.2, 4.6, NAVY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor('#cfd8e6');
  doc.text('MONTANT DU PAIEMENT', x + w / 2 + 6, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor('#fff');
  doc.text(`${fmt(cfg.montantPaiement)} FCFA`, x + w / 2 + 6, y + 11.5, { align: 'center' });
  y += hBandeau + 3;

  doc.setDrawColor(BORDER);
  doc.roundedRect(x, y, w, 16, RAYON, RAYON);
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

  // Date + heure — coins arrondis + icônes
  doc.setDrawColor(BORDER);
  doc.roundedRect(x, y, w, 14, RAYON, RAYON);
  await badgeIcone(doc, 'calendar3-fill', x + 3, y + 2, 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor('#555');
  doc.text('DATE :', x + 9, y + 5.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(v(cfg.datePaiement), x + w - 3, y + 5.5, { align: 'right' });

  await badgeIcone(doc, 'clock', x + 3, y + 7.5, 4);
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#555');
  doc.text('HEURE :', x + 9, y + 11);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text(v(cfg.heurePaiement), x + w - 3, y + 11, { align: 'right' });
  y += 14;

  return y;
}

// ── Signature / Cachet / Service client ────────────────────────
async function dessinerSignatureEtContact(doc: jsPDF, y0: number): Promise<number> {
  const x0 = MARGE;
  const largeurTotale = LARGEUR - 8;
  const h = 20;
  const wSignCachet = largeurTotale * 0.62;
  const wContact = largeurTotale - wSignCachet - 4;

  const y = y0;
  doc.setDrawColor(BORDER);
  doc.roundedRect(x0, y, wSignCachet, h, RAYON, RAYON);
  doc.line(x0 + wSignCachet / 2, y, x0 + wSignCachet / 2, y + h);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor('#888');
  doc.text('SIGNATURE CACHET', x0 + wSignCachet / 4, y + 4, { align: 'center' });
  doc.text(`CACHET DE L'ÉCOLE`, x0 + wSignCachet * 0.75, y + 4, { align: 'center' });

  doc.setDrawColor('#bbb');
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.circle(x0 + wSignCachet * 0.75, y + h / 2 + 3, 6.5);
  doc.setLineDashPattern([], 0);

  // Bloc service client — coins arrondis + icônes WhatsApp / téléphone nettes
  const xC = x0 + wSignCachet + 4;
  doc.setFillColor(NAVY);
  doc.roundedRect(xC, y, wContact, 5, RAYON, RAYON, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor('#fff');
  doc.text('SERVICE CLIENT', xC + 3, y + 3.4);
  doc.setDrawColor(BORDER);
  doc.roundedRect(xC, y + 5, wContact, h - 5, RAYON, RAYON);

  doc.setFillColor(GREEN);
  doc.circle(xC + 4, y + 10.5, 2, 'F');
  await dessinerIconeSvg(doc, 'whatsapp', xC + 2.4, y + 8.9, 3.2, '#fff');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(NAVY);
  doc.text('WhatsApp', xC + 8, y + 11.3);

  doc.setFillColor(NAVY);
  doc.circle(xC + 4, y + 16.5, 2, 'F');
  await dessinerIconeSvg(doc, 'telephone-fill', xC + 2.4, y + 14.9, 3.2, '#fff');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY);
  doc.text('Appel', xC + 8, y + 17.3);

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

// ── Pied de page contact ────────────────────────────────────────
function dessinerPiedContact(doc: jsPDF, y0: number, ecole: EcoleInfo): number {
  const x0 = MARGE, w = LARGEUR - 8, h = 12;
  doc.setFillColor(NAVY);
  doc.roundedRect(x0, y0, w, h, RAYON, RAYON, 'F');

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

  doc.setDrawColor('#999');
  doc.circle(x0 + 2, y - 1, 0.8);
  doc.circle(x0 + 2, y + 1, 0.8);
  doc.line(x0 + 2.6, y - 0.6, x0 + 5, y);
  doc.line(x0 + 2.6, y + 0.6, x0 + 5, y);

  return y + 6;
}

// ── Badge icône carré arrondi (fond gris clair, icône marine) ───
async function badgeIcone(doc: jsPDF, icone: IconName, x: number, y: number, taille: number): Promise<void> {
  doc.setFillColor('#EEF1F4');
  doc.roundedRect(x, y, taille, taille, taille * 0.25, taille * 0.25, 'F');
  const pad = taille * 0.18;
  await dessinerIconeSvg(doc, icone, x + pad, y + pad, taille - pad * 2, NAVY);
}

// ── Formatage ────────────────────────────────────────────────
function fmt(n: number): string {
  const entier = Math.round(n).toString();
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}