// classe-modal.component.ts — création / modification d'une classe
// Modal MatDialog — style bl-* cohérent avec le reste de l'app
// Mise à jour du cache via CacheService.upsertClasse() directement
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
import { Classe, Section } from '../../../core/models';

export interface ClasseModalData { classe?: Classe; }

@Component({
  selector: 'app-classe-modal',
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

    /* Cycle toggle — visuellement plus clair qu'un select */
    .cycle-row { display:flex; gap:6px; }
    .cycle-btn { flex:1; height:34px; border-radius:6px; font-size:12px;
                 cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                 background:white; color:#555; transition:all .15s;
                 font-weight:400; }
    .cycle-btn.on-pri { background:#E8F5E9; color:#2E7D32;
                         border-color:#A5D6A7; font-weight:500; }
    .cycle-btn.on-sec { background:#EBF3FC; color:#185FA5;
                         border-color:#B5D4F4; font-weight:500; }
    .cycle-btn:not(.on-pri):not(.on-sec):hover { background:#f5f5f5; }

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
      {{ isEdit ? 'Modifier la classe' : 'Nouvelle classe' }}
    </span>
    <button class="close" mat-dialog-close>✕</button>
  </div>

  <div class="body">
    <form [formGroup]="form">

      <!-- Nom + Niveau -->
      <div class="row2">
        <div class="field" style="grid-column:1/-1">
          <label>Nom de la classe *</label>
          <input class="fi"
                 [class.err]="fc.nom_classe.invalid && fc.nom_classe.touched"
                 formControlName="nom_classe"
                 placeholder="ex: 6ème A, CM2 B, Terminale C">
          @if (fc.nom_classe.invalid && fc.nom_classe.touched) {
            <div class="hint">Requis</div>
          }
        </div>
      </div>

      <!-- Cycle — toggle visuel (primaire / secondaire) -->
      <div class="field">
        <label>Section *</label>
        <div class="cycle-row">
          <button type="button" class="cycle-btn"
                  [class.on-pri]="fc.cycle.value === 'primaire'"
                  (click)="setCycle('primaire')">
            🏫 Primaire
          </button>
          <button type="button" class="cycle-btn"
                  [class.on-sec]="fc.cycle.value === 'secondaire'"
                  (click)="setCycle('secondaire')">
            🎓 Secondaire
          </button>
        </div>
      </div>

      <!-- Niveau + Effectif -->
      <div class="row2">
        <div class="field">
          <label>Niveau</label>
          <input class="fi" formControlName="niveau"
                 placeholder="ex: 6ème, CM1, Terminale">
        </div>
        <div class="field">
          <label>Effectif maximum</label>
          <input class="fi" type="number" formControlName="effectif_max"
                 min="1" max="100">
        </div>
      </div>

      <!-- Année scolaire + Enseignant principal -->
      <div class="row2">
        <div class="field">
          <label>Année scolaire</label>
          <input class="fi" formControlName="annee_scolaire"
                 placeholder="ex: 2025-2026">
        </div>
        <div class="field">
          <label>Enseignant principal</label>
          <select class="fi" formControlName="enseignant_principal">
            <option value="">— Aucun —</option>
            @for (e of enseignants(); track e.id_enseignant) {
              <option [value]="e.id_enseignant">
                {{ e.nom }} {{ e.prenom }}
              </option>
            }
          </select>
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
export class ClasseModalComponent implements OnInit {

  readonly data     = inject<ClasseModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ClasseModalComponent>);
  private dataService = inject(DataService);
  private cache     = inject(CacheService);
  private snack     = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private classeId: string | null = null;

  enseignants = () => this.dataService.getEnseignants() ?? [];

  form = new FormGroup({
    nom_classe:           new FormControl('', Validators.required),
    niveau:               new FormControl(''),
    cycle:                new FormControl<Section>('secondaire'),
    effectif_max:         new FormControl(40),
    annee_scolaire:       new FormControl(
      `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`
    ),
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
      niveau:               c.niveau,
      cycle:                c.cycle,
      effectif_max:         c.effectif_max,
      annee_scolaire:       c.annee_scolaire,
      enseignant_principal: c.enseignant_principal,
    });
  }

  setCycle(s: Section): void { this.fc.cycle.setValue(s); }

  async sauvegarder(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);

    const classe: Classe = {
      id_classe:            this.classeId ?? `CL-${Date.now()}`,
      nom_classe:           this.fc.nom_classe.value!,
      niveau:               this.fc.niveau.value ?? '',
      cycle:                this.fc.cycle.value as Section,
      effectif_max:         +(this.fc.effectif_max.value ?? 40),
      annee_scolaire:       this.fc.annee_scolaire.value ?? '',
      enseignant_principal: this.fc.enseignant_principal.value ?? '',
    };

    // Persistance Sheets
    if (this.isEdit) {
      await this.dataService.updateClasse(classe);
    } else {
      await this.dataService.addClasse(classe);
    }

    // Mise à jour cache — upsertClasse déclenche _classesEnrichies
    this.cache.upsertClasse(classe);

    this.saving.set(false);
    this.snack.open(
      this.isEdit ? 'Classe mise à jour' : 'Classe créée',
      'OK', { duration: 3000 }
    );
    this.dialogRef.close({ success: true, classe });
  }
}