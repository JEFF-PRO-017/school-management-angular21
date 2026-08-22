// features/paiements/modal/recu-modal.component.ts
import { Component, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { PaiementEnrichi } from '../../../core/models';
import { PatchServices } from '../../../core/services/@data';
import { configRecuPaiement } from '../../../core/services/@recu-paiement/recu-paiement.config';
import { genererRecuPdf } from '../../../core/services/@recu-paiement/recu-pdf.service';
// import { genererRecuPdf } from '../../../shared/utils/recu-pdf-builder';
// import { configRecuPaiement, OptionsRecuPaiement } from './recu-paiement.config';

export interface RecuModalData {
  paiement: PaiementEnrichi;
  options?: any;
}

@Component({
  selector: 'app-recu-modal',
  standalone: true,
  imports: [MatDialogModule],
  template: `
<div class="d-flex flex-column" style="width:100%;height:100%">

  <div class="d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
    <div>
      <div class="fw-semibold">Reçu de paiement</div>
      <div class="text-muted small">{{ data.paiement.recu_numero }}</div>
    </div>
    <button class="btn-close" (click)="fermer()"></button>
  </div>

  <!-- Aperçu -->
  <div class="flex-grow-1 d-flex justify-content-center align-items-center bg-body-tertiary py-4">
    @if (chargement()) {
      <div class="text-muted small d-flex align-items-center gap-2">
        <span class="spinner-border spinner-border-sm"></span> Génération du reçu…
      </div>
    } @else if (apercuUrl()) {
      <iframe [src]="apercuUrl()"
              style="width:180mm;height:100%;max-height:100%;border:1px solid #dee2e6;border-radius:6px;background:white;box-shadow:0 4px 14px rgba(0,0,0,.1)">
      </iframe>
    }
  </div>

  <!-- Statut prochaine impression -->
  <div class="px-4 py-3 d-flex align-items-center gap-2 border-top">
    <span class="badge rounded-pill"
          [class.bg-success-subtle]="data.paiement.statut === 'confirmé'"
          [class.text-success-emphasis]="data.paiement.statut === 'confirmé'"
          [class.bg-warning-subtle]="data.paiement.statut !== 'confirmé'"
          [class.text-warning-emphasis]="data.paiement.statut !== 'confirmé'">
      {{ data.paiement.statut === 'confirmé' ? 'Vérifié' : 'En attente' }}
    </span>
    <span class="text-muted small">{{ libelleCopieSuivante() }}</span>
  </div>

  <!-- Pied -->
  <div class="d-flex justify-content-end gap-2 px-4 py-3 border-top">
    <button class="btn btn-outline-secondary" (click)="fermer()">Fermer</button>
    <button class="btn btn-primary px-4" [disabled]="impressionEnCours() || chargement()" (click)="imprimer()">
      @if (impressionEnCours()) { <span class="spinner-border spinner-border-sm me-1"></span> }
      {{ impressionEnCours() ? 'Impression…' : 'Imprimer' }}
    </button>
  </div>

</div>
  `
})
export class RecuModalComponent {

  readonly data     = inject<RecuModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RecuModalComponent>);
  private patch     = inject(PatchServices);
  private sanitizer = inject(DomSanitizer);

  chargement        = signal(true);
  impressionEnCours = signal(false);
  apercuUrl         = signal<SafeResourceUrl | null>(null);

  constructor() {
    this.rafraichirApercu();
  }

  private async rafraichirApercu(): Promise<void> {
    this.chargement.set(true);
    const doc = await genererRecuPdf(configRecuPaiement(this.data.paiement, this.data.options));
    this.apercuUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(doc.output('datauristring')));
    this.chargement.set(false);
  }

  libelleCopieSuivante(): string {
    const n = this.data.paiement.nb_impressions;
    if (n === 0) return 'Prochaine impression : exemplaire parent';
    if (n === 1) return 'Prochaine impression : exemplaire archive école';
    return `Prochaine impression : copie n°${n}`;
  }

  async imprimer(): Promise<void> {
    this.impressionEnCours.set(true);
    const p = this.data.paiement;
    const premiereImpression = p.nb_impressions === 0;

    const doc = await genererRecuPdf(configRecuPaiement(p, this.data.options));
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');

    p.nb_impressions += 1;
    if (premiereImpression) p.statut = 'confirmé';
    await this.patch.updatePaiement(p);

    await this.rafraichirApercu();
    this.impressionEnCours.set(false);
  }

  fermer(): void {
    this.dialogRef.close({ paiement: this.data.paiement });
  }
}