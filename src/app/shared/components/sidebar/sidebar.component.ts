// sidebar.component.ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

// Définition des liens — maintenable sans toucher au template
interface NavLink { label: string; route: string; icon: string; }
interface NavSection { title: string; links: NavLink[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
<nav class="sb">

  <!-- Logo -->
  <div class="sb-logo">
    <div class="sb-logo-icon">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L1 5v6l7 4 7-4V5L8 1z" stroke="#E6F1FB" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
    </div>
    <div>
      <div class="sb-logo-text">EcoleApp</div>
      <div class="sb-logo-sub">Gestion scolaire</div>
    </div>
  </div>

  <!-- Navigation -->
  <div class="sb-nav">

    <!-- Tableau de bord — tous les rôles -->
    <a routerLink="/dashboard" routerLinkActive="sb-link--active" class="sb-link">
      <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
      </svg>
      Tableau de bord
    </a>

    @if (isAdmin()) {
      <div class="sb-section">Référentiels</div>

      <a routerLink="/familles"  routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="5" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
          <path d="M1 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5M8 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Familles
      </a>
      <a routerLink="/eleves"    routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/>
          <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Élèves
      </a>
      <a routerLink="/classes"   routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
          <path d="M5 8h6M5 5h3M5 11h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Classes
      </a>
      <a routerLink="/frais"     routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M5 7h2M5 10h4M10 7h1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Frais
      </a>

      <div class="sb-section">Transactions</div>
    }

    @if (canPaiements()) {
      <a routerLink="/paiements"    routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <path d="M2 5h12M4 2h8M3 8l1 6h8l1-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Paiements
      </a>
      <a routerLink="/insolvables"  routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L1 13h14L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Insolvables
      </a>
    }

    @if (canNotes()) {
      @if (isAdmin()) { <div class="sb-section">Pédagogie</div> }
      <a routerLink="/notes"           routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <path d="M3 12V5l5-3 5 3v7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="6" y="8" width="4" height="4" rx=".5" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        Notes
      </a>
      <a routerLink="/notes/bulletins" routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Bulletins
      </a>
    }

    @if (isAdmin()) {
      <div class="sb-section">Communication</div>
      <a routerLink="/whatsapp" routerLinkActive="sb-link--active" class="sb-link">
        <svg class="sb-icon" viewBox="0 0 16 16" fill="none">
          <path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        WhatsApp
      </a>
    }

  </div>

  <div class="sb-foot">v1.0.0</div>
</nav>
  `,
  styles: [`
    .sb {
      display: flex; flex-direction: column; height: 100%;
      padding: 12px 8px; overflow-y: auto;
      background: white;
      border-right: 0.5px solid rgba(0,0,0,.09);
    }
    .sb-logo {
      display: flex; align-items: center; gap: 8px;
      padding: 0 6px 12px; margin-bottom: 4px;
      border-bottom: 0.5px solid rgba(0,0,0,.07);
    }
    .sb-logo-icon {
      width: 28px; height: 28px; border-radius: 7px; background: #185FA5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sb-logo-text { font-size: 13px; font-weight: 500; }
    .sb-logo-sub  { font-size: 10px; color: #aaa; }
    .sb-nav { display: flex; flex-direction: column; gap: 1px; margin-top: 8px; flex: 1; }
    .sb-section {
      font-size: 10px; color: #bbb; padding: 10px 8px 4px;
      letter-spacing: .05em; text-transform: uppercase;
    }
    .sb-link {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 8px; border-radius: 6px;
      font-size: 12px; color: #666;
      text-decoration: none; transition: background .1s, color .1s;
    }
    .sb-link:hover { background: rgba(0,0,0,.04); color: #333; }
    .sb-link--active { background: #EBF3FC; color: #0C447C; font-weight: 500; }
    .sb-link--active .sb-icon { opacity: 1; }
    .sb-icon { width: 15px; height: 15px; flex-shrink: 0; opacity: .6; }
    .sb-foot {
      margin-top: auto; padding: 10px 8px 0;
      border-top: 0.5px solid rgba(0,0,0,.07);
      font-size: 11px; color: #ccc;
    }
  `],
})
export class SidebarComponent {
  private auth = inject(AuthService);
  isAdmin      = this.auth.isAdmin;
  canPaiements = () => this.auth.hasRole('admin', 'caissier');
  canNotes     = () => this.auth.hasRole('admin', 'enseignant');
}