// ─────────────────────────────────────────────────────────────────
// recu.service.ts
// Génère un reçu PDF A5 paysage double exemplaire (style bancaire)
//
// Usage depuis n'importe quel composant :
//   inject(RecuService).generer(paiement, famille, totalApres, montantAttendu)
//
// Structure du PDF :
//   - Format A5 paysage (210 × 148 mm)
//   - Moitié gauche  → Exemplaire École  (bandeau vert)
//   - Moitié droite  → Exemplaire Famille (bandeau bleu)
//   - Ligne de découpe pointillée + icône ciseaux au centre
//   - Tableau montants : versé ce jour / total versé / reste à payer
//   - Signature caissier + prochain RDV
//
// Dépendance : npm install jspdf
// ─────────────────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { Paiement, Famille } from '../../core/models';

// Infos personnalisables de l'établissement
export interface InfosEcole {
  nom:   string;
  ville: string;
  tel:   string;
}

const ECOLE_DEFAULT: InfosEcole = {
  nom:   'ÉCOLE PRIVÉE ST-MICHEL',
  ville: 'Yaoundé — Cameroun',
  tel:   '+237 699 00 00 00',
};

// Paramètres internes d'un exemplaire (gauche ou droite)
interface ParamsExemplaire {
  x:               number;   // offset X de départ dans la page
  y:               number;   // offset Y de départ
  w:               number;   // largeur de l'exemplaire
  label:           string;   // "EXEMPLAIRE ÉCOLE" ou "EXEMPLAIRE FAMILLE"
  labelBg:         [number, number, number]; // couleur fond bandeau (RGB)
  paiement:        Paiement;
  famille:         Famille;
  ecole:           InfosEcole;
  dateStr:         string;
  rdvStr:          string;
  montantVerse:    number;   // montant de CE paiement
  totalApres:      number;   // total cumulé après ce paiement
  montantAttendu:  number;
  resteApayer:     number;
}

@Injectable({ providedIn: 'root' })
export class RecuService {

  /**
   * Génère et télécharge le PDF reçu.
   *
   * @param paiement       - Le paiement enregistré
   * @param famille        - La famille concernée
   * @param totalApres     - Somme cumulée incluant ce paiement
   * @param montantAttendu - Montant total attendu (après réduction)
   * @param ecole          - Infos établissement (optionnel)
   */
  generer(
    paiement:       Paiement,
    famille:        Famille,
    totalApres:     number,
    montantAttendu: number,
    ecole:          InfosEcole = ECOLE_DEFAULT,
  ): void {
    // Import jsPDF — supporte CJS et le bundle Angular
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsPDFClass = (window as any).jspdf?.jsPDF
                    // ?? require('jspdf').jsPDF;

    // A5 paysage : 210 × 148 mm
    const doc = new jsPDFClass({
      orientation: 'landscape',
      unit:        'mm',
      format:      'a5',
    });

    // Données communes aux deux exemplaires
    const dateStr = this.fmtDate(paiement.date_paiement);
    const rdvStr  = paiement.date_prochain_rdv
                    ? this.fmtDate(paiement.date_prochain_rdv)
                    : 'Non défini';
    const resteApayer = Math.max(0, montantAttendu - totalApres);

    const commun = {
      paiement, famille, ecole, dateStr, rdvStr,
      montantVerse:   paiement.montant_verse,
      totalApres,
      montantAttendu,
      resteApayer,
    };

    // ── Exemplaire gauche : ÉCOLE ──
    this.dessinerExemplaire(doc, {
      ...commun,
      x: 4, y: 4, w: 100,
      label:    'EXEMPLAIRE ÉCOLE',
      labelBg:  [46, 125, 50],   // vert école
    });

    // ── Ligne de découpe centrale ──
    this.dessinerLigneDecoupe(doc, 107, 4, 144);

    // ── Exemplaire droit : FAMILLE ──
    this.dessinerExemplaire(doc, {
      ...commun,
      x: 109, y: 4, w: 97,
      label:    'EXEMPLAIRE FAMILLE',
      labelBg:  [21, 101, 192],  // bleu famille
    });

    // Nom de fichier lisible
    const nomFichier = `recu_${paiement.recu_numero}_${
      famille.nom_famille.replace(/\s+/g, '_')
    }.pdf`;

    doc.save(nomFichier);
  }

  // ─────────────────────────────────────────────
  // Dessin complet d'un exemplaire
  // ─────────────────────────────────────────────
  private dessinerExemplaire(doc: any, p: ParamsExemplaire): void {
    const { x, y, w } = p;
    const h = 140; // hauteur de l'exemplaire

    // ── Cadre externe ──
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');

    // ── En-tête : nom école (gauche) + titre reçu (droite) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 35, 126);
    doc.text(p.ecole.nom, x + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(`${p.ecole.ville}  ·  ${p.ecole.tel}`, x + 4, y + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 35, 126);
    doc.text('REÇU DE PAIEMENT', x + w - 4, y + 7, { align: 'right' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`N° ${p.paiement.recu_numero}`, x + w - 4, y + 11.5, { align: 'right' });

    // Séparateur sous l'en-tête
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(x + 3, y + 14, x + w - 3, y + 14);

    // ── Bandeau exemplaire (vert ou bleu) ──
    doc.setFillColor(...p.labelBg);
    doc.rect(x + 3, y + 16, w - 6, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(p.label, x + w / 2, y + 19.8, { align: 'center' });

    // ── Grille d'informations (4 cellules 2×2) ──
    const c1   = x + 4;          // colonne gauche
    const c2   = x + w / 2 + 2;  // colonne droite
    let   rowY = y + 29;          // position Y courante
    const rh   = 9;               // hauteur d'une ligne

    const ligneInfo = (
      lbl1: string, val1: string,
      lbl2: string, val2: string
    ) => {
      // Labels (gris, petits)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(150, 150, 150);
      doc.text(lbl1.toUpperCase(), c1, rowY);
      doc.text(lbl2.toUpperCase(), c2, rowY);
      // Valeurs (noir, plus grand)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(val1, c1, rowY + 4.5);
      doc.text(val2, c2, rowY + 4.5);
      rowY += rh;
    };

    ligneInfo(
      'Famille',  p.famille.nom_famille,
      'Date',     p.dateStr
    );
    ligneInfo(
      'Période',  p.paiement.periode_concernee || '—',
      'Mode',     p.paiement.mode_paiement === 'mobile' ? 'Mobile Money' : 'Espèces'
    );

    // ── Tableau montants ──
    rowY += 2;

    // En-tête tableau
    doc.setFillColor(245, 245, 245);
    doc.rect(x + 3, rowY - 1, w - 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('DÉSIGNATION', c1, rowY + 3.2);
    doc.text('MONTANT',     x + w - 5, rowY + 3.2, { align: 'right' });
    rowY += 7;

    // Ligne versement ce jour
    this.ligneTableau(doc, c1, x + w - 5, rowY,
      `Pension scolaire — ${p.paiement.periode_concernee || ''}`,
      this.fcfa(p.montantVerse)
    );
    rowY += 7;

    // Ligne total versé (fond vert clair)
    doc.setFillColor(232, 245, 233);
    doc.rect(x + 3, rowY - 4.5, w - 6, 7, 'F');
    this.ligneTableau(doc, c1, x + w - 5, rowY,
      'Total versé à ce jour',
      this.fcfa(p.totalApres),
      [46, 125, 50] // texte vert
    );
    rowY += 7;

    // Ligne reste à payer (fond orange clair)
    doc.setFillColor(255, 248, 225);
    doc.rect(x + 3, rowY - 4.5, w - 6, 7, 'F');
    this.ligneTableau(doc, c1, x + w - 5, rowY,
      'Reste à payer',
      this.fcfa(p.resteApayer),
      [230, 81, 0] // texte orange
    );
    rowY += 10;

    // ── Pied de l'exemplaire ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`Prochain rendez-vous : ${p.rdvStr}`, c1, rowY);

    // Notes caissier si présentes
    if (p.paiement.notes_caissier) {
      doc.text(
        `Note : ${p.paiement.notes_caissier.substring(0, 50)}`,
        c1, rowY + 4.5
      );
    }

    // Ligne signature caissier (alignée à droite)
    doc.setTextColor(160, 160, 160);
    doc.text('Signature caissier', x + w - 5, rowY, { align: 'right' });
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(x + w - 32, rowY + 7, x + w - 5, rowY + 7);
  }

  // ─────────────────────────────────────────────
  // Ligne de découpe pointillée verticale
  // ─────────────────────────────────────────────
  private dessinerLigneDecoupe(
    doc:    any,
    x:      number,
    yStart: number,
    yEnd:   number
  ): void {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(x, yStart, x, yEnd);
    doc.setLineDashPattern([], 0); // réinitialise le trait

    // Icône ciseaux au milieu
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('✂', x - 1.5, (yStart + yEnd) / 2 + 1.5);
  }

  // ─────────────────────────────────────────────
  // Ligne individuelle dans le tableau montants
  // ─────────────────────────────────────────────
  private ligneTableau(
    doc:      any,
    xDesc:    number,
    xMontant: number,
    y:        number,
    desc:     string,
    montant:  string,
    couleur:  [number, number, number] = [50, 50, 50]
  ): void {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...couleur);
    doc.text(desc, xDesc, y);

    doc.setFont('helvetica', 'bold');
    doc.text(montant, xMontant, y, { align: 'right' });

    // Ligne séparatrice légère sous la ligne
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(xDesc - 1, y + 2.2, xMontant, y + 2.2);
  }

  // ─── Formatters ──────────────────────────────

  private fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }

  private fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric',
    });
  }
}