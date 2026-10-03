// bulletin-pdf.service.ts — orchestre les renderers selon le niveau de classe
// npm install jspdf jspdf-autotable

import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { renderPV, renderFicheSaisie, renderBulletinSecondaire } from '../../features/administration/notes/bulletins/components/renderer-secondaire';
import { BulletinData, PVData, FicheSaisieData } from '../../features/administration/notes/helper/bulletin.models';

// import { renderBulletinPrimaire }   from './renderer-primaire';    // à créer
// import { renderBulletinAnglophone } from './renderer-anglophone';  // à créer
// import { renderBulletinTechnique }  from './renderer-technique';   // à créer

@Injectable({ providedIn: 'root' })
export class BulletinPdfService {

  // ── Bulletin individuel ──────────────────────────────────────────────────

  async genererBulletin(data: BulletinData): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
   await this._renderBulletin(doc, data);
    return doc.output('blob');
  }

  // ── Bulletins classe entière (1 page par élève) ──────────────────────────

  async genererBulletinsClasse(bulletins: BulletinData[]): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    for (let i = 0; i < bulletins.length; i++) {
      const data = bulletins[i];
      if (i > 0) doc.addPage();
      await this._renderBulletin(doc, data);
    }
    return doc.output('blob');
  }

  // ── PV de classe ──────────────────────────────────────────────────────────

  genererPV(data: PVData): Blob {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    renderPV(doc, data);
    return doc.output('blob');
  }

  // ── Fiche de saisie manuscrite ────────────────────────────────────────────

  genererFicheSaisie(data: FicheSaisieData): Blob {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    renderFicheSaisie(doc, data);
    return doc.output('blob');
  }

  // ── Téléchargement / aperçu ──────────────────────────────────────────────

  telecharger(blob: Blob, nom: string): void {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: nom }).click();
    URL.revokeObjectURL(url);
  }

  apercu(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }

  // ── Routing vers le bon renderer ─────────────────────────────────────────

  private async _renderBulletin(doc: jsPDF, data: BulletinData): Promise<void> {
    switch (data.niveau) {
      case 'primaire':       await renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinPrimaire
      case 'secondaire-ang': await renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinAnglophone
      case 'technique':      await renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinTechnique
      case 'secondaire-fr':
      default:               await renderBulletinSecondaire(doc, data); break;
    }
  }
}