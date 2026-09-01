// header.component.ts — barre supérieure : statut réseau, actions rapides, compte
import { Component, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../core/services/auth.service';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';
import { titleApp } from '../../../app.component';
import { DataServiceBase } from '../../../core/services/@data/_data.base.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  private auth = inject(AuthService);
  private data = inject(DataServiceBase);
  private queue = inject(SheetsQueueServiceService);
  titleApp = titleApp;

  // Icônes utilisées dans le template
  icons = { faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket };

  user = this.auth.user;
  online = signal(navigator.onLine);
  reloading = signal(false);

  section = computed(() => this.auth.getSectionActive());

  // Initiales affichées dans l'avatar (2 premières lettres du nom)
  initiales = computed(() =>
    (this.user()?.nom ?? '')
      .split(' ').map((w: string) => w[0] ?? '')
      .join('').toUpperCase().slice(0, 2)
  );

  queueSize(): number { return this.queue.size(); }

  logout(): void { this.auth.logout(); }

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
      this.data.invalidateCache();
      await this.data.initAppData();
    } finally {
      this.reloading.set(false);
    }
  }

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}