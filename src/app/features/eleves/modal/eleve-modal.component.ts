// ─────────────────────────────────────────────────────────────────
// eleve-modal.component.ts
// Modal ajout / modification élève — template bulletins (bl-*)
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, Inject, OnInit, computed
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../core/services/cache.service';
import { DataService }  from '../../../core/services/data.service';
import { Eleve, Famille } from '../../../core/models';

export interface EleveModalData { famille: Famille; eleve?: Eleve; }

@Component({
  selector: 'app-eleve-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  styles: [`
    .bl-modal-host { display:flex; flex-direction:column; gap:0;
                     font-size:13px; width:100%; max-width:440px; }
    .bl-modal-head { display:flex; align-items:flex-start;
                     justify-content:space-between;
                     padding:14px 18px 12px;
                     border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-modal-title { font-size:14px; font-weight:500; }
    .bl-modal-sub   { font-size:11px; color:#888; margin-top:2px; }
    .bl-modal-body  { padding:14px 18px;
                      display:flex; flex-direction:column; gap:11px; }
    .bl-modal-foot  { display:flex; justify-content:flex-end; gap:8px;
                      padding:10px 18px 14px;
                      border-top:0.5px solid rgba(0,0,0,.09); }

    .bl-field label { font-size:11px; color:#888;
                      display:block; margin-bottom:3px; }
    .bl-field-input, .bl-field-select {
      width:100%; height:32px; padding:0 10px; font-size:13px;
      border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
      background:white; outline:none; color:#333;
      transition:border-color .15s;
    }
    .bl-field-input:focus,
    .bl-field-select:focus { border-color:#185FA5; }
    .bl-field-input.invalid { border-color:#A32D2D; }
    .bl-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

    /* Toggle sexe — même style que mode_paiement dans paiement-modal */
    .bl-sex-btn { flex:1; height:32px; border-radius:6px; font-size:13px;
                  font-weight:500; cursor:pointer;
                  border:0.5px solid rgba(0,0,0,.18);
                  background:white; color:#555; transition:all .12s; }
    .bl-sex-btn.on { background:#EBF3FC; color:#185FA5;
                     border-color:#B5D4F4; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
    .bl-btn:disabled    { opacity:.35; cursor:default; }
    .bl-btn--outline    { background:white; color:#333;
                          border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:hover { background:#f5f5f5; }
    .bl-btn--primary    { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }
    .bl-close { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
                background:white; border-radius:5px; cursor:pointer;
                display:flex; align-items:center; justify-content:center; color:#555; }
    .bl-close:hover { background:#FCEBEB; color:#A32D2D; border-color:#F09595; }
    .bl-spinner { width:13px; height:13px; border-radius:50%;
                  border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
                  animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
  template: `
<div class="bl-modal-host">

  <!-- ── En-tête ── -->
  <div class="bl-modal-head">
    <div>
      <div class="bl-modal-title">
        {{ isEdit ? "Modifier l\'élève" : "Ajouter un élève" }}
      </div>
      <div class="bl-modal-sub">{{ data.famille.nom_famille }}</div>
    </div>
    <button class="bl-close" mat-dialog-close>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- ── Corps ── -->
  <div class="bl-modal-body">
    <form [formGroup]="form">

      <!-- Nom + Prénom -->
      <div class="bl-grid2">
        <div class="bl-field">
          <label>Nom *</label>
          <input class="bl-field-input"
                 [class.invalid]="form.controls.nom.invalid && form.controls.nom.touched"
                 formControlName="nom" placeholder="Nom de famille">
          @if (form.controls.nom.invalid && form.controls.nom.touched) {
            <span style="font-size:10px;color:#A32D2D">Requis</span>
          }
        </div>
        <div class="bl-field">
          <label>Prénom *</label>
          <input class="bl-field-input"
                 [class.invalid]="form.controls.prenom.invalid && form.controls.prenom.touched"
                 formControlName="prenom" placeholder="Prénom">
          @if (form.controls.prenom.invalid && form.controls.prenom.touched) {
            <span style="font-size:10px;color:#A32D2D">Requis</span>
          }
        </div>
      </div>

      <!-- Classe + Sexe -->
      <div class="bl-grid2">
        <div class="bl-field">
          <label>Classe *</label>
          <select class="bl-field-select" formControlName="id_classe">
            <option value="">Choisir…</option>
            @for (c of classes(); track c.id_classe) {
              <option [value]="c.id_classe">{{ c.nom_classe }}</option>
            }
          </select>
          @if (form.controls.id_classe.invalid && form.controls.id_classe.touched) {
            <span style="font-size:10px;color:#A32D2D">Requis</span>
          }
        </div>
        <div class="bl-field">
          <label>Sexe</label>
          <div style="display:flex;gap:6px;margin-top:1px">
            <button type="button" class="bl-sex-btn"
              [class.on]="form.controls.sexe.value === 'M'"
              (click)="form.controls.sexe.setValue('M')">M</button>
            <button type="button" class="bl-sex-btn"
              [class.on]="form.controls.sexe.value === 'F'"
              (click)="form.controls.sexe.setValue('F')">F</button>
          </div>
        </div>
      </div>

      <!-- Date naissance + Matricule -->
      <div class="bl-grid2">
        <div class="bl-field">
          <label>Date de naissance</label>
          <input class="bl-field-input" type="date"
                 formControlName="date_naissance">
        </div>
        <div class="bl-field">
          <label>Matricule</label>
          <input class="bl-field-input" formControlName="matricule"
                 placeholder="Optionnel">
        </div>
      </div>

      <!-- Statut — seulement en mode édition -->
      @if (isEdit) {
        <div class="bl-field">
          <label>Statut</label>
          <select class="bl-field-select" formControlName="statut">
            <option value="actif">Actif</option>
            <option value="archive">Archivé</option>
          </select>
        </div>
      }

    </form>
  </div>

  <!-- ── Pied ── -->
  <div class="bl-modal-foot">
    <button class="bl-btn bl-btn--outline" mat-dialog-close>Annuler</button>
    <button class="bl-btn bl-btn--primary"
            (click)="save()" [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="bl-spinner"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Modifier' : 'Ajouter élève') }}
    </button>
  </div>

</div>
  `
})
export class EleveModalComponent implements OnInit {

  readonly data     = inject<EleveModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<EleveModalComponent>);
  private cache     = inject(CacheService);
  private dataSvc   = inject(DataService);
  private snack     = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  private eleveId: string | null = null;

  classes = computed(() => this.cache.getClasses() ?? []);

  form = new FormGroup({
    nom:            new FormControl('', Validators.required),
    prenom:         new FormControl('', Validators.required),
    id_classe:      new FormControl('', Validators.required),
    sexe:           new FormControl<'M' | 'F' | ''>(''),
    date_naissance: new FormControl(''),
    matricule:      new FormControl(''),
    statut:         new FormControl<'actif' | 'archive'>('actif'),
  });

  ngOnInit(): void {
    if (this.data.eleve) {
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
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    const eleve: Eleve = {
      id_eleve:         this.eleveId ?? `ELV-${Date.now()}`,
      id_famille:       this.data.famille.id_famille,
      id_classe:        this.form.value.id_classe!,
      nom:              this.form.value.nom!,
      prenom:           this.form.value.prenom!,
      date_naissance:   this.form.value.date_naissance ?? '',
      date_inscription: new Date().toISOString().split('T')[0],
      statut:           this.form.value.statut ?? 'actif',
      sexe:             this.form.value.sexe || undefined,
      matricule:        this.form.value.matricule || undefined,
    };
    if (this.isEdit) {
      await this.dataSvc.updateEleve(eleve);
    } else {
      await this.dataSvc.addEleve(eleve);
    }
    this.saving.set(false);
    this.snack.open(`Élève ${this.isEdit ? 'modifié' : 'ajouté'}`, 'OK', { duration: 3000 });
    this.dialogRef.close({ success: true, eleve });
  }
}