// famille-modal.component.ts — orchestrateur
// Zéro ViewChild — tout passe par @Input / @Output
// Supporte Famille et FamilleEnrichi (récupère annee_scolaires[0] si présent)
// Validation : Angular Validators + FormGroup.invalid (pas de message HTML statique)
// Feedback utilisateur : MatSnackBar (service Angular, pas de bandeau HTML fait main)

import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ANNEE_SCOLAIRE } from '../../../core/models/shared';

import { FamilleFormComponent, TEL_PATTERN } from './components/famille-form.component';
import { FamilleFraisComponent, FraisFormValue } from './components/famille-frais.component';
import { AnneeScolaireFamille,  Famille, FamilleEnrichi, FamilleService } from '../../../core/models/family';
import { AddServices, PatchServices } from '../../../core/services/@data';

export interface FamilleModalData { famille: Famille | FamilleEnrichi | null; }

const SNACKBAR_DURATION = 3000;

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
            [disabled]="enregistrementEnCours"
            (click)="save()">
        {{ isEdit ? 'Enregistrer les modifications' : 'Créer la famille' }}
    </button>
  </div>

</div>
  `
})
export class FamilleModalComponent implements OnInit {

  readonly data = inject<FamilleModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FamilleModalComponent>);
  private fas = inject(FamilleService);
  private snackBar = inject(MatSnackBar);
  private add = inject(AddServices)
  private patch  = inject(PatchServices)

  isEdit = false;
  familleId = '';
  enregistrementEnCours = false;

  // GPS — mis à jour via Output de FamilleFormComponent
  private lat: number | null = null;
  private lng: number | null = null;

  // Frais — mis à jour via Output de FamilleFraisComponent
  private fraisValue: FraisFormValue = {
    actif: false,
    valide: true,
    montant_reduction_special: 0,
    commentaire: '',
  };

  // AnneeScolaireFamille existante passée en @Input à FamilleFraisComponent
  anneeScolaireExistante: AnneeScolaireFamille | undefined = undefined;

  form = new FormGroup({
    nom_famille: new FormControl('', [Validators.required, Validators.minLength(2)]),
    tel_mere: new FormControl('', [Validators.required, Validators.pattern(TEL_PATTERN)]),
    tel_pere: new FormControl('', [Validators.pattern(TEL_PATTERN)]),
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
      // Prend celle de l'année courante si elle existe
      this.anneeScolaireExistante = this.fas.anneeSvcEncours(this.data.famille);
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
    // 1. Formulaire identité : état natif Angular (form.invalid)
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Veuillez corriger les champs en rouge avant de continuer', 'OK', {
        duration: SNACKBAR_DURATION,
      });
      return;
    }

    // 2. Sous-formulaire frais : validité remontée via l'Output (fraisValue.valide)
    if (!this.fraisValue.valide) {
      this.snackBar.open('Veuillez corriger le montant ou le motif de la réduction', 'OK', {
        duration: SNACKBAR_DURATION,
      });
      return;
    }

    this.enregistrementEnCours = true;

    try {
      const idFamille = this.familleId || `FAM-${Date.now()}`;

      // Famille
      const famille: Famille = {
        id_famille: idFamille,
        nom_famille: this.form.value.nom_famille!,
        tel_pere: this.form.value.tel_pere ?? '',
        tel_mere: this.form.value.tel_mere ?? '',
        tel_autre: this.form.value.tel_autre ?? '',
        adresse_texte: this.form.value.adresse_texte ?? '',
        latitude: this.lat ?? undefined,
        longitude: this.lng ?? undefined,
        status: 'ACTIF'
      };

      if (this.isEdit) this.patch.updateFamille(famille);
      else this.add.addFamille(famille);

      // AnneeScolaireFamille — si section active
      const base = this.anneeScolaireExistante ?? this.fas.creerAnneeScolaire(idFamille, ANNEE_SCOLAIRE);

      const annee: AnneeScolaireFamille = {
        ...base,
        ...(this.fraisValue.actif && {
          montant_reduction_special: this.fraisValue.montant_reduction_special,
          commentaire: this.fraisValue.commentaire,
        }),
      };

      this.anneeScolaireExistante
        ? this.patch.updateAnneeSvc(annee)
        : this.add.addAnneeSvc(annee);

      this.snackBar.open(
        this.isEdit ? 'Famille modifiée avec succès' : 'Famille créée avec succès',
        'OK',
        { duration: SNACKBAR_DURATION }
      );

      this.dialogRef.close({ success: true, famille });

    } catch (err) {
      this.snackBar.open('Une erreur est survenue lors de l\'enregistrement', 'OK', {
        duration: SNACKBAR_DURATION,
      });
    } finally {
      this.enregistrementEnCours = false;
    }
  }
}