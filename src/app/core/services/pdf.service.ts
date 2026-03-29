// pdf.service.ts — génération de PDF pour insolvables et bulletins
// Utilise jsPDF + jspdf-autotable (pas de composant Angular custom)
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EleveEnrichi, SoldeSnap, BulletinSnap } from '../models';

@Injectable({ providedIn: 'root' })
export class PdfService {

  // ── Liste des insolvables ──────────────────────

  /**
   * Génère et télécharge un PDF de la liste des insolvables
   * @param insolvables élèves avec solde > seuil
   * @param nomClasse   filtre affiché dans le titre
   * @param dateRef     date de référence du rapport
   */
  genererInsolvables(
    insolvables: Array<EleveEnrichi & { solde: SoldeSnap }>,
    nomClasse: string,
    dateRef: string
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // En-tête
    doc.setFontSize(16);
    doc.setTextColor(27, 79, 114);
    doc.text('Liste des élèves insolvables', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Classe : ${nomClasse || 'Toutes'}   |   Date : ${dateRef}`, 14, 26);

    // Tableau
    autoTable(doc, {
      startY: 32,
      head: [['Élève', 'Classe', 'Tel père', 'Total versé', 'Reste à payer', 'Dernier paiement']],
      body: insolvables.map(e => [
        `${e.nom} ${e.prenom}`,
        e.classe?.nom_classe ?? '-',
        e.famille?.tel_pere ?? '-',
        `${(e.solde.total_verse ?? 0).toLocaleString()} FCFA`,
        `${(e.solde.reste_a_payer ?? 0).toLocaleString()} FCFA`,
        e.solde.dernier_paiement ?? 'Jamais',
      ]),
      styles:      { fontSize: 9, cellPadding: 3 },
      headStyles:  { fillColor: [27, 79, 114], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', textColor: [163, 45, 45] },
      },
    });

    // Pied de page
    const total = insolvables.length;
    const lastY = (doc as any).lastAutoTable.finalY ?? 100;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`${total} élève(s) insolvable(s)`, 14, lastY + 8);

    doc.save(`insolvables_${nomClasse || 'tous'}_${dateRef}.pdf`);
  }

  // ── Bulletin individuel ────────────────────────

  /**
   * Génère le bulletin d'un élève pour une séquence
   * @param eleve    élève enrichi
   * @param bulletin données calculées (snap)
   * @param notes    détail des notes par matière
   */
  genererBulletin(
    eleve: EleveEnrichi,
    bulletin: BulletinSnap,
    notes: Array<{ matiere: string; note: number; coeff: number; sur: number }>
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Entête école
    doc.setFontSize(14);
    doc.setTextColor(27, 79, 114);
    doc.text('BULLETIN DE NOTES', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Élève : ${eleve.nom} ${eleve.prenom}`, 14, 30);
    doc.text(`Classe : ${eleve.classe?.nom_classe ?? '-'}`, 14, 37);
    doc.text(`Séquence : ${bulletin.sequence}`, 14, 44);
    doc.text(`Année : ${eleve.classe?.annee_scolaire ?? '-'}`, 120, 30);
    doc.text(`Rang : ${bulletin.rang} / ${(bulletin as any).effectif ?? '-'}`, 120, 37);
    doc.text(`Moyenne : ${bulletin.moy_ponderee.toFixed(2)} / 20`, 120, 44);

    // Tableau des notes
    autoTable(doc, {
      startY: 52,
      head: [['Matière', 'Note', '/Sur', 'Coeff', 'Points']],
      body: notes.map(n => [
        n.matiere,
        n.note.toFixed(2),
        n.sur,
        n.coeff,
        ((n.note / n.sur) * 20 * n.coeff).toFixed(2),
      ]),
      foot: [[
        'Moyenne générale', '', '', '',
        `${bulletin.moy_ponderee.toFixed(2)} / 20`
      ]],
      styles:      { fontSize: 9, cellPadding: 3 },
      headStyles:  { fillColor: [15, 110, 86], textColor: 255 },
      footStyles:  { fillColor: [230, 241, 251], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 252, 249] },
    });

    // Mention
    const lastY2 = (doc as any).lastAutoTable.finalY ?? 120;
    doc.setFontSize(11);
    doc.setTextColor(27, 79, 114);
    doc.text(`Mention : ${bulletin.mention}`, 14, lastY2 + 10);

    // Moy classe + Premier/Dernier
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Moy. classe : ${bulletin.moy_classe.toFixed(2)}   Premier : ${bulletin.premier.toFixed(2)}   Dernier : ${bulletin.dernier.toFixed(2)}`, 14, lastY2 + 18);

    doc.save(`bulletin_${eleve.nom}_${eleve.prenom}_${bulletin.sequence}.pdf`);
  }
}
