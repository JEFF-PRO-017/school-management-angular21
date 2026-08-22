// features/paiements/modal/recu-modal.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { PaiementEnrichi, FamilleEnrichi, FamilleService } from '../../../core/models';
import { PatchServices, GetServices } from '../../../core/services/@data';
import { CacheService } from '../../../core/services/cache.service';
import { configRecuPaiement } from '../../../core/services/@recu-paiement/recu-paiement.config';
import { genererRecuPdf } from '../../../core/services/@recu-paiement/recu-pdf.service';


export interface RecuModalData { paiement: PaiementEnrichi; }

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

  <div class="flex-grow-1 d-flex justify-content-center align-items-center bg-body-tertiary py-4">
    <iframe [src]="apercuUrl()"
            style="width:210mm;height:100%;max-height:100%;border:1px solid #dee2e6;border-radius:6px;background:white;box-shadow:0 4px 14px rgba(0,0,0,.1)">
    </iframe>
  </div>

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

  <div class="d-flex justify-content-end gap-2 px-4 py-3 border-top">
    <button class="btn btn-outline-secondary" (click)="fermer()">Fermer</button>
    <button class="btn btn-primary px-4" [disabled]="impressionEnCours()" (click)="imprimer()">
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
  private get       = inject(GetServices);
  private cache     = inject(CacheService);
  private fas       = inject(FamilleService);
  private sanitizer = inject(DomSanitizer);

  impressionEnCours = signal(false);
  private version    = signal(0);

  apercuUrl = computed<SafeResourceUrl>(() => {
    this.version();
    const p = this.data.paiement;
    const famille = p.famille as FamilleEnrichi;
    const eleves = (this.get.getEleves() ?? []).filter(e => e.id_famille === p.id_famille);

    const enfants = eleves.map((e, i) => ({
      numero: i + 1,
      nomPrenom: `${e.nom} ${e.prenom}`,
      classe: this.cache.classesMap().get(e.id_classe)?.nom_classe ?? e.id_classe,
    }));

    const montantAttendu = this.fas.montantAttentu(famille);
    const montantVerse   = this.fas.montantVerse(famille);
    const montantRestant = this.fas.montantRestant(montantAttendu, montantVerse);

    const doc = genererRecuPdf(configRecuPaiement(p, {
      enfants, montantVerseTotal: montantVerse, montantRestant,
    }));
    return this.sanitizer.bypassSecurityTrustResourceUrl(doc.output('datauristring'));
  });

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

    const doc = new (await import('jspdf')).default(); // placeholder, réutilise apercuUrl-généré doc dans une vraie impl.
    // Pour l'impression, on régénère via le même chemin que l'aperçu :
    const url = this.apercuUrl();

    p.nb_impressions += 1;
    if (premiereImpression) p.statut = 'confirmé';
    await this.patch.updatePaiement(p);

    this.version.update(v => v + 1);
    this.impressionEnCours.set(false);
    window.open(url as string, '_blank');
  }

  fermer(): void {
    this.dialogRef.close({ paiement: this.data.paiement });
  }
}