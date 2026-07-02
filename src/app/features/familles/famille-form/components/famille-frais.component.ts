// famille-frais.component.ts
// Saisie de montant_reduction_special + commentaire
// Supporte création ET édition (reçoit AnneeScolaireFamille existante via @Input)
// Communique vers le parent uniquement via @Output
// Validation gérée via Angular Validators + FormControl.hasError()

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { AnneeScolaireFamille } from '../../../../core/models/family';
import { ANNEE_SCOLAIRE } from '../../../../core/models/shared';

const MONTANT_MAX = 10_000_000;
const COMMENTAIRE_MAX_LEN = 200;

export interface FraisFormValue {
  actif: boolean;
  valide: boolean;
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
      <label class="form-check-label small text-muted">Réduction spéciale</label>
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
          Montant de la réduction (FCFA)
        </label>
        <div class="input-group input-group-sm">
          <input class="form-control"
                 formControlName="montant_reduction_special"
                 mask="separator.0"
                 thousandSeparator=" "
                 [separatorLimit]="montantMax.toString()"
                 [dropSpecialCharacters]="true"
                 placeholder="0"
                 [class.is-invalid]="isInvalid('montant_reduction_special')"
                 (input)="emitChange()">
          <span class="input-group-text">FCFA</span>
        </div>
        @if (isInvalid('montant_reduction_special')) {
          <div class="invalid-feedback d-block">{{ getError('montant_reduction_special') }}</div>
        }
      </div>

      <!-- Commentaire -->
      <div>
        <label class="form-label small mb-1">Motif de la réduction</label>
        <input class="form-control form-control-sm"
               formControlName="commentaire"
               placeholder="Ex : 3 enfants inscrits cette année"
               [class.is-invalid]="isInvalid('commentaire')"
               (input)="emitChange()">
        @if (isInvalid('commentaire')) {
          <div class="invalid-feedback">{{ getError('commentaire') }}</div>
        }
      </div>

      <!-- Rappel valeurs auto -->
      <div class="alert alert-info py-1 px-2 small mb-0">
        Les autres frais (pension, ancienneté…) seront calculés automatiquement.
      </div>

    </div>
  } @else {
    <div class="card-body py-2 px-3">
      <p class="small text-muted mb-0">
        Aucune réduction spéciale pour cette famille. Activez le switch pour en ajouter une.
      </p>
    </div>
  }

</div>
  `
})
export class FamilleFraisComponent implements OnChanges {

  /** Passe l'entrée existante en mode édition (peut être null en création) */
  @Input() anneeScolaire: AnneeScolaireFamille | undefined = undefined;

  /** Émis à chaque changement de valeur ou de toggle */
  @Output() fraisChange = new EventEmitter<FraisFormValue>();

  annee = ANNEE_SCOLAIRE;
  actif = false;
  montantMax = MONTANT_MAX;

  form = new FormGroup({
    montant_reduction_special: new FormControl('0', [
      Validators.required,
      Validators.max(MONTANT_MAX),
    ]),
    commentaire: new FormControl('', [
      Validators.maxLength(COMMENTAIRE_MAX_LEN),
    ]),
  });

  get fc() { return this.form.controls; }

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

  /** true si le contrôle est invalide ET a été touché/modifié — utilise l'état natif du FormControl */
  isInvalid(controlName: string): boolean {
    const control = this.fc[controlName as keyof typeof this.fc];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /** Message d'erreur dérivé directement des erreurs du FormControl (control.errors) */
  getError(controlName: string): string {
    const control = this.fc[controlName as keyof typeof this.fc];
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Le montant est requis (indiquez 0 si aucune réduction)';
    }
    if (control.errors['max']) {
      return `Le montant ne peut pas dépasser ${this.montantMax.toLocaleString('fr-FR')} FCFA`;
    }
    if (control.errors['maxlength']) {
      const limite = control.errors['maxlength'].requiredLength;
      return `Le motif ne doit pas dépasser ${limite} caractères`;
    }
    return 'Champ invalide';
  }

  toggleActif(): void {
    this.actif = !this.actif;
    if (!this.actif) {
      this.form.reset({ montant_reduction_special: '0', commentaire: '' });
    }
    this.emitChange();
  }

  emitChange(): void {
    this.fraisChange.emit({
      actif: this.actif,
      valide: !this.actif || this.form.valid,
      montant_reduction_special: +(this.form.value.montant_reduction_special ?? 0),
      commentaire:               this.form.value.commentaire ?? '',
    });
  }
}