import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { CacheService } from '../../../core/services/cache.service';
import { DataService }  from '../../../core/services/data.service';
import { StatutEleve } from '../../../core/models/shared';
import { AnneeScolaireFamille, FamilleEnrichi, FamilleService } from '../../../core/models/family';
import { Eleve } from '../../../core/models/academic';

export interface EleveModalData { famille: FamilleEnrichi; eleve?: Eleve; }

@Component({
  selector: 'app-eleve-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
<div style="width:100%;max-width:440px">

  <!-- En-tête -->
  <div class="d-flex align-items-start justify-content-between px-3 py-3 border-bottom">
    <div>
      <div class="fw-semibold">{{ isEdit ? "Modifier l'élève" : "Ajouter un élève" }}</div>
      <div class="text-muted small">{{ data.famille.nom_famille }}</div>
    </div>
    <button class="btn-close" mat-dialog-close></button>
  </div>

  <!-- Corps -->
  <div class="px-3 py-3 d-flex flex-column gap-3" [formGroup]="form">

    <!-- Nom + Prénom -->
    <div class="row g-2">
      <div class="col-6">
        <label class="form-label small mb-1">Nom *</label>
        <input class="form-control form-control-sm"
               formControlName="nom" placeholder="Nom de famille"
               [class.is-invalid]="form.controls.nom.invalid && form.controls.nom.touched">
        <div class="invalid-feedback">Requis</div>
      </div>
      <div class="col-6">
        <label class="form-label small mb-1">Prénom *</label>
        <input class="form-control form-control-sm"
               formControlName="prenom" placeholder="Prénom"
               [class.is-invalid]="form.controls.prenom.invalid && form.controls.prenom.touched">
        <div class="invalid-feedback">Requis</div>
      </div>
    </div>

    <!-- Classe + Sexe -->
    <div class="row g-2">
      <div class="col-7">
        <label class="form-label small mb-1">Classe *</label>
        <select class="form-select form-select-sm" formControlName="id_classe"
                [class.is-invalid]="form.controls.id_classe.invalid && form.controls.id_classe.touched">
          <option value="">Choisir…</option>
          @for (c of classes(); track c.id_classe) {
            <option [value]="c.id_classe">{{ c.nom_classe }}</option>
          }
        </select>
        <div class="invalid-feedback">Requis</div>
      </div>
      <div class="col-5">
        <label class="form-label small mb-1">Sexe</label>
        <div class="btn-group btn-group-sm w-100">
          <button type="button" class="btn"
                  [class.btn-primary]="form.controls.sexe.value === 'M'"
                  [class.btn-outline-secondary]="form.controls.sexe.value !== 'M'"
                  (click)="form.controls.sexe.setValue('M')">M</button>
          <button type="button" class="btn"
                  [class.btn-primary]="form.controls.sexe.value === 'F'"
                  [class.btn-outline-secondary]="form.controls.sexe.value !== 'F'"
                  (click)="form.controls.sexe.setValue('F')">F</button>
        </div>
      </div>
    </div>

    <!-- Date naissance + Matricule -->
    <div class="row g-2">
      <div class="col-6">
        <label class="form-label small mb-1">Date de naissance</label>
        <input class="form-control form-control-sm" type="date"
               formControlName="date_naissance">
      </div>
      <div class="col-6">
        <label class="form-label small mb-1">Matricule</label>
        <input class="form-control form-control-sm" formControlName="matricule"
               placeholder="Optionnel">
      </div>
    </div>

    <!-- Statut — édition uniquement -->
    @if (isEdit) {
      <div>
        <label class="form-label small mb-1">Statut</label>
        <select class="form-select form-select-sm" formControlName="statut">
          <option value="ACTIF">Actif</option>
          <option value="NON-ACTIF">Non actif</option>
          <option value="ARCHIVE">Archivé</option>
        </select>
      </div>
    }

  </div>

  <!-- Pied -->
  <div class="d-flex justify-content-end gap-2 px-3 py-2 border-top">
    <button class="btn btn-sm btn-outline-secondary" mat-dialog-close>Annuler</button>
    <button class="btn btn-sm btn-primary"
            (click)="save()" >
 {{(isEdit ? 'Modifier' : 'Ajouter élève')}}
    </button>
  </div>

</div>
  `
})
export class EleveModalComponent implements OnInit {

  readonly data     = inject<EleveModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<EleveModalComponent>);
  private dataSvc   = inject(DataService);
  private fas       = inject(FamilleService)

  isEdit  = false;
  private eleveId: string | null = null;

  classes = computed(() => this.dataSvc.getClasses() ?? []);

  form = new FormGroup({
    nom:            new FormControl('', Validators.required),
    prenom:         new FormControl('', Validators.required),
    id_classe:      new FormControl('', Validators.required),
    sexe:           new FormControl<'M' | 'F' | ''>(''),
    date_naissance: new FormControl(''),
    matricule:      new FormControl(''),
    statut:         new FormControl<StatutEleve>('ACTIF'),
  });

  ngOnInit(): void {
    if (!this.data.eleve) return;
    this.isEdit  = true;
    this.eleveId = this.data.eleve.id_eleve;
    this.form.patchValue({
      nom:            this.data.eleve.nom,
      prenom:         this.data.eleve.prenom,
      id_classe:      this.data.eleve.id_classe,
      sexe:           this.data.eleve.sexe ?? '',
      date_naissance: this.data.eleve.date_naissance,
      matricule:      this.data.eleve.matricule ?? '',
      statut:         this.data.eleve.statut,
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const classe   = this.classes().find(c => c.id_classe ===this.form.value.id_classe)
    if(!classe) return

    const eleve: Eleve = {
      id_eleve:         this.eleveId ?? `ELV-${Date.now()}`,
      id_famille:       this.data.famille.id_famille,
      id_classe:        this.form.value.id_classe!,
      nom:              this.form.value.nom!,
      prenom:           this.form.value.prenom!,
      date_naissance:   this.form.value.date_naissance ?? '',
      date_inscription: new Date().toISOString().split('T')[0],
      statut:           this.form.value.statut ?? 'ACTIF',
      sexe:             this.form.value.sexe || undefined,
      matricule:        this.form.value.matricule || undefined,
    };

    const anneeUpdate =this.fas.upateAnneeSvc(this.data.famille,eleve,classe) 
    if(!anneeUpdate) return
    
    if (this.isEdit) await this.dataSvc.updateEleve(eleve);
    else             await this.dataSvc.addEleve(eleve);

    console.log('anneeUpdate',anneeUpdate);
    this.dataSvc.updateAnneeSvc(anneeUpdate)

    this.dialogRef.close({ success: true, eleve });
  }
}