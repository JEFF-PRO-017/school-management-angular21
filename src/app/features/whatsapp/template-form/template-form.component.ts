// template-form.component.ts — modal création/modification template WhatsApp
// Converti de route dédiée → MatDialog modal (style bl-*)
// Aperçu réactif via signal (pas de FormControl.value dans computed)
import {
  Component, inject, signal, computed, OnInit
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';

import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';
import { MsgTemplate } from '../../../core/models';
import { DataService } from '../../../core/services/data.service';

export interface TemplateModalData { template?: MsgTemplate; }

const VARIABLES = [
  { label: '{nom_eleve}', demo: 'Jean Dupont' },
  { label: '{montant}', demo: '25 000' },
  { label: '{date}', demo: 'janvier 2026' },
  { label: '{classe}', demo: '3ème B' },
  { label: '{nom_famille}', demo: 'Famille Dupont' },
  { label: '{rdv}', demo: '15 mai 2026' },
  { label: '{restant}', demo: '10 000' },
];

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  styles: [`
    .host  { display:flex; flex-direction:column; font-size:13px;
             width:100%; max-width:560px; }
    .head  { display:flex; align-items:center; justify-content:space-between;
             padding:13px 17px 11px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .body  { padding:14px 17px; display:flex; flex-direction:column; gap:11px;
             max-height:75vh; overflow-y:auto; }
    .foot  { display:flex; justify-content:flex-end; gap:8px;
             padding:10px 17px 13px; border-top:0.5px solid rgba(0,0,0,.09); }

    label  { font-size:11px; color:#888; display:block; margin-bottom:3px; }
    .fi    { width:100%; height:32px; padding:0 10px; font-size:13px;
             border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
             background:white; outline:none; color:#333; transition:border-color .15s; }
    .fi:focus { border-color:#185FA5; }
    .fi.err   { border-color:#A32D2D; }
    .fi-area  { width:100%; padding:8px 10px; font-size:12px; line-height:1.5;
                border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
                background:white; outline:none; color:#333; resize:vertical;
                min-height:90px; font-family:inherit; }
    .fi-area:focus { border-color:#185FA5; }
    .hint  { font-size:10px; color:#A32D2D; margin-top:2px; }

    .g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }

    /* Variables chips */
    .vars  { display:flex; flex-wrap:wrap; gap:5px; }
    .var   { font-size:10px; padding:2px 7px; border-radius:5px;
             background:#EBF3FC; color:#0C447C; cursor:pointer;
             border:none; font-family:monospace; transition:background .1s; }
    .var:hover { background:#B5D4F4; }

    /* Toggle actif */
    .tog     { width:30px; height:17px; border-radius:9px; background:#ccc;
               position:relative; cursor:pointer; transition:background .2s;
               display:inline-block; flex-shrink:0; }
    .tog.on  { background:#185FA5; }
    .tog::after { content:''; position:absolute; top:2px; left:2px; width:13px;
                  height:13px; background:white; border-radius:50%;
                  transition:transform .2s; }
    .tog.on::after { transform:translateX(13px); }

    /* Aperçu */
    .apercu { background:#f0fff4; border:0.5px solid #a8d5b5; border-radius:6px;
              padding:10px 12px; font-size:12px; line-height:1.6; color:#1a4a2a;
              white-space:pre-wrap; font-family:inherit; }

    /* Boutons */
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
      {{ isEdit ? 'Modifier le template' : 'Nouveau template WhatsApp' }}
    </span>
    <button class="close" mat-dialog-close>✕</button>
  </div>

  <div class="body">
    <form [formGroup]="form">

      <!-- Objet -->
      <div>
        <label>Objet (titre court) *</label>
        <input class="fi" [class.err]="fc.objet.invalid && fc.objet.touched"
               formControlName="objet" placeholder="ex: Rappel pension janvier">
        @if (fc.objet.invalid && fc.objet.touched) {
          <div class="hint">Requis</div>
        }
      </div>

      <!-- Type + Destinataire -->
      <div class="g2">
        <div>
          <label>Type de message *</label>
          <select class="fi" formControlName="type">
            <option value="rappel">Rappel paiement</option>
            <option value="rdv">Rendez-vous</option>
            <option value="bulletin">Bulletin</option>
            <option value="relance">Relance insolvable</option>
          </select>
        </div>
        <div>
          <label>Destinataire</label>
          <select class="fi" formControlName="destinataire">
            <option value="pere">Père uniquement</option>
            <option value="mere">Mère uniquement</option>
            <option value="les_deux">Père et mère</option>
          </select>
        </div>
      </div>

      <!-- Langue + Actif -->
      <div class="g2">
        <div>
          <label>Langue</label>
          <select class="fi" formControlName="langue">
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:18px">
          <div class="tog" [class.on]="actifSignal()"
               (click)="toggleActif()"></div>
          <span style="font-size:12px;color:#555">
            {{ actifSignal() ? 'Template actif' : 'Inactif' }}
          </span>
        </div>
      </div>

      <!-- Variables disponibles — clic pour insérer -->
      <div>
        <label>Variables disponibles (clic pour insérer dans le message)</label>
        <div class="vars">
          @for (v of VARIABLES; track v.label) {
            <button type="button" class="var"
                    (click)="insererVariable(v.label)">
              {{ v.label }}
            </button>
          }
        </div>
      </div>

      <!-- Contenu -->
      <div>
        <label>Contenu du message *</label>
        <textarea class="fi-area"
                  id="contenu-textarea"
                  [class.err]="fc.contenu.invalid && fc.contenu.touched"
                  formControlName="contenu"
                  placeholder="Bonjour {nom_famille}, le solde de {nom_eleve} est de {montant} FCFA…"
                  rows="5">
        </textarea>
        @if (fc.contenu.invalid && fc.contenu.touched) {
          <div class="hint">Le contenu est requis</div>
        }
      </div>

      <!-- Aperçu réactif -->
      @if (apercuSignal()) {
        <div>
          <label>Aperçu avec données de démonstration</label>
          <div class="apercu">{{ apercuSignal() }}</div>
        </div>
      }

    </form>
  </div>

  <div class="foot">
    <button class="btn" mat-dialog-close>Annuler</button>
    <button class="btn btn-p" (click)="save()"
            [disabled]="form.invalid || saving()">
      @if (saving()) { <span class="spinner"></span> }
      {{ saving() ? 'Enregistrement…' : (isEdit ? 'Modifier' : 'Créer template') }}
    </button>
  </div>

</div>
  `
})
export class TemplateFormComponent implements OnInit {

  readonly data = inject<TemplateModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TemplateFormComponent>);
  private snack = inject(MatSnackBar);
  private dataService = inject(DataService);


  readonly VARIABLES = VARIABLES;

  isEdit = false;
  saving = signal(false);
  private tplId: string | null = null;

  // Signal pour le toggle actif — évite FormControl.value dans computed()
  actifSignal = signal(true);

  form = new FormGroup({
    objet: new FormControl('', Validators.required),
    type: new FormControl('rappel'),
    destinataire: new FormControl('les_deux'),
    langue: new FormControl('fr'),
    contenu: new FormControl('', Validators.required),
  });
  get fc() { return this.form.controls; }

  // toSignal() — pont Observable → Signal pour que computed() réagisse aux frappes
  private contenuSignal = toSignal(this.form.controls.contenu.valueChanges, {
    initialValue: this.form.controls.contenu.value ?? ''
  });

  // Aperçu réactif : se recalcule automatiquement à chaque frappe
  apercuSignal = computed<string>(() => {
    const c = this.contenuSignal() ?? '';
    if (!c.trim()) return '';
    return VARIABLES.reduce(
      (s, v) => s.replaceAll(v.label, v.demo),
      c
    );
  });

  ngOnInit(): void {
    const t = this.data?.template;
    if (!t) return;
    this.isEdit = true;
    this.tplId = t.id_template;
    this.form.patchValue({
      objet: t.objet,
      type: t.type,
      destinataire: t.destinataire,
      langue: t.langue,
      contenu: t.contenu,
    });
    this.actifSignal.set(!!t.actif);
  }

  toggleActif(): void { this.actifSignal.set(!this.actifSignal()); }

  /** Insère la variable à la position du curseur dans le textarea */
  insererVariable(variable: string): void {
    const el = document.getElementById('contenu-textarea') as HTMLTextAreaElement | null;
    if (!el) {
      // Fallback : ajoute à la fin
      const current = this.form.value.contenu ?? '';
      this.form.controls.contenu.setValue(current + variable);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value;
    const nouveau = val.slice(0, start) + variable + val.slice(end);
    this.form.controls.contenu.setValue(nouveau);
    // Replace le curseur après la variable insérée
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const tpl: MsgTemplate = {
      id_template: this.tplId ?? `TPL-${Date.now()}`,
      objet: this.form.value.objet!,
      type: this.form.value.type as any,
      destinataire: this.form.value.destinataire as any,
      langue: this.form.value.langue ?? 'fr',
      actif: this.actifSignal(),
      contenu: this.form.value.contenu!,
      variables_dynamiques: VARIABLES.map(v => v.label).join(','),
    };

    this.dataService.addTemplate(tpl); // ajoute au cache local immédiatement

    // this.queue.enqueue({ sheetName: 'F7_MSG_TEMPLATES', rowData: row }, 'addRow');

    this.saving.set(false);
    this.snack.open(
      this.isEdit ? 'Template modifié' : 'Template créé',
      'OK',
      { duration: 3000 }
    );
    this.dialogRef.close({ success: true, template: tpl });
  }
}