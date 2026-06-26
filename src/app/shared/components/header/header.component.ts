// header.component.ts
import {
  Component, Output, EventEmitter, inject, signal, computed
} from '@angular/core';
import { MatMenuModule }   from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthService }               from '../../../core/services/auth.service';
import { DataService }               from '../../../core/services/data.service';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';
import { Section }                   from '../../../core/models/last_index';
import { titleApp } from '../../../app.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule],
  styles: [`
    :host { display:block; }

    .hd { height:52px; display:flex; align-items:center; gap:10px;
          padding:0 20px; background:white;
          border-bottom:0.5px solid rgba(0,0,0,.08); flex-shrink:0; }

    /* Logo + hamburger mobile */
    .hd-logo   { display:none; align-items:center; gap:7px; }
    .hd-logo-icon { width:26px; height:26px; background:#185FA5; border-radius:7px;
                    display:flex; align-items:center; justify-content:center; }
    .hd-logo-text { font-size:13px; font-weight:600; color:#111; }
    .hd-burger { display:none; width:34px; height:34px; border:none;
                 background:none; cursor:pointer; border-radius:7px;
                 color:#555; align-items:center; justify-content:center; padding:0; }
    .hd-burger:hover { background:rgba(0,0,0,.05); }

    .hd-spacer { flex:1; }

    /* Bascule section */
    .hd-section   { display:flex; background:#f3f4f6; border-radius:8px;
                     padding:3px; gap:2px; }
    .hd-sect-btn  { height:26px; padding:0 12px; border:none; border-radius:6px;
                     font-size:11px; font-weight:500; cursor:pointer;
                     background:transparent; color:#888; transition:all .15s; }
    .hd-sect-btn--on { background:white; color:#185FA5;
                        box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .hd-sect-btn:not(.hd-sect-btn--on):hover { color:#555; }
    .hd-sect-badge { height:26px; padding:0 10px; border-radius:6px;
                      font-size:11px; font-weight:500;
                      background:#EBF3FC; color:#185FA5;
                      border:0.5px solid #B5D4F4;
                      display:flex; align-items:center; }

    /* Queue */
    .hd-queue { display:flex; align-items:center; gap:5px;
                height:26px; padding:0 10px; border-radius:6px;
                background:#FAEEDA; color:#633806;
                border:0.5px solid #FAC775;
                font-size:11px; font-weight:500; cursor:pointer;
                position:relative; }
    .hd-queue:hover { background:#FAE0B0; }

    /* Statut réseau */
    .hd-net     { display:flex; align-items:center; gap:5px; }
    .hd-dot     { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .hd-dot--on { background:#22c55e; }
    .hd-dot--off{ background:#ef4444; }
    .hd-net-txt { font-size:11px; color:#9ca3af; }

    /* Spinner rechargement */
    .hd-spinner { width:13px; height:13px; border-radius:50%;
                  border:2px solid rgba(24,95,165,.2);
                  border-top-color:#185FA5;
                  animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }

    /* Bouton rechargement */
    .hd-reload { width:32px; height:32px; border:0.5px solid rgba(0,0,0,.12);
                 background:white; cursor:pointer; border-radius:7px;
                 display:flex; align-items:center; justify-content:center;
                 color:#555; transition:all .15s; }
    .hd-reload:hover { background:#EBF3FC; color:#185FA5; border-color:#B5D4F4; }
    .hd-reload:disabled { opacity:.4; cursor:default; }

    /* Avatar */
    .hd-av { width:32px; height:32px; border-radius:50%;
             background:#EBF3FC; color:#0C447C;
             font-size:11px; font-weight:600;
             border:none; cursor:pointer; flex-shrink:0; }
    .hd-av:hover { background:#B5D4F4; }

    /* Menu */
    .hd-menu-info { padding:10px 14px 9px;
                    border-bottom:0.5px solid rgba(0,0,0,.08);
                    min-width:170px; }
    .hd-menu-nom  { font-size:13px; font-weight:500; color:#111; }
    .hd-menu-role { font-size:11px; color:#9ca3af; text-transform:capitalize;
                    margin-top:1px; }
    .hd-menu-sep  { height:0.5px; background:rgba(0,0,0,.06); margin:4px 0; }
    .hd-menu-danger { color:#A32D2D !important; }

    @media (max-width: 767px) {
      .hd-logo   { display:flex; }
      .hd-burger { display:flex; }
      .hd-net-txt { display:none; }
    }
  `],
  template: `
<header class="hd">

  <!-- Logo + burger (mobile) -->
  <div class="hd-logo">
    <div class="hd-logo-icon">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L1 5v6l7 4 7-4V5L8 1z" stroke="white"
              stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
    </div>
    <span class="hd-logo-text">{{ titleApp }}</span>
  </div>
  <button class="hd-burger" (click)="toggleMenu.emit()">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>

  <div class="hd-spacer"></div>

  <!-- Bascule section (admin) -->
  @if (isAdmin()) {
    <div class="hd-section">
      <button class="hd-sect-btn"
              [class.hd-sect-btn--on]="section() === 'primaire'"
              (click)="setSection('primaire')">Primaire</button>
      <button class="hd-sect-btn"
              [class.hd-sect-btn--on]="section() === 'secondaire'"
              (click)="setSection('secondaire')">Secondaire</button>
    </div>
  } @else {
    <div class="hd-sect-badge">
      {{ section() === 'primaire' ? 'Primaire' : 'Secondaire' }}
    </div>
  }

  <!-- Queue — cliquable → menu -->
  @if (queueSize() > 0) {
    <button class="hd-queue" [matMenuTriggerFor]="queueMenu"
            title="{{ queueSize() }} opération(s) en attente">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v4l3 3M13.5 8A5.5 5.5 0 112.5 8"
              stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      {{ queueSize() }} en attente
    </button>

    <mat-menu #queueMenu="matMenu">
      <div style="padding:10px 14px 8px;border-bottom:0.5px solid rgba(0,0,0,.08);
                  min-width:220px">
        <div style="font-size:13px;font-weight:500">File d'attente</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">
          {{ queueSize() }} opération(s) non synchronisée(s)
        </div>
      </div>
      <button mat-menu-item (click)="viderQueue()">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
             style="margin-right:8px;vertical-align:middle">
          <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
                stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span style="color:#A32D2D">Vider la queue</span>
      </button>
    </mat-menu>
  }

  <!-- Bouton rechargement données -->
  <button class="hd-reload" [matMenuTriggerFor]="dataMenu"
          [disabled]="reloading()"
          title="Données locales">
    @if (reloading()) {
      <span class="hd-spinner"></span>
    } @else {
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 8A5.5 5.5 0 112.6 5M2 2v4h4"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    }
  </button>

  <mat-menu #dataMenu="matMenu">
    <div style="padding:10px 14px 8px;border-bottom:0.5px solid rgba(0,0,0,.08);
                min-width:240px">
      <div style="font-size:13px;font-weight:500">Données locales</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">
        Forcer un rechargement depuis Google Sheets
      </div>
    </div>
    <button mat-menu-item (click)="recharger()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
           style="margin-right:8px;vertical-align:middle">
        <path d="M13.5 8A5.5 5.5 0 112.6 5M2 2v4h4"
              stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Actualiser les données
    </button>
    <div class="hd-menu-sep"></div>
    <button mat-menu-item (click)="invaliderEtRecharger()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
           style="margin-right:8px;vertical-align:middle">
        <path d="M8 2L1 13h14L8 2z" stroke="#A32D2D"
              stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M8 6v4M8 11v.5" stroke="#A32D2D"
              stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      <span style="color:#A32D2D">Vider le cache + recharger</span>
    </button>
  </mat-menu>

  <!-- Statut réseau -->
  <div class="hd-net">
    <span class="hd-dot"
          [class.hd-dot--on]="online"
          [class.hd-dot--off]="!online"></span>
    <span class="hd-net-txt">{{ online ? 'En ligne' : 'Hors ligne' }}</span>
  </div>

  <!-- Avatar + menu utilisateur -->
  <button class="hd-av" [matMenuTriggerFor]="userMenu">
    {{ initiales() }}
  </button>

  <mat-menu #userMenu="matMenu">
    <div class="hd-menu-info">
      <div class="hd-menu-nom">{{ user()?.nom }}</div>
      <div class="hd-menu-role">{{ user()?.role }}</div>
    </div>
    <button mat-menu-item (click)="logout()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
           style="margin-right:8px;vertical-align:middle">
        <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"
              stroke="currentColor" stroke-width="1.3"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Déconnexion
    </button>
  </mat-menu>

</header>
  `
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  private auth   = inject(AuthService);
  private data   = inject(DataService);
  private queue  = inject(SheetsQueueServiceService);
  titleApp = titleApp;

  user      = this.auth.user;
  isAdmin   = this.auth.isAdmin;
  online    = navigator.onLine;
  reloading = signal(false);

  section = computed(() => this.auth.getSectionActive());

  initiales = computed(() =>
    (this.user()?.nom ?? '')
      .split(' ').map((w: string) => w[0] ?? '')
      .join('').toUpperCase().slice(0, 2)
  );

  queueSize(): number { return this.queue.size(); }

  setSection(s: Section): void { this.auth.setSection(s); }
  logout():               void { this.auth.logout(); }

  // ── Queue ─────────────────────────────────────────────────────────

  viderQueue(): void {
    if (!confirm(
      `Vider ${this.queue.size()} opération(s) en attente ?\n` +
      `Ces modifications ne seront PAS envoyées à Google Sheets.`
    )) return;
    this.queue.clearQueue();
  }

  // ── Données ───────────────────────────────────────────────────────

  /** Recharge depuis Sheets sans vider le cache d'abord */
  async recharger(): Promise<void> {
    if (this.reloading()) return;
    this.reloading.set(true);
    try {
      await this.data.initAppData();
    } finally {
      this.reloading.set(false);
    }
  }

  /** Vide tout le cache local puis recharge depuis Sheets */
  async invaliderEtRecharger(): Promise<void> {
    if (!confirm(
      'Vider toutes les données locales et recharger depuis Google Sheets ?\n' +
      'La page se rechargera automatiquement.'
    )) return;
    if (this.reloading()) return;
    this.reloading.set(true);
    try {
      // 1. Invalide tous les signaux du cache
      this.data.invalidateCache();
      // 2. Recharge depuis Sheets
      await this.data.initAppData();
    } finally {
      this.reloading.set(false);
    }
  }

  constructor() {
    window.addEventListener('online',  () => { this.online = true;  });
    window.addEventListener('offline', () => { this.online = false; });
  }
}