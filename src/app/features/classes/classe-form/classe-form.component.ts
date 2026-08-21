import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { Classe } from '../../../core/models/academic';
import { Section } from '../../../core/models/shared';
import { GetServices, AddServices, PatchServices } from '../../../core/services/@data';

export interface ClasseModalData { classe?: Classe; }

@Component({
  selector: 'app-classe-modal',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [ReactiveFormsModule, MatDialogModule, NgxMaskDirective],
  template: `
<div style="width:100%;max-width:460px">

  <!-- En-tête -->
  <div class="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
    <span class="fw-semibold">{{ isEdit ? 'Modifier la classe' : 'Nouvelle classe' }}</span>
    <button class="btn-close" mat-dialog-close></button>
  </div>

  <!-- Corps -->
  <div class="px-3 py-3 d-flex flex-column gap-3" [formGroup]="form">

    <!-- Nom -->
    <div>
      <label class="form-label small mb-1">Nom de la classe *</label>
      <input class="form-control form-control-sm"
             formControlName="nom_classe"
             placeholder="ex: 6ème A, CM2 B, Terminale C"
             [class.is-invalid]="fc.nom_classe.invalid && fc.nom_classe.touched">
      <div class="invalid-feedback">Requis</div>
    </div>

    <!-- Section toggle -->
    <div>
      <label class="form-label small mb-1">Section *</label>
      <div class="btn-group btn-group-sm w-100">
        <button type="button" class="btn"
                [class.btn-success]="fc.cycle.value === 'primaire'"
                [class.btn-outline-secondary]="fc.cycle.value !== 'primaire'"
                (click)="setCycle('primaire')">🏫 Primaire</button>
        <button type="button" class="btn"
                [class.btn-primary]="fc.cycle.value === 'secondaire'"
                [class.btn-outline-secondary]="fc.cycle.value !== 'secondaire'"
                (click)="setCycle('secondaire')">🎓 Secondaire</button>
      </div>
    </div>

    <!-- Effectif + Prix -->
    <div class="row g-2">
      <div class="col-6">
        <label class="form-label small mb-1">Effectif maximum</label>
        <input class="form-control form-control-sm" type="number"
               formControlName="effectif_max" min="1" max="100">
      </div>
      <div class="col-6">
        <label class="form-label small mb-1">Prix pension (FCFA) *</label>
        <div class="input-group input-group-sm">
          <input class="form-control"
                 formControlName="prix"
                 mask="separator.0"
                 thousandSeparator=" "
                 [dropSpecialCharacters]="true"
                 placeholder="0"
                 [class.is-invalid]="fc.prix.invalid && fc.prix.touched">
          <span class="input-group-text">F</span>
        </div>
        <div class="invalid-feedback d-block"
             *ngIf="fc.prix.invalid && fc.prix.touched">Requis</div>
      </div>
    </div>

    <!-- Enseignant principal -->
    <div>
      <label class="form-label small mb-1">Enseignant principal</label>
      <select class="form-select form-select-sm"
              formControlName="enseignant_principal">
        <option value="">— Aucun —</option>
        @for (e of enseignants(); track e.id_enseignant) {
          <option [value]="e.id_enseignant">{{ e.nom }} {{ e.prenom }}</option>
        }
      </select>
    </div>

  </div>

  <!-- Pied -->
  <div class="d-flex justify-content-end gap-2 px-3 py-2 border-top">
    <button class="btn btn-sm btn-outline-secondary" mat-dialog-close>Annuler</button>
    <button class="btn btn-sm btn-primary"
            (click)="sauvegarder()" [disabled]="form.invalid">
  {{ (isEdit ? 'Mettre à jour' : 'Créer') }}
    </button>
  </div>

</div>
  `
})
export class ClasseModalComponent implements OnInit {

  readonly data     = inject<ClasseModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ClasseModalComponent>);
  private snack     = inject(MatSnackBar);
    private get = inject(GetServices)
  private add = inject(AddServices)
  private patch = inject(PatchServices)

  isEdit  = false;
  private classeId: string | null = null;

  enseignants = () => this.get.getEnseignants() ?? [];

  form = new FormGroup({
    nom_classe:           new FormControl('', Validators.required),
    cycle:                new FormControl<Section>('secondaire'),
    effectif_max:         new FormControl(40),
    prix:                 new FormControl('', Validators.required),
    enseignant_principal: new FormControl(''),
  });

  get fc() { return this.form.controls; }

  ngOnInit(): void {
    const c = this.data?.classe;
    if (!c) return;
    this.isEdit   = true;
    this.classeId = c.id_classe;
    this.form.patchValue({
      nom_classe:           c.nom_classe,
      cycle:                c.cycle,
      effectif_max:         c.effectif_max,
      prix:                 String(c.prix ?? ''),
      enseignant_principal: c.enseignant_principal,
    });
  }

  setCycle(s: Section): void { this.fc.cycle.setValue(s); }

   sauvegarder(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const classe: Classe = {
      id_classe: this.classeId ?? `CL-${Date.now()}`,
      nom_classe: this.fc.nom_classe.value!,
      cycle: this.fc.cycle.value as Section,
      effectif_max: +(this.fc.effectif_max.value ?? 40),
      prix: +(this.fc.prix.value ?? 0),
      enseignant_principal: this.fc.enseignant_principal.value ?? '',
      niveau: '',
      annee_scolaire: ''
    };

    if (this.isEdit)  this.patch.updateClasse(classe);
    else              this.add.addClasse(classe);

    this.snack.open(this.isEdit ? 'Classe modifiée' : 'Classe créée', 'OK', { duration: 3000 });
    this.dialogRef.close({ success: true, classe });
  }
}