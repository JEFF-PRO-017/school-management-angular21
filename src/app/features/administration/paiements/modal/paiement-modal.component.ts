// features/paiements/modal/paiement-modal.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { Famille, Paiement, PaiementEnrichi, ModePaiement } from '../../../../core/models';
import { AddServices, PatchServices } from '../../../../core/services/@data';

export interface PaiementModalData {
  famille: Famille;
  totalVerse: number;
  montantAttendu: number;
  paiement?: PaiementEnrichi; // présent = mode édition (montant uniquement)
}

@Component({
  selector: 'app-paiement-modal',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [ReactiveFormsModule, MatDialogModule, NgxMaskDirective],
  template: `
<div style="width:100%;max-width:400px">

  <!-- En-tête -->
  <div class="d-flex align-items-center gap-3 px-3 py-3 border-bottom">
    <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
         style="width:38px;height:38px">
      <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="5" cy="10" r="1" fill="currentColor"/>
      </svg>
    </div>
    <div class="flex-grow-1">
      <div class="fw-semibold">{{ isEdit ? 'Modifier le montant' : 'Nouveau paiement' }}</div>
      <div class="text-muted small">{{ data.famille.nom_famille }}</div>
    </div>
    <button class="btn-close" mat-dialog-close></button>
  </div>

  <!-- Barre progression -->
  <div class="px-3 pt-3">
    <div class="d-flex justify-content-between small mb-1">
      <span class="text-muted">Progression</span>
      <span class="fw-medium">{{ progressionBase }}%</span>
    </div>
    <div class="progress" style="height:6px">
      <div class="progress-bar bg-success" [style.width.%]="progressionBase"></div>
    </div>
    <div class="d-flex justify-content-between small mt-1">
      <span class="text-success">{{ fmt(data.totalVerse) }} FCFA versés</span>
      <span class="text-muted">{{ fmt(data.montantAttendu) }} FCFA attendus</span>
    </div>
  </div>

  <!-- Corps -->
  <div class="px-3 py-3 d-flex flex-column gap-3" [formGroup]="form">

    <!-- Montant -->
    <div>
      <label class="form-label small mb-1">Montant (FCFA) *</label>
      <div class="input-group input-group-lg">
        <input class="form-control fw-semibold text-end"
               [class.is-invalid]="form.controls.montant_verse.invalid && form.controls.montant_verse.touched"
               formControlName="montant_verse"
               mask="separator.0" thousandSeparator=" " separatorLimit="10000000"
               [dropSpecialCharacters]="true"
               placeholder="0" autofocus>
        <span class="input-group-text">FCFA</span>
      </div>
      @if (form.controls.montant_verse.invalid && form.controls.montant_verse.touched) {
        <div class="text-danger small mt-1">Montant requis, supérieur à 0</div>
      }
    </div>

    @if (!isEdit) {
      <!-- Mode paiement -->
      <div>
        <label class="form-label small mb-1">Mode de paiement</label>
        <div class="btn-group w-100">
          @for (m of modes; track m.value) {
            <button type="button" class="btn"
                    [class.btn-primary]="form.controls.mode_paiement.value === m.value"
                    [class.btn-outline-secondary]="form.controls.mode_paiement.value !== m.value"
                    (click)="form.controls.mode_paiement.setValue(m.value)">
              {{ m.label }}
            </button>
          }
        </div>
      </div>

      <!-- Date -->
      <div>
        <label class="form-label small mb-1">Date du versement *</label>
        <input type="date" class="form-control"
               [class.is-invalid]="form.controls.date_paiement.invalid && form.controls.date_paiement.touched"
               formControlName="date_paiement">
      </div>
    }

    <!-- Preview solde après versement -->
    @if (montantSaisi() > 0) {
      <div class="rounded-3 p-3"
           [class.bg-success-subtle]="apresVersement() <= 0"
           [class.bg-light]="apresVersement() > 0">
        <div class="d-flex justify-content-between align-items-center">
          <span class="small text-muted">Après ce versement</span>
          @if (isEdit) {
            <span class="small text-muted font-monospace">{{ data.paiement?.recu_numero }}</span>
          }
        </div>
        <div class="fw-semibold mt-1" [class.text-success]="apresVersement() <= 0" [class.text-danger]="apresVersement() > 0">
          @if (apresVersement() <= 0) { Solde soldé ✓ }
          @else { {{ fmt(apresVersement()) }} FCFA restants }
        </div>
      </div>
    }

  </div>

  <!-- Pied -->
  <div class="d-flex justify-content-end gap-2 px-3 py-3 border-top">
    <button class="btn btn-outline-secondary" mat-dialog-close>Annuler</button>
    <button class="btn btn-primary px-4" (click)="save()" [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Enregistrer') }}
    </button>
  </div>

</div>
  `
})
export class PaiementModalComponent {

  readonly data     = inject<PaiementModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PaiementModalComponent>);
  private add       = inject(AddServices);
  private patch     = inject(PatchServices);
  private snack     = inject(MatSnackBar);

  isEdit = !!this.data.paiement;
  saving = signal(false);
  recuNumero = this.data.paiement?.recu_numero ?? `RCU-${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;

  modes: { value: ModePaiement; label: string }[] = [
    { value: 'cash',   label: '💵 Espèces' },
    { value: 'mobile', label: '📱 Mobile Money' },
  ];

  form = new FormGroup({
    montant_verse: new FormControl<number | null>(
      this.data.paiement?.montant_verse ?? null,
      [Validators.required, Validators.min(1)]
    ),
    mode_paiement: new FormControl<ModePaiement>('cash'),
    date_paiement: new FormControl(new Date().toISOString().split('T')[0], Validators.required),
  });

  get progressionBase(): number {
    if (this.data.montantAttendu <= 0) return 100;
    return Math.min(100, Math.round((this.data.totalVerse / this.data.montantAttendu) * 100));
  }

  montantSaisi(): number { return this.toNum(this.form.controls.montant_verse.value); }

  /** En édition : totalVerse exclut déjà l'ancien montant du paiement modifié (à passer ainsi depuis la liste). */
  apresVersement(): number { return this.data.montantAttendu - this.data.totalVerse - this.montantSaisi(); }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    if (this.isEdit && this.data.paiement) {
      const p: PaiementEnrichi = { ...this.data.paiement, montant_verse: this.montantSaisi() };
      await this.patch.updatePaiement(p);
      this.saving.set(false);
      this.snack.open('Montant mis à jour', 'OK', { duration: 3000 });
      this.dialogRef.close({ success: true, paiement: p });
      return;
    }

    const p: Paiement = {
      id_paiement:    `PAY-${Date.now()}`,
      id_famille:     this.data.famille.id_famille,
      montant_verse:  this.montantSaisi(),
      date_paiement:  this.form.value.date_paiement!,
      mode_paiement:  this.form.value.mode_paiement!,
      recu_numero:    this.recuNumero,
      nb_impressions: 0,
      statut:         'crée',
    };

    await this.add.addPaiement(p);
    this.saving.set(false);
    this.snack.open(`Paiement enregistré — ${p.recu_numero}`, 'OK', { duration: 4000 });
    this.dialogRef.close({ success: true, paiement: p });
  }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  toNum(v: string | number | null | undefined): number {
    const n = +(v ?? 0);
    return isNaN(n) ? 0 : n;
  }
}