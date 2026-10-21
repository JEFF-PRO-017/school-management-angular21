
import { Component, Input, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../core/services';
import { DataServiceBase } from '../../../core/services/@data';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';



@Component({
  selector: 'app-reseaux',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FaIconComponent],
  template: `
    <div class="d-flex align-items-center gap-2 small text-muted">

      <!-- File d'attente : n'apparaît que s'il y a des opérations en attente -->
  @if (queueSize() > 0) {
    <div class="dropdown">
      <button class="btn btn-sm btn-warning-subtle border-0 d-flex align-items-center gap-1"
              data-bs-toggle="dropdown" title="{{ queueSize() }} opération(s) en attente">
        <fa-icon [icon]="icons.faClockRotateLeft"></fa-icon>
        {{ queueSize() }} en attente
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="min-width:240px">
        <li class="px-3 py-2">
          <div class="small fw-medium">File d'attente</div>
          <div class="small text-muted">{{ queueSize() }} opération(s) non synchronisée(s)</div>
        </li>
        <li>
          <button class="dropdown-item text-danger small d-flex align-items-center gap-2" (click)="viderQueue()">
            <fa-icon [icon]="icons.faTrash"></fa-icon> Vider la queue
          </button>
        </li>
      </ul>
    </div>
  }

          <!-- Rechargement des données -->
  <div class="dropdown">
    <button class="btn btn-sm btn-light border" data-bs-toggle="dropdown"
            [disabled]="data.reloading()" title="Données locales">
      @if (data.reloading()) {
        <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
      } @else {
        <fa-icon [icon]="icons.faArrowsRotate"></fa-icon>
      }
    </button>
    <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="min-width:260px">
      <li class="px-3 py-2">
        <div class="small fw-medium">Données locales</div>
        <div class="small text-muted">Forcer un rechargement depuis Google Sheets</div>
      </li>
      <li><button class="dropdown-item small" (click)="recharger()">Actualiser les données</button></li>
      <li><hr class="dropdown-divider"></li>
      <li><button class="dropdown-item text-danger small" (click)="invaliderEtRecharger()">Vider le cache + recharger</button></li>
    </ul>

    
  </div>

    <!-- Statut réseau : masqué sur mobile pour gagner de la place -->
  <div class="d-none d-md-flex align-items-center gap-1">
    <span class="rounded-circle" [class.bg-success]="online()" [class.bg-danger]="!online()"
          style="width:7px;height:7px"></span>
    <span class="small text-muted">{{ online() ? 'En ligne' : 'Hors ligne' }}</span>
  </div>

    </div>
  `,
})
export class ReseauxComponent {
  private auth = inject(AuthService);
  readonly data = inject(DataServiceBase);
  private queue = inject(SheetsQueueServiceService);

  // Icônes utilisées dans le template
  icons = { faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket };

  user = this.auth.user;
  online = signal(navigator.onLine);

  queueSize(): number { return this.queue.size(); }


  // ── Queue ─────────────────────────────────────────────────────────

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

  /** Recharge depuis Sheets sans vider le cache d'abord */
  async recharger(): Promise<void> {
    if (this.data.reloading()) return;
    this.data.reloading.set(true);
    try {
      await this.data.initAppData();
    } finally {
      this.data.reloading.set(false);
    }
  }


  /** Vide tout le cache local puis recharge depuis Sheets */
  async invaliderEtRecharger(): Promise<void> {
    if (!confirm(
      'Vider toutes les données locales et recharger depuis Google Sheets ?\n' +
      'La page se rechargera automatiquement.'
    )) return;
    if (this.data.reloading()) return;
    this.data.reloading.set(true);
    try {
      this.data.invalidateCache();
      await this.data.initAppData();
    } finally {
      this.data.reloading.set(false);
    }
  }

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

}