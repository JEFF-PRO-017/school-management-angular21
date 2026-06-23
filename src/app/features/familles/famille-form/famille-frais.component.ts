// famille-frais.component.ts
// Saisie de montant_reduction_special + commentaire
// Supporte création ET édition (reçoit AnneeScolaireFamille existante via @Input)
// Communique vers le parent uniquement via @Output

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { AnneeScolaireFamille } from '../../../core/models/family';
import { ANNEE_SCOLAIRE } from '../../../core/models/shared';


export interface FraisFormValue {
  actif: boolean;
  montant_reduction_special: number;
  commentaire: string;
}

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
    <span class="small  text-primary">
      Frais pension — {{ annee }}
    </span>
    <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
      <label class="form-check-label small text-muted">Configurer</label>
      <input class="form-check-input" type="checkbox" role="switch"
             [checked]="actif"
             (change)="toggleActif()">
    </div>
  </div>

  @if (actif) {
    <div class="card-body py-2 px-3 d-flex flex-column gap-2" [formGroup]="form">

      <!-- Réduction spéciale -->
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
                 placeholder="0"
                 (input)="emitChange()">
          <span class="input-group-text">FCFA</span>
        </div>
      </div>

      <!-- Commentaire -->
      <div>
        <label class="form-label small mb-1">Motif</label>
        <input class="form-control form-control-sm"
               formControlName="commentaire"
               placeholder="ex: 3 enfants inscrits"
               (input)="emitChange()">
      </div>

      <!-- Rappel valeurs auto -->
      <div class="alert alert-info py-1 px-2 small mb-0">
        <strong>Auto :</strong> montant total = 0, réduction = 0, ancienneté = 0.
        Mis à jour automatiquement par le service dédié.
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

  /** Passe l'entrée existante en mode édition (peut être null en création) */
  @Input() anneeScolaire: AnneeScolaireFamille | null = null;

  /** Émis à chaque changement de valeur ou de toggle */
  @Output() fraisChange = new EventEmitter<FraisFormValue>();

  annee = ANNEE_SCOLAIRE;
  actif = false;

  form = new FormGroup({
    montant_reduction_special: new FormControl('0'),
    commentaire:               new FormControl(''),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anneeScolaire'] && this.anneeScolaire) {
      this.actif = true;
      this.form.patchValue({
        montant_reduction_special: String(this.anneeScolaire.montant_reduction_special ?? 0),
        commentaire:               this.anneeScolaire.commentaire ?? '',
      });
      this.emitChange();
    }
  }

  toggleActif(): void {
    this.actif = !this.actif;
    this.emitChange();
  }

  emitChange(): void {
    this.fraisChange.emit({
      actif: this.actif,
      montant_reduction_special: +(this.form.value.montant_reduction_special ?? 0),
      commentaire:               this.form.value.commentaire ?? '',
    });
  }
}