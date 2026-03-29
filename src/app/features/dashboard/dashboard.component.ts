// dashboard.component.ts — tableau de bord avec indicateurs clés
import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CacheService } from '../../core/services/cache.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="container-fluid px-0">

      <!-- Titre -->
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold text-primary mb-0">Tableau de bord</h4>
        <span class="text-muted small">{{ today }}</span>
      </div>

      <!-- Cartes indicateurs — grille responsive -->
      <div class="row g-3 mb-4">

        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <mat-icon class="text-primary">people</mat-icon>
                <span class="text-muted small">Élèves</span>
              </div>
              <div class="fs-3 fw-bold text-primary">{{ nbEleves() }}</div>
              <div class="text-muted small">inscrits actifs</div>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <mat-icon class="text-success">family_restroom</mat-icon>
                <span class="text-muted small">Familles</span>
              </div>
              <div class="fs-3 fw-bold text-success">{{ nbFamilles() }}</div>
              <div class="text-muted small">enregistrées</div>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <mat-icon class="text-warning">warning</mat-icon>
                <span class="text-muted small">Insolvables</span>
              </div>
              <div class="fs-3 fw-bold text-warning">{{ nbInsolvables() }}</div>
              <div class="text-muted small">élèves concernés</div>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <mat-icon class="text-info">class</mat-icon>
                <span class="text-muted small">Classes</span>
              </div>
              <div class="fs-3 fw-bold text-info">{{ nbClasses() }}</div>
              <div class="text-muted small">actives</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Actions rapides selon le rôle -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold">Actions rapides</div>
        <div class="card-body d-flex flex-wrap gap-2">

          @if (canPaiements()) {
            <a routerLink="/paiements/nouveau" mat-raised-button color="primary">
              <mat-icon>add</mat-icon> Nouveau paiement
            </a>
          }

          @if (isAdmin()) {
            <a routerLink="/eleves/nouveau" mat-stroked-button color="primary">
              <mat-icon>person_add</mat-icon> Nouvel élève
            </a>
            <a routerLink="/familles/nouveau" mat-stroked-button color="primary">
              <mat-icon>group_add</mat-icon> Nouvelle famille
            </a>
          }

          @if (canNotes()) {
            <a routerLink="/notes" mat-stroked-button color="accent">
              <mat-icon>grade</mat-icon> Saisir notes
            </a>
          }

          @if (canPaiements()) {
            <a routerLink="/insolvables" mat-stroked-button color="warn">
              <mat-icon>warning</mat-icon> Voir insolvables
            </a>
          }

        </div>
      </div>

    </div>
  `
})
export class DashboardComponent {

  private cache = inject(CacheService);
  private auth  = inject(AuthService);

  today = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });

  // Indicateurs calculés depuis le cache
  nbEleves     = computed(() => (this.cache.getEleves()   ?? []).filter(e => e.statut === 'actif').length);
  nbFamilles   = computed(() => (this.cache.getFamilles() ?? []).length);
  nbClasses    = computed(() => (this.cache.getClasses()  ?? []).length);
  nbInsolvables= computed(() => (this.cache.getSoldes()   ?? []).filter(s => s.statut_insolvable).length);

  isAdmin      = this.auth.isAdmin;
  canPaiements = () => this.auth.hasRole('admin', 'caissier');
  canNotes     = () => this.auth.hasRole('admin', 'enseignant');
}
