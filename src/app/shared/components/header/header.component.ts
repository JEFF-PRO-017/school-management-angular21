// header.component.ts
import { Component, Output, EventEmitter, inject } from '@angular/core';
import { MatMenuModule }   from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { AuthService }               from '../../../core/services/auth.service';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule],
  template: `
<header class="hd">

  <!-- Logo (répété dans le header pour mobile, caché en desktop via CSS) -->
  <div class="hd-logo hd-logo--mobile">
    <div class="hd-logo-icon">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L1 5v6l7 4 7-4V5L8 1z" stroke="#E6F1FB" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
    </div>
    <span class="hd-logo-text">EcoleApp</span>
  </div>

  <!-- Hamburger — mobile uniquement -->
  <button class="hd-hamburger" (click)="toggleMenu.emit()" aria-label="Menu">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>

  <div class="hd-spacer"></div>

  <!-- Queue hors-ligne -->
  @if (queueSize() > 0) {
    <div class="hd-badge hd-badge--warn">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v4l3 3M13.5 8A5.5 5.5 0 112.5 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      {{ queueSize() }} en attente
    </div>
  }

  <!-- Statut réseau -->
  <div class="hd-status">
    <span class="hd-dot" [class.hd-dot--on]="online" [class.hd-dot--off]="!online"></span>
    <span class="hd-status-txt">{{ online ? 'En ligne' : 'Hors ligne' }}</span>
  </div>

  <!-- Avatar + menu utilisateur -->
  <button class="hd-avatar" [matMenuTriggerFor]="userMenu" aria-label="Menu utilisateur">
    {{ initiales() }}
  </button>

  <mat-menu #userMenu="matMenu">
    <div class="hd-menu-header">
      <div class="hd-menu-name">{{ user()?.nom }}</div>
      <div class="hd-menu-role">{{ user()?.role }}</div>
    </div>
    <button mat-menu-item (click)="logout()">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right:8px">
        <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Déconnexion
    </button>
  </mat-menu>

</header>
  `,
  styles: [`
    .hd {
      height: 48px; display: flex; align-items: center; gap: 10px;
      padding: 0 16px;
      background: var(--color-bg, white);
      border-bottom: 0.5px solid rgba(0,0,0,.09);
      flex-shrink: 0;
    }
    .hd-logo--mobile { display: none; align-items: center; gap: 7px; }
    .hd-logo-icon {
      width: 24px; height: 24px; background: #185FA5; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hd-logo-text { font-size: 13px; font-weight: 500; }
    .hd-hamburger {
      display: none; width: 32px; height: 32px; border: none; background: none;
      cursor: pointer; border-radius: 6px; color: var(--color-text, #333);
      align-items: center; justify-content: center; padding: 0;
    }
    .hd-hamburger:hover { background: rgba(0,0,0,.05); }
    .hd-spacer { flex: 1; }
    .hd-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; padding: 3px 9px; border-radius: 99px;
      border: 0.5px solid;
    }
    .hd-badge--warn {
      background: #FAEEDA; color: #633806; border-color: #FAC775;
    }
    .hd-status { display: flex; align-items: center; gap: 5px; }
    .hd-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .hd-dot--on  { background: #3B6D11; }
    .hd-dot--off { background: #E24B4A; }
    .hd-status-txt { font-size: 11px; color: #888; }
    .hd-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: #EBF3FC; color: #0C447C;
      font-size: 11px; font-weight: 500;
      border: none; cursor: pointer; flex-shrink: 0;
    }
    .hd-avatar:hover { background: #B5D4F4; }
    .hd-menu-header { padding: 10px 14px 8px; border-bottom: 0.5px solid rgba(0,0,0,.08); min-width: 180px; }
    .hd-menu-name  { font-size: 13px; font-weight: 500; }
    .hd-menu-role  { font-size: 11px; color: #888; text-transform: capitalize; }
    @media (max-width: 767px) {
      .hd-logo--mobile { display: flex; }
      .hd-hamburger    { display: flex; }
      .hd-status-txt   { display: none; }
    }
  `],
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  private auth  = inject(AuthService);
  private queue = inject(SheetsQueueServiceService);

  user   = this.auth.user;
  online = navigator.onLine;

  initiales = () => {
    const nom = this.user()?.nom ?? '';
    return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  queueSize(): number { return this.queue.size(); }
  logout(): void      { this.auth.logout(); }

  constructor() {
    window.addEventListener('online',  () => this.online = true);
    window.addEventListener('offline', () => this.online = false);
  }
}