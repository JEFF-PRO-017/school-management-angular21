// famille-frais.component.ts
// Section réduction spéciale de l'année scolaire
// Seul montant_reduction_special est saisi — les autres champs sont auto (défaut 0)

import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ANNEE_SCOLAIRE } from '../../../core/models/shared';

@Component({
  selector: 'app-famille-frais',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [CommonModule, ReactiveFormsModule, NgxMaskDirective],
  template: `
<div class="card border-0 bg-light rounded-3">

  <!-- En-tête -->
  <div class="card-header bg-primary bg-opacity-10 border-0 rounded-top-3
              d-flex align-items-center justify-content-between py-2 px-3">
    <span class="small fw-semibold text-primary">
      Frais pension — {{ annee }}
    </span>

    <!-- Toggle -->
    <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
      <label class="form-check-label small text-muted">Configurer</label>
      <input class="form-check-input" type="checkbox" role="switch"
             [checked]="actif"
             (change)="actif = !actif">
    </div>
  </div>

  @if (actif) {
    <div class="card-body py-2 px-3 d-flex flex-column gap-2" [formGroup]="form">

      <!-- Réduction spéciale uniquement -->
      <div>
        <label class="form-label small mb-1">
          Réduction spéciale (FCFA)
          <span class="text-muted fw-normal">— optionnel</span>
        </label>
        <div class="input-group input-group-sm">
          <input class="form-control"
                 formControlName="montant_reduction_special"
                 mask="separator.0"
                 thousandSeparator=" "
                 separatorLimit="10000000"
                 [dropSpecialCharacters]="true"
                 placeholder="0">
          <span class="input-group-text">FCFA</span>
        </div>
      </div>

      <!-- Commentaire -->
      <div>
        <label class="form-label small mb-1">Motif</label>
        <input class="form-control form-control-sm"
               formControlName="commentaire"
               placeholder="ex: 3 enfants inscrits">
      </div>

      <!-- Info valeurs auto -->
      <div class="alert alert-info py-1 px-2 small mb-0">
        <strong>Valeurs par défaut :</strong>
        montant total = 0, réduction = 0, ancienneté = 0.
        Ces données seront mises à jour automatiquement par le service dédié.
      </div>

    </div>
  } @else {
    <div class="card-body py-2 px-3">
      <p class="small text-muted mb-0">Configurable depuis la fiche famille.</p>
    </div>
  }

</div>
  `
})
export class FamilleFraisComponent implements OnChanges {

  @Input() reductionSpecialInit = 0;
  @Input() commentaireInit      = '';

  @Output() fraisChange = new EventEmitter<{
    montant_reduction_special: number;
    commentaire: string;
  }>();

  annee = ANNEE_SCOLAIRE;
  actif = false;

  form = new FormGroup({
    montant_reduction_special: new FormControl('0'),
    commentaire:               new FormControl(''),
  });

  ngOnChanges(): void {
    this.form.patchValue({
      montant_reduction_special: String(this.reductionSpecialInit ?? 0),
      commentaire:               this.commentaireInit ?? '',
    });
  }

  /** Appelé par le parent avant save() */
  getData(): { montant_reduction_special: number; commentaire: string } {
    return {
      montant_reduction_special: +(this.form.value.montant_reduction_special ?? 0),
      commentaire:               this.form.value.commentaire ?? '',
    };
  }

  isActif(): boolean { return this.actif; }
}