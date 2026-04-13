// bulletin-config.modal.ts
// Modal simple : titre éditable, trimestre, année, séquences sélectionnées.
// Ouvert depuis bulletins.component, retourne un BulletinConfig ou null.

import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BulletinConfig } from './bulletin.models';
import { Sequence, SEQUENCES } from '../../../core/models';

@Component({
  selector: 'app-bulletin-config-modal',
  standalone: true,
  imports: [FormsModule, MatDialogModule],
  template: `
<div class="bcm">
  <div class="bcm-head">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/>
      <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
    Configuration du bulletin
  </div>

  <!-- Titre -->
  <div class="bcm-field">
    <label class="bcm-label">Titre du bulletin</label>
    <input class="bcm-input" [(ngModel)]="cfg.titre" placeholder="BULLETIN TRIMESTRIEL 1">
  </div>

  <!-- Trimestre -->
  <div class="bcm-field">
    <label class="bcm-label">Trimestre</label>
    <div class="bcm-pills">
      @for (t of [1,2,3]; track t) {
        <button class="bcm-pill" [class.bcm-pill--on]="cfg.trimestre === t" (click)="cfg.trimestre = t">
          Trimestre {{ t }}
        </button>
      }
    </div>
  </div>

  <!-- Année scolaire -->
  <div class="bcm-field">
    <label class="bcm-label">Année scolaire</label>
    <input class="bcm-input" [(ngModel)]="cfg.annee" placeholder="2025-2026" style="width:120px">
  </div>

  <!-- Séquences -->
  <div class="bcm-field">
    <label class="bcm-label">Séquences incluses</label>
    <div class="bcm-pills">
      @for (s of sequences; track s) {
        <button class="bcm-pill" [class.bcm-pill--on]="cfg.sequences.includes(s)"
                (click)="toggleSeq(s)">{{ s }}</button>
      }
    </div>
    @if (cfg.sequences.length === 0) {
      <span class="bcm-warn">Sélectionnez au moins une séquence</span>
    }
  </div>

  <!-- Actions -->
  <div class="bcm-actions">
    <button class="bcm-btn bcm-btn--ghost" (click)="annuler()">Annuler</button>
    <button class="bcm-btn bcm-btn--primary" [disabled]="!valide()" (click)="confirmer()">
      Appliquer
    </button>
  </div>
</div>
  `,
  styles: [`
    .bcm { display: flex; flex-direction: column; gap: 16px; padding: 20px; min-width: 380px; }
    .bcm-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
    .bcm-field { display: flex; flex-direction: column; gap: 6px; }
    .bcm-label { font-size: 11px; color: #888; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
    .bcm-input { height: 32px; padding: 0 10px; border: 0.5px solid rgba(0,0,0,.18); border-radius: 6px; font-size: 13px; width: 100%; }
    .bcm-input:focus { outline: none; border-color: #185FA5; }
    .bcm-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .bcm-pill { height: 28px; padding: 0 12px; border: 0.5px solid rgba(0,0,0,.15); border-radius: 99px; font-size: 12px; cursor: pointer; background: white; color: #555; transition: all .1s; }
    .bcm-pill:hover { border-color: #185FA5; color: #185FA5; }
    .bcm-pill--on { background: #185FA5; border-color: #185FA5; color: #fff; }
    .bcm-warn { font-size: 11px; color: #993C1D; }
    .bcm-actions { display: flex; justify-content: flex-end; gap: 8px; border-top: 0.5px solid rgba(0,0,0,.08); padding-top: 12px; margin-top: 4px; }
    .bcm-btn { height: 32px; padding: 0 16px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: opacity .1s; }
    .bcm-btn--ghost { background: none; border: 0.5px solid rgba(0,0,0,.15); color: #555; }
    .bcm-btn--ghost:hover { background: rgba(0,0,0,.04); }
    .bcm-btn--primary { background: #185FA5; color: #fff; border: none; }
    .bcm-btn--primary:disabled { opacity: .35; cursor: default; }
    .bcm-btn--primary:not(:disabled):hover { opacity: .88; }
  `],
})
export class BulletinConfigModal {
  readonly sequences: Sequence[] = SEQUENCES;
  cfg: BulletinConfig;

  constructor(
    private ref: MatDialogRef<BulletinConfigModal>,
    @Inject(MAT_DIALOG_DATA) public data: BulletinConfig,
  ) {
    // Copie profonde pour ne pas muter les données avant confirmation
    this.cfg = { ...data, sequences: [...data.sequences] };
  }

  toggleSeq(s: Sequence): void {
    this.cfg.sequences = this.cfg.sequences.includes(s)
      ? this.cfg.sequences.filter(x => x !== s)
      : [...this.cfg.sequences, s].sort((a, b) => SEQUENCES.indexOf(a) - SEQUENCES.indexOf(b));
  }

  valide(): boolean { return this.cfg.sequences.length > 0 && !!this.cfg.titre; }
  confirmer(): void { this.ref.close(this.cfg); }
  annuler(): void   { this.ref.close(null); }
}