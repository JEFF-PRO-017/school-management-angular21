// famille-modal.component.ts — orchestrateur
// Zéro ViewChild — tout passe par @Input / @Output
// Supporte Famille et FamilleEnrichi (récupère annee_scolaires[0] si présent)

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DataService } from '../../../core/services/data.service';

import { ANNEE_SCOLAIRE } from '../../../core/models/shared';

import { FamilleFormComponent } from './famille-form.component';
import { FamilleFraisComponent, FraisFormValue } from './famille-frais.component';
import { AnneeScolaireFamille, creerAnneeScolaire, Famille, FamilleEnrichi } from '../../../core/models/family';

export interface FamilleModalData { famille: Famille | FamilleEnrichi | null; }

/** Vérifie si la donnée est un FamilleEnrichi */
function isFamilleEnrichi(f: Famille | FamilleEnrichi): f is FamilleEnrichi {
  return 'annee_scolaires' in f;
}

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
  <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
    <span class="">
      {{ isEdit ? 'Modifier la famille' : 'Nouvelle famille' }}
    </span>
    <button class="btn-close btn-sm" mat-dialog-close></button>
  </div>

  <!-- Corps -->
  <div class="px-3 py-3 d-flex flex-column gap-3 overflow-auto" style="max-height:72vh">

    <!-- Identité famille -->
    <app-famille-form
      [form]="form"
      (gpsChange)="onGpsChange($event)">
    </app-famille-form>

    <hr class="my-1">

    <!-- Frais année scolaire -->
    <app-famille-frais
      [anneeScolaire]="anneeScolaireExistante"
      (fraisChange)="onFraisChange($event)">
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

  readonly data = inject<FamilleModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FamilleModalComponent>);
  private svc = inject(DataService);
  private snack = inject(MatSnackBar);

  isEdit = false;
  familleId = '';

  // GPS — mis à jour via Output de FamilleFormComponent
  private lat: number | null = null;
  private lng: number | null = null;

  // Frais — mis à jour via Output de FamilleFraisComponent
  private fraisValue: FraisFormValue = {
    actif: false,
    montant_reduction_special: 0,
    commentaire: '',
  };

  // AnneeScolaireFamille existante passée en @Input à FamilleFraisComponent
  anneeScolaireExistante: AnneeScolaireFamille | null = null;

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

    // Récupère l'AnneeScolaireFamille si FamilleEnrichi
    if (isFamilleEnrichi(this.data.famille)) {
      const annees = this.data.famille.annee_scolaires ?? [];
      // Prend celle de l'année courante si elle existe
      this.anneeScolaireExistante =
        annees.find(a => a.annee_scolaire === ANNEE_SCOLAIRE) ?? annees[0] ?? null;
    }
  }

  // ── Callbacks Output ──────────────────────────────────────────

  onGpsChange(pos: { lat: number | null; lng: number | null }): void {
    this.lat = pos.lat;
    this.lng = pos.lng;
  }

  onFraisChange(val: FraisFormValue): void {
    this.fraisValue = val;
  }

  // ── Sauvegarde ────────────────────────────────────────────────

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const idFamille = this.familleId || `FAM-${Date.now()}`;

    // 1. Famille
    const famille: Famille = {
      id_famille: idFamille,
      nom_famille: this.form.value.nom_famille!,
      tel_pere: this.form.value.tel_pere!,
      tel_mere: this.form.value.tel_mere ?? '',
      tel_autre: this.form.value.tel_autre ?? '',
      adresse_texte: this.form.value.adresse_texte ?? '',
      latitude: this.lat ?? undefined,
      longitude: this.lng ?? undefined,
      status: 'ACTIF'
    };

    if (this.isEdit)  this.svc.updateFamille(famille);
    else  this.svc.addFamille(famille);

    // 2. AnneeScolaireFamille — si section active
    // 2. AnneeScolaireFamille
    const base = this.anneeScolaireExistante ?? creerAnneeScolaire(idFamille, ANNEE_SCOLAIRE);

    const annee: AnneeScolaireFamille = {
      ...base,
      ...(this.fraisValue.actif && {
        montant_reduction_special: this.fraisValue.montant_reduction_special,
        commentaire: this.fraisValue.commentaire,
      }),
    };

    this.anneeScolaireExistante
      ? this.svc.updateAnneeSvc(annee)
      :  this.svc.addAnneeSvc(annee);

    this.dialogRef.close({ success: true, famille });
  }
}