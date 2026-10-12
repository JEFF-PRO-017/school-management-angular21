import { computed, EventEmitter, inject, Injectable, Output, signal } from "@angular/core";
import { faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { titleApp } from "../../app.component";
import { DataServiceBase } from "./@data";
import { AuthService } from "./auth.service";
import { SheetsQueueServiceService } from "./sheets-queue.service";

@Injectable({ providedIn: 'root' })
export class OnOfflineService {
// @Output() toggleMenu = new EventEmitter<void>();

//   private auth = inject(AuthService);
  readonly data = inject(DataServiceBase);
  private queue = inject(SheetsQueueServiceService);


  online = signal(navigator.onLine);


  queueSize(): number { return this.queue.size(); }


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