import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Famille, FamilleEnrichi } from '../../../core/models/family';

export interface FamilleApercuData { famille: Famille | FamilleEnrichi; }

@Component({
  selector: 'app-famille-apercu-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
<div class="p-3" style="min-width:320px;max-width:420px">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h6 class="mb-0">{{ data.famille.nom_famille }}</h6>
    <button class="btn-close btn-sm" mat-dialog-close></button>
  </div>
  <ul class="list-unstyled small mb-0">
    <li>📞 Père : <strong>{{ data.famille.tel_pere || '—' }}</strong></li>
    <li>📞 Mère : <strong>{{ data.famille.tel_mere || '—' }}</strong></li>
    @if (data.famille.adresse_texte) {
      <li>📍 {{ data.famille.adresse_texte }}</li>
    }
    <li>Statut : <span class="badge text-bg-secondary">{{ data.famille.status }}</span></li>
    @if (isFamilleEnrichi) {
      <li class="mt-2">👨‍👩‍👧 {{ enrichie.eleves?.length ?? 0 }} enfant(s)</li>
      <li>⏳ {{ enrichie.moratoires?.length ?? 0 }} moratoire(s)</li>
    }
  </ul>
</div>
  `
})
export class FamilleApercuDialogComponent {
  data = inject<FamilleApercuData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FamilleApercuDialogComponent>);

  get isFamilleEnrichi(): boolean { return 'annee_scolaires' in this.data.famille; }
  get enrichie(): FamilleEnrichi { return this.data.famille as FamilleEnrichi; }
}