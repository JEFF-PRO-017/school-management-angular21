// matiere-modal.component.ts — création / modification d'une matière
// Modal MatDialog — style bl-* cohérent avec le reste de l'app
// Mise à jour du cache via CacheService.upsertMatiere() directement
import {
  Component, inject, signal, OnInit
} from '@angular/core';
import {
  FormGroup, FormControl, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DataService }  from '../../../core/services/data.service';
import { CacheService } from '../../../core/services/cache.service';
import { MatiereConfig } from '../../../core/models/last_index';

export interface MatiereModalData { matiere?: MatiereConfig; }

@Component({
  selector: 'app-matiere-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  styles: [`
    .host  { display:flex; flex-direction:column; width:100%;
             max-width:480px; font-size:13px; }
    .head  { display:flex; align-items:center; justify-content:space-between;
             padding:13px 17px 11px;
             border-bottom:0.5px solid rgba(0,0,0,.09); }
    .body  { padding:15px 17px; display:flex; flex-direction:column; gap:12px;
             max-height:70vh; overflow-y:auto; }
    .foot  { display:flex; justify-content:flex-end; gap:8px;
             padding:10px 17px 13px;
             border-top:0.5px solid rgba(0,0,0,.09); }

    .row2  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .field { display:flex; flex-direction:column; gap:3px; }
    label  { font-size:11px; color:#888; font-weight:500; }
    .fi    { height:34px; padding:0 10px; font-size:13px;
             border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
             background:white; outline:none; color:#333; width:100%;
             transition:border-color .15s; }
    .fi:focus { border-color:#185FA5; }
    .fi.err   { border-color:#A32D2D; }
    select.fi { cursor:pointer; }
    .hint     { font-size:10px; color:#A32D2D; }

    .btn  { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
            cursor:pointer; display:inline-flex; align-items:center; gap:5px;
            border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .btn:disabled { opacity:.35; cursor:default; }
    .btn:not(:disabled):hover { background:#f5f5f5; }
    .btn-p { background:#185FA5; color:#fff; border:none; }
    .btn-p:not(:disabled):hover { opacity:.88; }
    .close { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
             background:white; border-radius:5px; cursor:pointer;
             display:flex; align-items:center; justify-content:center; color:#555; }
    .close:hover { background:#FCEBEB; color:#A32D2D; }
    .spinner { width:13px; height:13px; border-radius:50%;
               border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
               animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }
  `],
  template: `
<div class="host">

  <div class="head">
    <span style="font-size:14px;font-weight:500">
      {{ isEdit ? 'Modifier la matière' : 'Nouvelle matière' }}
    </span>
    <button class="close" mat-dialog-close>✕</button>
  </div>

  <div class="body">
    <form [formGroup]="form">

      <!-- Nom matière (pleine largeur) -->
      <div class="field">
        <label>Nom de la matière *</label>
        <input class="fi"
               [class.err]="fc.nom_matiere.invalid && fc.nom_matiere.touched"
               formControlName="nom_matiere"
               placeholder="ex: Mathématiques, Français, SVT">
        @if (fc.nom_matiere.invalid && fc.nom_matiere.touched) {
          <div class="hint">Requis</div>
        }
      </div>

      <!-- Classe + Enseignant -->
      <div class="row2">
        <div class="field">
          <label>Classe *</label>
          <select class="fi"
                  [class.err]="fc.id_classe.invalid && fc.id_classe.touched"
                  formControlName="id_classe">
            <option value="">— Sélectionner —</option>
            @for (c of classes(); track c.id_classe) {
              <option [value]="c.id_classe">{{ c.nom_classe }}</option>
            }
          </select>
          @if (fc.id_classe.invalid && fc.id_classe.touched) {
            <div class="hint">Requis</div>
          }
        </div>
        <div class="field">
          <label>Enseignant</label>
          <select class="fi" formControlName="id_enseignant">
            <option value="">— Aucun —</option>
            @for (e of enseignants(); track e.id_enseignant) {
              <option [value]="e.id_enseignant">
                {{ e.nom }} {{ e.prenom }}
              </option>
            }
          </select>
        </div>
      </div>

      <!-- Coefficient + Note éliminatoire -->
      <div class="row2">
        <div class="field">
          <label>Coefficient</label>
          <input class="fi" type="number" formControlName="coefficient"
                 min="1" max="10">
        </div>
        <div class="field">
          <label>Note éliminatoire</label>
          <input class="fi" type="number" formControlName="note_eliminatoire"
                 min="0" max="20"
                 placeholder="ex: 7">
        </div>
      </div>

      <!-- Groupe + Niveau -->
      <div class="row2">
        <div class="field">
          <label>Groupe</label>
          <input class="fi" formControlName="groupe"
                 placeholder="ex: Sciences, Lettres">
        </div>
        <div class="field">
          <label>Niveau</label>
          <input class="fi" formControlName="niveau"
                 placeholder="ex: 6ème, Terminale">
        </div>
      </div>

    </form>
  </div>

  <div class="foot">
    <button class="btn" mat-dialog-close>Annuler</button>
    <button class="btn btn-p" (click)="sauvegarder()"
            [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="spinner"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer') }}
    </button>
  </div>

</div>
  `
})
export class MatiereModalComponent implements OnInit {

  readonly data     = inject<MatiereModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MatiereModalComponent>);
  private dataService = inject(DataService);
  private cache     = inject(CacheService);
  private snack     = inject(MatSnackBar);

  isEdit    = false;
  saving    = signal(false);
  private matiereId: string | null = null;

  classes    = () => this.dataService.getClasses()    ?? [];
  enseignants = () => this.dataService.getEnseignants() ?? [];

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
    // this.saving.set(true);

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

    // Mise à jour cache
    // this.cache.upsertMatiere(matiere);

    // this.saving.set(false);
    this.snack.open(
      this.isEdit ? 'Matière mise à jour' : 'Matière créée',
      'OK', { duration: 3000 }
    );
    this.dialogRef.close({ success: true, matiere });
  }
}