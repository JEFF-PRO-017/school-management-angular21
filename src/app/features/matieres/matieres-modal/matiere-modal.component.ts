// matiere-modal.component.ts — création / modification d'une matière
// Modal MatDialog — Bootstrap
// Mise à jour du cache via CacheService.upsertMatiere() directement
import {
  Component, inject, OnInit
} from '@angular/core';
import {
  FormGroup, FormControl, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DataService }  from '../../../core/services/data.service';
import { MatiereConfig } from '../../../core/models';

export interface MatiereModalData { matiere?: MatiereConfig; }

@Component({
  selector: 'app-matiere-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
<div class="d-flex flex-column" style="width:100%;max-width:480px">

  <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
    <span class="fs-6 fw-medium">
      {{ isEdit ? 'Modifier la matière' : 'Nouvelle matière' }}
    </span>
    <button type="button" class="btn btn-sm btn-outline-secondary" mat-dialog-close>✕</button>
  </div>

  <div class="p-3 d-flex flex-column gap-3" style="max-height:70vh;overflow-y:auto">
    <form [formGroup]="form">

      <!-- Nom matière (pleine largeur) -->
      <div class="mb-3">
        <label class="form-label small text-muted">Nom de la matière *</label>
        <input class="form-control form-control-sm"
               [class.is-invalid]="fc.nom_matiere.invalid && fc.nom_matiere.touched"
               formControlName="nom_matiere"
               placeholder="ex: Mathématiques, Français, SVT">
        @if (fc.nom_matiere.invalid && fc.nom_matiere.touched) {
          <div class="invalid-feedback">Requis</div>
        }
      </div>

      <!-- Classe + Enseignant -->
      <div class="row mb-3">
        <div class="col-6">
          <label class="form-label small text-muted">Classe *</label>
          <select class="form-select form-select-sm"
                  [class.is-invalid]="fc.id_classe.invalid && fc.id_classe.touched"
                  formControlName="id_classe">
            <option value="">— Sélectionner —</option>
            @for (c of classes(); track c.id_classe) {
              <option [value]="c.id_classe">{{ c.nom_classe }}</option>
            }
          </select>
          @if (fc.id_classe.invalid && fc.id_classe.touched) {
            <div class="invalid-feedback">Requis</div>
          }
        </div>
        <div class="col-6">
          <label class="form-label small text-muted">Enseignant</label>
          <select class="form-select form-select-sm" formControlName="id_enseignant">
            <option value="">— Aucun —</option>
            @for (e of enseignants(); track e.id) {
              <option [value]="e.id">
                {{ e.nom }} {{ e.prenom }}
              </option>
            }
          </select>
        </div>
      </div>

      <!-- Coefficient + Note éliminatoire -->
      <div class="row mb-3">
        <div class="col-6">
          <label class="form-label small text-muted">Coefficient</label>
          <input class="form-control form-control-sm" type="number" formControlName="coefficient"
                 min="1" max="10">
        </div>
        <div class="col-6">
          <label class="form-label small text-muted">Note éliminatoire</label>
          <input class="form-control form-control-sm" type="number" formControlName="note_eliminatoire"
                 min="0" max="20"
                 placeholder="ex: 7">
        </div>
      </div>

      <!-- Groupe + Niveau -->
      <div class="row">
        <div class="col-6">
          <label class="form-label small text-muted">Groupe</label>
          <input class="form-control form-control-sm" formControlName="groupe"
                 placeholder="ex: Sciences, Lettres">
        </div>
        <div class="col-6">
          <label class="form-label small text-muted">Niveau</label>
          <input class="form-control form-control-sm" formControlName="niveau"
                 placeholder="ex: 6ème, Terminale">
        </div>
      </div>

    </form>
  </div>

  <div class="d-flex justify-content-end gap-2 px-3 py-2 border-top">
    <button type="button" class="btn btn-sm btn-outline-secondary" mat-dialog-close>Annuler</button>
    <button type="button" class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            (click)="sauvegarder()"
            [disabled]="form.invalid">
      @if (saving) {
        <span class="spinner-border spinner-border-sm"></span>
      }
      {{ isEdit ? 'Mettre à jour' : 'Créer' }}
    </button>
  </div>

</div>
  `
})
export class MatiereModalComponent implements OnInit {

  readonly data     = inject<MatiereModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MatiereModalComponent>);
  private dataService = inject(DataService);
  private snack     = inject(MatSnackBar);

  isEdit    = false;
  saving    = false;
  private matiereId: string | null = null;

  classes    = () => this.dataService.getClasses()    ?? [];
  enseignants = () => this.dataService.getUsers() ?? [];

  form = new FormGroup({
    nom_matiere:       new FormControl('', Validators.required),
    id_classe:         new FormControl('', Validators.required),
    id_enseignant:     new FormControl(''),
    coefficient:       new FormControl(1),
    note_eliminatoire: new FormControl<number | null>(null),
    groupe:            new FormControl(''),
    niveau:            new FormControl(''),
  });

  get fc() { return this.form.controls; }

  ngOnInit(): void {
    const m = this.data?.matiere;
    if (!m) return;
    this.isEdit    = true;
    this.matiereId = m.id_matiere;
    const coefficient = typeof m.coefficient === 'string'
      ? Number(m.coefficient)
      : m.coefficient;
    this.form.patchValue({
      nom_matiere:       m.nom_matiere,
      id_classe:         m.id_classe,
      id_enseignant:     m.id_enseignant,
      coefficient:       Number.isNaN(coefficient) ? 1 : coefficient,
      note_eliminatoire: m.note_eliminatoire ?? null,
      groupe:            m.groupe,
      niveau:            m.niveau,
    });
  }

  async sauvegarder(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const matiere: MatiereConfig = {
      id_matiere:        this.matiereId ?? `MAT-${Date.now()}`,
      nom_matiere:       this.fc.nom_matiere.value!,
      id_classe:         this.fc.id_classe.value!,
      id_enseignant:     this.fc.id_enseignant.value ?? '',
      coefficient:       +(this.fc.coefficient.value ?? 1),
      note_eliminatoire: this.fc.note_eliminatoire.value ?? undefined,
      groupe:            this.fc.groupe.value ?? '',
      niveau:            this.fc.niveau.value ?? '',
    };

    if (this.isEdit) {
      this.dataService.updateMatiere(matiere);
    } else {
       this.dataService.addMatiere(matiere);
    }
    this.snack.open(
      this.isEdit ? 'Matière mise à jour' : 'Matière créée',
      'OK', { duration: 3000 }
    );
    this.dialogRef.close({ success: true, matiere });
  }
}