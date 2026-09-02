// famille-frais.component.ts
// Saisie de montant_reduction_special + commentaire (section optionnelle, via switch)
// Saisie de format_montant / format_statut / application_montant (section toujours active)
// Supporte création ET édition (reçoit AnneeScolaireFamille existante via @Input)
// Communique vers le parent uniquement via @Output
// Validation gérée via Angular Validators + FormControl.hasError()

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { AnneeScolaireFamille } from '../../../../../core/models/family';
import { ANNEE_SCOLAIRE } from '../../../../../core/models/shared';

const MONTANT_MAX = 10_000_000;
const COMMENTAIRE_MAX_LEN = 200;

export type FormatStatut = 'physique' | 'cash';

export interface FraisFormValue {
  actif: boolean;
  valide: boolean;
  montant_reduction_special: number;
  commentaire: string;
  format_montant: number;
  format_statut: FormatStatut;
  application_montant: number;
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

  <!-- Bloc format / application — toujours visible, requis par le modèle -->
  <div class="card-body py-2 px-3 d-flex flex-column gap-2 border-bottom" [formGroup]="form">

    <!-- Format de paiement -->
    <div>
      <label class="form-label small mb-1 d-block">Format</label>
      <div class="d-flex gap-3">
        <div class="form-check form-check-inline mb-0">
          <input class="form-check-input" type="radio" id="formatPhysique"
                 formControlName="format_statut" value="physique"
                 [class.is-invalid]="isInvalid('format_statut')"
                 (change)="onFormatChange()">
          <label class="form-check-label small" for="formatPhysique">Physique</label>
        </div>
        <div class="form-check form-check-inline mb-0">
          <input class="form-check-input" type="radio" id="formatCash"
                 formControlName="format_statut" value="cash"
                 [class.is-invalid]="isInvalid('format_statut')"
                 (change)="onFormatChange()">
          <label class="form-check-label small" for="formatCash">Cash</label>
        </div>
      </div>
      @if (isInvalid('format_statut')) {
        <div class="invalid-feedback d-block">{{ getError('format_statut') }}</div>
      }
    </div>

    <!-- Montant format — visible seulement si "cash" -->
    @if (fc.format_statut.value === 'cash') {
      <div>
        <label class="form-label small mb-1">Montant format (FCFA)</label>
        <div class="input-group input-group-sm">
          <input class="form-control"
                 formControlName="format_montant"
                 mask="separator.0"
                 thousandSeparator=" "
                 [separatorLimit]="montantMax.toString()"
                 [dropSpecialCharacters]="true"
                 placeholder="0"
                 [class.is-invalid]="isInvalid('format_montant')"
                 (input)="emitChange()">
          <span class="input-group-text">FCFA</span>
        </div>
        @if (isInvalid('format_montant')) {
          <div class="invalid-feedback d-block">{{ getError('format_montant') }}</div>
        }
      </div>
    }

    <!-- Montant application -->
    <div>
      <label class="form-label small mb-1">Montant application (FCFA)</label>
      <div class="input-group input-group-sm">
        <input class="form-control"
               formControlName="application_montant"
               mask="separator.0"
               thousandSeparator=" "
               [separatorLimit]="montantMax.toString()"
               [dropSpecialCharacters]="true"
               placeholder="0"
               [class.is-invalid]="isInvalid('application_montant')"
               (input)="emitChange()">
        <span class="input-group-text">FCFA</span>
      </div>
      @if (isInvalid('application_montant')) {
        <div class="invalid-feedback d-block">{{ getError('application_montant') }}</div>
      }
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
    format_montant: new FormControl('0', [
      Validators.required,
      Validators.max(MONTANT_MAX),
    ]),
    format_statut: new FormControl<FormatStatut | null>(null, [
      Validators.required,
    ]),
    application_montant: new FormControl('0', [
      Validators.required,
      Validators.max(MONTANT_MAX),
    ]),
  });

  get fc() { return this.form.controls; }
  /** Quand on choisit "physique", le montant format n'a plus de sens : on le force à 0 */
  onFormatChange(): void {
    if (this.fc.format_statut.value === 'physique') {
      this.fc.format_montant.setValue('0');
    }
    this.emitChange();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anneeScolaire'] && this.anneeScolaire) {
      this.actif = true;
      this.form.patchValue({
        montant_reduction_special: String(this.anneeScolaire.montant_reduction_special ?? 0),
        commentaire:               this.anneeScolaire.commentaire ?? '',
        format_montant:            String(this.anneeScolaire.format_montant ?? 0),
        format_statut:             this.anneeScolaire.format_statut ?? null,
        application_montant:       String(this.anneeScolaire.application_montant ?? 0),
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
      if (controlName === 'format_statut') {
        return 'Veuillez choisir un format (physique ou cash)';
      }
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
      this.form.patchValue({ montant_reduction_special: '0', commentaire: '' });
    }
    this.emitChange();
  }

  emitChange(): void {
    this.fraisChange.emit({
      actif: this.actif,
      // Un peu de repos ici : la section "format" est TOUJOURS requise,
      // donc form.valid conditionne la validité globale, réduction ou pas.
      valide: this.form.valid,
      montant_reduction_special: +(this.form.value.montant_reduction_special ?? 0),
      commentaire:               this.form.value.commentaire ?? '',
      format_montant:            +(this.form.value.format_montant ?? 0),
      format_statut:             (this.form.value.format_statut ?? 'physique') as FormatStatut,
      application_montant:       +(this.form.value.application_montant ?? 0),
    });
  }
}