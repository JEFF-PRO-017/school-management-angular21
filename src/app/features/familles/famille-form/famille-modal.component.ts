// famille-modal.component.ts — orchestrateur léger
// Délègue le rendu à : FamilleFormComponent + FamilleFraisComponent
// AnneeScolaireFamille est créée via la factory creerAnneeScolaire()
// et sauvegardée via un service dédié (AnneeScolaireService)

import {
  Component, inject, signal, OnInit, ViewChild
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DataService } from '../../../core/services/data.service';

import { ANNEE_SCOLAIRE } from '../../../core/models/shared';

import { FamilleFormComponent } from './famille-form.component';
import { FamilleFraisComponent } from './famille-frais.component';
import { Famille } from '../../../core/models';
import { creerAnneeScolaire } from '../../../core/models/family';

export interface FamilleModalData { famille: Famille | null; }

@Component({
  selector: 'app-famille-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    FamilleFormComponent,
    FamilleFraisComponent,
  ],
  template: `
<div class="d-flex flex-column" style="width:100%;max-width:520px">

  <!-- En-tête -->
  <div class="d-flex align-items-center justify-content-between
              px-3 py-2 border-bottom">
    <span class="fw-semibold">
      {{ isEdit ? 'Modifier la famille' : 'Nouvelle famille' }}
    </span>
    <button class="btn-close btn-sm" mat-dialog-close></button>
  </div>

  <!-- Corps -->
  <div class="px-3 py-3 d-flex flex-column gap-3 overflow-auto" style="max-height:72vh">

    <!-- Sous-composant : infos famille -->
    <app-famille-form
      #familleForm
      [form]="form"
      (gpsChange)="onGpsChange($event)">
    </app-famille-form>

    <hr class="my-1">

    <!-- Sous-composant : frais année scolaire -->
    <app-famille-frais
      #familleFrais
      [reductionSpecialInit]="reductionSpecialInit"
      [commentaireInit]="commentaireInit">
    </app-famille-frais>

  </div>

  <!-- Pied -->
  <div class="d-flex justify-content-end gap-2 px-3 py-2 border-top">
    <button class="btn btn-sm btn-outline-secondary" mat-dialog-close>
      Annuler
    </button>
    <button class="btn btn-sm btn-primary"
            (click)="save()">

        {{ isEdit ? 'Modifier' : 'Créer famille' }}
    </button>
  </div>

</div>
  `
})
export class FamilleModalComponent implements OnInit {

  @ViewChild('familleForm') familleFormRef!: FamilleFormComponent;
  @ViewChild('familleFrais') familleFraisRef!: FamilleFraisComponent;

  readonly data = inject<FamilleModalData>(MAT_DIALOG_DATA);
  private svc = inject(DataService);


  isEdit = false;
  familleId = '';

  // GPS géré localement après émission du sous-composant
  private lat: number | null = null;
  private lng: number | null = null;

  // Données de pré-remplissage frais (mode édition)
  reductionSpecialInit = 0;
  commentaireInit = '';

  // Formulaire identité (passé en @Input au sous-composant)
  form = new FormGroup({
    nom_famille: new FormControl('', Validators.required),
    tel_pere: new FormControl('', Validators.required),
    tel_mere: new FormControl(''),
    tel_autre: new FormControl(''),
    adresse_texte: new FormControl(''),
  });

  ngOnInit(): void {
    if (!this.data.famille) return;

    this.isEdit = true;
    this.familleId = this.data.famille.id_famille;
    this.form.patchValue(this.data.famille);
    this.lat = this.data.famille.latitude ?? null;
    this.lng = this.data.famille.longitude ?? null;

    // Pré-charge les frais existants depuis AnneeScolaireService si besoin
    // (à adapter selon votre implémentation réelle)
  }

  onGpsChange(pos: { lat: number | null; lng: number | null }): void {
    this.lat = pos.lat;
    this.lng = pos.lng;
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    // ── 1. Construire la Famille (modèle simplifié sans frais) ──
    const idFamille = this.familleId || `FAM-${Date.now()}`;

    const famille: Famille = {
      id_famille: idFamille,
      nom_famille: this.form.value.nom_famille!,
      tel_pere: this.form.value.tel_pere!,
      tel_mere: this.form.value.tel_mere ?? '',
      tel_autre: this.form.value.tel_autre ?? '',
      adresse_texte: this.form.value.adresse_texte ?? '',
      latitude: this.lat ?? undefined,
      longitude: this.lng ?? undefined,
    };

    if (this.isEdit) await this.svc.updateFamille(famille);
    else await this.svc.addFamille(famille);

    // ── 2. AnneeScolaireFamille — créée automatiquement si section active ──
    if (this.familleFraisRef?.isActif()) {
      const { montant_reduction_special, commentaire } =this.familleFraisRef.getData();

      const anneeScolaire = creerAnneeScolaire(
        idFamille,
        ANNEE_SCOLAIRE,
        montant_reduction_special,
      );
      anneeScolaire.commentaire = commentaire;

      // await this.anneeSvc.save(anneeScolaire); // service dédié
    }
  }
}