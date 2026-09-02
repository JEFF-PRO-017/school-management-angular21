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

  genererBulletin(data: BulletinData): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this._renderBulletin(doc, data);
    return doc.output('blob');
  }

  // ── Bulletins classe entière (1 page par élève) ──────────────────────────

  genererBulletinsClasse(bulletins: BulletinData[]): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    bulletins.forEach((data, i) => {
      if (i > 0) doc.addPage();
      this._renderBulletin(doc, data);
    });
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

  private _renderBulletin(doc: jsPDF, data: BulletinData): void {
    switch (data.niveau) {
      case 'primaire':       renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinPrimaire
      case 'secondaire-ang': renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinAnglophone
      case 'technique':      renderBulletinSecondaire(doc, data); break; // remplacer par renderBulletinTechnique
      case 'secondaire-fr':
      default:               renderBulletinSecondaire(doc, data); break;
    }
  }
}