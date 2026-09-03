// paiement-form.component.ts
// Page "Initier un paiement" — espace parent.
// Route : /espace-parent/paiements/create
//
// Lecture (id_famille) : ParentService.famille().
// Écriture : AddServices.addPaiement (déjà réel, aucune addition requise).

import { Component, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Paiement } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { AddServices } from '../../../../core/services/@data';
import { BreadcrumbComponent } from '../../components/breadcrumb.component';
import { ConfirmWordModalComponent } from '../../components/confirm-word-modal.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';



@Component({
  selector: 'app-paiement-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ParentHeaderComponent, BreadcrumbComponent, ConfirmWordModalComponent],
  template: `
    <app-parent-header titre="Initier un paiement"></app-parent-header>
    <app-breadcrumb [items]="fil"></app-breadcrumb>

    <div class="container-fluid p-3" style="max-width:640px">

      <form [formGroup]="form" (ngSubmit)="onDemanderConfirmation()" novalidate>

        <div class="mb-3">
          <label class="form-label">Montant versé (FCFA) <span class="text-danger">*</span></label>
          <input type="number" class="form-control" formControlName="montant_verse" min="1"
                 [class.is-invalid]="isInvalid('montant_verse')">
          @if (form.get('montant_verse')?.errors?.['required'] && isTouched('montant_verse')) {
            <div class="invalid-feedback">Le montant est obligatoire.</div>
          }
          @if (form.get('montant_verse')?.errors?.['min'] && isTouched('montant_verse')) {
            <div class="invalid-feedback">Le montant doit être supérieur à 0.</div>
          }
        </div>

        <div class="mb-3">
          <label class="form-label">Mode de paiement <span class="text-danger">*</span></label>
          <select class="form-select" formControlName="mode_paiement"
                  [class.is-invalid]="isInvalid('mode_paiement')">
            <option value="" disabled>Choisir un mode</option>
            <option value="cash">Cash</option>
            <option value="mobile">Mobile</option>
            <option value="virement">Virement</option>
          </select>
          @if (isInvalid('mode_paiement')) {
            <div class="invalid-feedback">Le mode de paiement est obligatoire.</div>
          }
        </div>

        @if (erreurEnvoi) {
          <div class="alert alert-danger py-2">{{ erreurEnvoi }}</div>
        }

        <div class="d-flex gap-2 justify-content-end mt-4">
          <button type="button" class="btn btn-outline-secondary" (click)="onAnnuler()">
            Annuler
          </button>
          <button type="button" class="btn btn-primary" [disabled]="form.invalid || envoiEnCours" (click)="onDemanderConfirmation()">
            @if (envoiEnCours) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            Envoyer le paiement
          </button>
        </div>

      </form>
    </div>

    <app-confirm-word-modal
      #confirmEnvoi
      modalId="confirmEnvoiPaiement"
      mot="CONFIRMER"
      titre="Confirmer le paiement"
      message="Cette action enverra votre paiement pour validation par l'administration."
      (confirmed)="onConfirmerEnvoi()">
    </app-confirm-word-modal>
  `,
})
export class PaiementFormComponent {
  @ViewChild('confirmEnvoi') confirmEnvoi!: ConfirmWordModalComponent;

  fil = [
    { label: 'Paiements', route: '/espace-parent/paiements' },
    { label: 'Initier un paiement' },
  ];

  form: FormGroup;
  envoiEnCours = false;
  erreurEnvoi = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private parentService: ParentService,
    private addServices: AddServices,
  ) {
    this.form = this.fb.group({
      montant_verse: [null, [Validators.required, Validators.min(1)]],
      mode_paiement: ['', Validators.required],
    });
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  isTouched(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && (c.touched || c.dirty);
  }

  onAnnuler(): void {
    this.router.navigate(['/espace-parent/paiements']);
  }

  onDemanderConfirmation(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erreurEnvoi = '';
    this.confirmEnvoi.open();
  }

  async onConfirmerEnvoi(): Promise<void> {
    this.envoiEnCours = true;
    this.erreurEnvoi = '';

    try {
      const valeurs = this.form.value;
      const idFamille = this.parentService.famille()?.id_famille ?? '';

      const nouveauPaiement: Paiement = {
        id_paiement: `PAI-${Date.now()}`,
        id_famille: idFamille,
        montant_verse: valeurs.montant_verse ?? 0,
        date_paiement: new Date().toISOString().slice(0, 10),
        mode_paiement: valeurs.mode_paiement ?? 'cash',
        recu_numero: '',
        nb_impressions: 0,
        statut: 'crée',
      };

      await this.addServices.addPaiement(nouveauPaiement);
      this.router.navigate(['/espace-parent/paiements']);
    } catch (err) {
      this.erreurEnvoi = "Une erreur est survenue lors de l'envoi du paiement. Veuillez réessayer.";
    } finally {
      this.envoiEnCours = false;
    }
  }
}