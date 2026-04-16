// ─────────────────────────────────────────────────────────────────
// paiement-modal.component.ts
// Modal paiement pension — template bulletins (bl-*)
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, computed, Inject, OnInit
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Famille, Paiement, ModePaiement } from '../../../core/models';
import { RecuService } from '../recu.service';

export interface PaiementModalData {
  famille: Famille;
  totalVerse: number;
  montantAttendu: number;
}

@Component({
  selector: 'app-paiement-modal',
  standalone: true,
  providers: [provideNgxMask()],
  imports: [ReactiveFormsModule, MatDialogModule, NgxMaskDirective],
  styles: [`
    /* ── Dialogue shell identique à BulletinConfigModal ── */
    .bl-modal-host { display:flex; flex-direction:column; gap:0;
                     font-size:13px; width:100%; max-width:460px; }

    /* En-tête */
    .bl-modal-head { display:flex; align-items:flex-start;
                     justify-content:space-between;
                     padding:14px 18px 12px;
                     border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-modal-title { font-size:14px; font-weight:500; }
    .bl-modal-sub   { font-size:11px; color:#888; margin-top:2px; }

    /* Barre progression — même style que bl-bar */
    .bl-prog-wrap  { padding:0 18px 12px;
                     border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-prog-track { height:4px; border-radius:2px; background:#f0f0f0;
                     overflow:hidden; margin-top:8px; }
    .bl-prog-fill  { height:100%; border-radius:2px;
                     background:#0F6E56; transition:width .3s; }
    .bl-prog-labels{ display:flex; justify-content:space-between;
                     font-size:10px; margin-top:4px; }

    /* Stats rapides — même style que bl-th--trim */
    .bl-stats      { display:grid; grid-template-columns:1fr 1fr 1fr;
                     gap:6px; padding:12px 18px;
                     border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-stat       { background:#f8f8f8; border-radius:6px;
                     padding:7px 10px; }
    .bl-stat-v     { font-size:14px; font-weight:500; color:#333; }
    .bl-stat-l     { font-size:9px; color:#aaa; margin-top:1px; }

    /* Corps formulaire */
    .bl-modal-body { padding:14px 18px;
                     display:flex; flex-direction:column; gap:11px; }

    /* Champ — reprend le style bl-select / bl-input */
    .bl-field label { font-size:11px; color:#888;
                      display:block; margin-bottom:3px; }
    .bl-field-input {
      width:100%; height:32px; padding:0 10px; font-size:13px;
      border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
      background:white; outline:none; color:#333;
      transition:border-color .15s;
    }
    .bl-field-input:focus { border-color:#185FA5; }
    .bl-field-input.big   { height:44px; font-size:20px;
                             font-weight:500; padding:0 60px 0 10px;
                             letter-spacing:.01em; }
    .bl-field-input.invalid { border-color:#A32D2D; }
    .bl-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

    /* Toggle mode paiement — même style que chips */
    .bl-mode-btn { flex:1; height:32px; border-radius:6px; font-size:12px;
                   cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                   background:white; color:#555; transition:all .12s; }
    .bl-mode-btn.on { background:#EBF3FC; color:#185FA5;
                       border-color:#B5D4F4; font-weight:500; }

    /* RDV inline — comme bl-mention--warn */
    .bl-rdv { display:flex; align-items:center; gap:8px;
              background:#FAEEDA; border-radius:6px;
              padding:7px 11px; border:0.5px solid rgba(0,0,0,.06); }
    .bl-rdv-lbl { font-size:11px; color:#633806;
                  font-weight:500; white-space:nowrap; }
    .bl-rdv input { flex:1; border:none; background:transparent;
                    font-size:12px; color:#633806;
                    font-weight:500; outline:none; min-width:0; }

    /* Preview solde */
    .bl-preview { background:#f8f8f8; border-radius:6px;
                  padding:9px 12px;
                  display:flex; justify-content:space-between;
                  align-items:center; }
    .bl-preview-lbl { font-size:11px; color:#888; }
    .bl-preview-val { font-size:13px; font-weight:500; margin-top:2px; }

    /* Pied modal — même que bl-foot */
    .bl-modal-foot { display:flex; justify-content:space-between;
                     align-items:center; padding:10px 18px 14px;
                     border-top:0.5px solid rgba(0,0,0,.09); }
    .bl-foot-hint  { font-size:10px; color:#aaa;
                     display:flex; align-items:center; gap:4px; }

    /* Boutons — identiques bulletins */
    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              transition:opacity .1s; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn--outline { background:white; color:#333;
                       border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }
    .bl-close { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
                background:white; border-radius:5px; cursor:pointer;
                display:flex; align-items:center; justify-content:center;
                color:#555; flex-shrink:0; }
    .bl-close:hover { background:#FCEBEB; color:#A32D2D;
                       border-color:#F09595; }
    .bl-spinner { width:13px; height:13px; border-radius:50%;
                  border:2px solid rgba(255,255,255,.3);
                  border-top-color:#fff;
                  animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
  template: `
<div class="bl-modal-host">

  <!-- ── En-tête ── -->
  <div class="bl-modal-head">
    <div>
      <div class="bl-modal-title">
        Paiement pension — {{ data.famille.nom_famille }}
      </div>
      <div class="bl-modal-sub">{{ anneeScolaire }}</div>
    </div>
    <button class="bl-close" mat-dialog-close>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- ── Barre progression ── -->
  <div class="bl-prog-wrap">
    <div class="bl-prog-track">
      <div class="bl-prog-fill" [style.width.%]="progressionBase"></div>
    </div>
    <div class="bl-prog-labels">
      <span style="color:#0F6E56">{{ fmt(data.totalVerse) }} FCFA versés</span>
      <span style="color:#aaa">{{ fmt(data.montantAttendu) }} FCFA attendus</span>
    </div>
  </div>

  <!-- ── Stats rapides ── -->
  <div class="bl-stats">
    <div class="bl-stat">
      <div class="bl-stat-v">{{ fmt(data.montantAttendu) }}</div>
      <div class="bl-stat-l">Attendu</div>
    </div>
    <div class="bl-stat">
      <div class="bl-stat-v" style="color:#0F6E56">{{ fmt(data.totalVerse) }}</div>
      <div class="bl-stat-l">Versé</div>
    </div>
    <div class="bl-stat">
      <div class="bl-stat-v"
           [style.color]="restantBase > 0 ? '#993C1D' : '#0F6E56'">
        {{ fmt(restantBase) }}
      </div>
      <div class="bl-stat-l">Restant</div>
    </div>
  </div>

  <!-- ── Corps ── -->
  <div class="bl-modal-body">
    <form [formGroup]="form">

      <!-- Montant — ngx-mask -->
      <div class="bl-field">
        <label>Montant (FCFA)</label>
        <div style="position:relative">
          <input class="bl-field-input big"
                 [class.invalid]="form.controls.montant_verse.invalid
                               && form.controls.montant_verse.touched"
                 formControlName="montant_verse"
                 mask="separator.0" thousandSeparator=" "
                 separatorLimit="10000000"
                 [dropSpecialCharacters]="true"
                 placeholder="0">
          <span style="position:absolute;right:11px;top:50%;
                       transform:translateY(-50%);
                       font-size:12px;color:#aaa;pointer-events:none">
            FCFA
          </span>
        </div>
        @if (form.controls.montant_verse.invalid
          && form.controls.montant_verse.touched) {
          <span style="font-size:10px;color:#A32D2D">Montant requis</span>
        }
      </div>

      <!-- Mode paiement toggle -->
      <div class="bl-field">
        <label>Mode de paiement</label>
        <div style="display:flex;gap:8px">
          @for (m of modes; track m.value) {
            <button type="button" class="bl-mode-btn"
              [class.on]="form.controls.mode_paiement.value === m.value"
              (click)="form.controls.mode_paiement.setValue(m.value)">
              {{ m.label }}
            </button>
          }
        </div>
      </div>

      <!-- Date + Période -->
      <div class="bl-grid2">
        <div class="bl-field">
          <label>Date du versement</label>
          <input type="date" class="bl-field-input"
                 formControlName="date_paiement">
        </div>
        <div class="bl-field">
          <label>Période concernée</label>
          <input class="bl-field-input" formControlName="periode_concernee"
                 placeholder="ex: Avril 2026">
        </div>
      </div>

      <!-- Prochain RDV — badge orange éditable -->
      <div class="bl-field">
        <label>Prochain rendez-vous</label>
        <div class="bl-rdv">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="2"
                  stroke="#633806" stroke-width="1.3"/>
            <path d="M5 1v3M11 1v3M2 7h12"
                  stroke="#633806" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span class="bl-rdv-lbl">Prochain RDV</span>
          <input type="date" formControlName="date_prochain_rdv">
        </div>
      </div>

      <!-- Notes caissier -->
      <div class="bl-field">
        <label>Notes caissier</label>
        <input class="bl-field-input" formControlName="notes_caissier"
               placeholder="Remarques éventuelles…">
      </div>

      <!-- Preview solde après versement -->
      @if (montantSaisi() > 0) {
        <div class="bl-preview">
          <div>
            <div class="bl-preview-lbl">Après ce versement</div>
            <div class="bl-preview-val"
                 [style.color]="apresVersement() <= 0 ? '#0F6E56' : '#993C1D'">
              @if (apresVersement() <= 0) { Solde soldé ✓ }
              @else { {{ fmt(apresVersement()) }} FCFA restants }
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;color:#aaa">N° reçu</div>
            <div style="font-size:11px;font-weight:500;
                        font-family:monospace;color:#333">
              {{ recuNumero }}
            </div>
          </div>
        </div>
      }

    </form>
  </div>

  <!-- ── Pied ── -->
  <div class="bl-modal-foot">
    <div class="bl-foot-hint">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h10v13l-2-1.5L9 15l-2-1.5L5 15l-2-1.5V2z"
              stroke="currentColor" stroke-width="1.3"/>
      </svg>
      Reçu PDF généré automatiquement
    </div>
    <div style="display:flex;gap:8px">
      <button class="bl-btn bl-btn--outline" mat-dialog-close>Annuler</button>
      <button class="bl-btn bl-btn--primary"
              (click)="save()" [disabled]="form.invalid || saving()">
        @if (saving()) { <span class="bl-spinner"></span> }
        {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </div>
  </div>

</div>
  `
})
export class PaiementModalComponent implements OnInit {

  readonly data = inject<PaiementModalData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PaiementModalComponent>);
  private cache = inject(CacheService);
  private dataSvc = inject(DataService);
  private recuSvc = inject(RecuService);
  private snack = inject(MatSnackBar);

  saving = signal(false);
  recuNumero = `RCU-${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
  anneeScolaire = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  modes: { value: ModePaiement; label: string }[] = [
    { value: 'cash', label: '💵 Espèces' },
    { value: 'mobile', label: '📱 Mobile Money' },
  ];

  form = new FormGroup({
    montant_verse: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    mode_paiement: new FormControl<ModePaiement>('cash'),
    date_paiement: new FormControl(new Date().toISOString().split('T')[0]),
    periode_concernee: new FormControl(''),
    date_prochain_rdv: new FormControl(''),
    notes_caissier: new FormControl(''),
  });

  get progressionBase(): number {
    if (this.data.montantAttendu <= 0) return 100;
    return Math.min(100, Math.round((this.data.totalVerse / this.data.montantAttendu) * 100));
  }

  get restantBase(): number { return Math.max(0, this.data.montantAttendu - this.data.totalVerse); }

  montantSaisi(){return this.toNum(this.form.controls.montant_verse.value);}
  apresVersement(){return this.data.montantAttendu - this.data.totalVerse - this.montantSaisi();}

  ngOnInit(): void {
    const rdv = (this.cache.getPaiements?.() ?? [])
      .filter(p => p.id_famille === this.data.famille.id_famille)
      .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement))
      .find(p => p.date_prochain_rdv)?.date_prochain_rdv;
    if (rdv) this.form.controls.date_prochain_rdv.setValue(rdv);
  }

  async save(): Promise<void> {
    debugger
    if (this.form.invalid) return;
    this.saving.set(true);
    const p: Paiement = {
      id_paiement: `PAY-${Date.now()}`,
      id_famille: this.data.famille.id_famille,
      montant_verse: this.montantSaisi(),
      date_paiement: this.form.value.date_paiement!,
      mode_paiement: this.form.value.mode_paiement!,
      periode_concernee: this.form.value.periode_concernee ?? '',
      date_prochain_rdv: this.form.value.date_prochain_rdv || undefined,
      recu_numero: this.recuNumero,
      notes_caissier: this.form.value.notes_caissier || undefined,
      statut_alerte_whatsapp: 'EN_ATTENTE',
    };
    await this.dataSvc.addPaiement(p);
    // this.recuSvc.generer(p, this.data.famille,
    //   this.data.totalVerse + this.montantSaisi(), this.data.montantAttendu);
    this.saving.set(false);
    this.snack.open(`Paiement enregistré — ${p.recu_numero}`, 'OK', { duration: 4000 });
    this.dialogRef.close({ success: true, paiement: p });
  }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }
  // ── Helpers lecture montants (ngx-mask → string → number) ──
  // dropSpecialCharacters:true retire les espaces → "25000" pas "25 000"
  toNum(v: string | number | null | undefined): number {
    const n = +(v ?? 0);
    return isNaN(n) ? 0 : n;
  }
}