// dashboard.component.ts
import { Component, inject, computed } from '@angular/core';
import { RouterLink }    from '@angular/router';
import { CacheService }  from '../../../core/services/cache.service';
import { AuthService }   from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
<div class="db">

  <!-- En-tête -->
  <div class="db-head">
    <span class="db-title">Tableau de bord</span>
    <span class="db-date">{{ today }}</span>
  </div>

  <!-- KPIs -->
  <div class="db-kpis">
    <div class="kpi">
      <div class="kpi-label">
        <span class="kpi-dot" style="background:#185FA5"></span>Élèves
      </div>
      <div class="kpi-val" style="color:#185FA5">{{ nbEleves() }}</div>
      <div class="kpi-sub">inscrits actifs</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">
        <span class="kpi-dot" style="background:#0F6E56"></span>Familles
      </div>
      <div class="kpi-val" style="color:#0F6E56">{{ nbFamilles() }}</div>
      <div class="kpi-sub">enregistrées</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">
        <span class="kpi-dot" style="background:#854F0B"></span>Insolvables
      </div>
      <div class="kpi-val" style="color:#854F0B">{{ nbInsolvables() }}</div>
      <div class="kpi-sub">élèves concernés</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">
        <span class="kpi-dot" style="background:#534AB7"></span>Classes
      </div>
      <div class="kpi-val" style="color:#534AB7">{{ nbClasses() }}</div>
      <div class="kpi-sub">actives</div>
    </div>
  </div>

  <!-- Actions rapides -->
  <div class="db-card">
    <div class="db-card-title">Actions rapides</div>
    <div class="db-actions">

      @if (canPaiements()) {
        <a routerLink="/paiements/nouveau" class="db-btn db-btn--primary">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          Nouveau paiement
        </a>
      }

      @if (isAdmin()) {
        <a routerLink="/eleves/nouveau" class="db-btn">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/>
            <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5M11 8v4M13 10h-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Nouvel élève
        </a>
        <a routerLink="/familles/nouveau" class="db-btn">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1 13c0-2.2 1.8-3.5 4-3.5 M8.5 13c0-2.2 1.8-3.5 4-3.5M12 8v4M14 10h-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Nouvelle famille
        </a>
      }

      @if (canNotes()) {
        <a routerLink="/notes" class="db-btn">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 12V5l5-3 5 3v7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="6" y="8" width="4" height="4" rx=".5" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          Saisir notes
        </a>
      }

      @if (canPaiements()) {
        <a routerLink="/insolvables" class="db-btn db-btn--warn">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L1 13h14L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Voir insolvables
        </a>
      }

    </div>
  </div>

</div>
  `,
  styles: [`
    .db { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
    .db-head {
      display: flex; justify-content: space-between; align-items: center;
    }
    .db-title { font-size: 16px; font-weight: 500; }
    .db-date  { font-size: 11px; color: #aaa; }

    /* KPIs */
    .db-kpis {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;
    }
    @media (max-width: 600px) {
      .db-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .kpi {
      background: rgba(0,0,0,.03); border-radius: 8px; padding: 12px;
    }
    .kpi-label {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: #999; margin-bottom: 4px;
    }
    .kpi-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    .kpi-val  { font-size: 24px; font-weight: 500; line-height: 1.1; }
    .kpi-sub  { font-size: 10px; color: #bbb; margin-top: 2px; }

    /* Card actions */
    .db-card {
      background: white; border: 0.5px solid rgba(0,0,0,.09);
      border-radius: 10px; padding: 14px;
    }
    .db-card-title { font-size: 12px; font-weight: 500; color: #888; margin-bottom: 10px; }
    .db-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .db-btn {
      height: 32px; padding: 0 13px; border-radius: 6px; font-size: 12px;
      display: inline-flex; align-items: center; gap: 6px;
      text-decoration: none; cursor: pointer;
      border: 0.5px solid rgba(0,0,0,.15);
      background: white; color: #333;
      transition: background .1s;
    }
    .db-btn:hover      { background: rgba(0,0,0,.04); }
    .db-btn--primary   { background: #185FA5; color: #E6F1FB; border-color: #185FA5; }
    .db-btn--primary:hover { opacity: .88; background: #185FA5; }
    .db-btn--warn      { background: #FAEEDA; color: #633806; border-color: #FAC775; }
  `],
})
export class DashboardComponent {
  private cache = inject(CacheService);
  private auth  = inject(AuthService);

  today = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });

  nbEleves      = computed(() => (this.cache.getEleves()   ?? []).filter(e => e.statut === 'actif').length);
  nbFamilles    = computed(() => (this.cache.getFamilles() ?? []).length);
  nbClasses     = computed(() => (this.cache.getClasses()  ?? []).length);
  nbInsolvables = computed(() => (this.cache.getSoldes()   ?? []).filter(s => s.statut_insolvable).length);

  isAdmin      = this.auth.isAdmin;
  canPaiements = () => this.auth.hasRole('admin', 'caissier');
  canNotes     = () => this.auth.hasRole('admin', 'enseignant');
}