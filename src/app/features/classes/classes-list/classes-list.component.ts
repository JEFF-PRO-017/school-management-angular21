// classes-list.component.ts — liste des classes avec effectifs
import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CacheService } from '../../../core/services/cache.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  imports: [
    RouterLink, MatTableModule, MatButtonModule,
    MatIconModule, MatTooltipModule, EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Classes ({{ classes().length }})</h5>
        <a routerLink="/classes/nouvelle" mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Nouvelle classe
        </a>
      </div>

      @if (classes().length === 0) {
        <app-empty-state icon="class" title="Aucune classe"></app-empty-state>
      } @else {
        <!-- Grille de cartes responsive -->
        <div class="row g-3">
          @for (c of classes(); track c.id_classe) {
            <div class="col-12 col-sm-6 col-lg-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body">
                  <div class="d-flex align-items-start justify-content-between">
                    <div>
                      <div class="fw-bold fs-6">{{ c.nom_classe }}</div>
                      <div class="text-muted small">{{ c.niveau }} · {{ c.cycle }}</div>
                      <div class="text-muted small">{{ c.annee_scolaire }}</div>
                    </div>
                    <span class="badge bg-primary rounded-pill">
                      {{ effectif(c.id_classe) }}/{{ c.effectif_max }}
                    </span>
                  </div>
                  <!-- Barre de remplissage -->
                  <div class="progress mt-3" style="height:6px">
                    <div class="progress-bar"
                         [style.width.%]="(effectif(c.id_classe) / c.effectif_max) * 100"
                         [class]="remplissageClass(c.id_classe, c.effectif_max)">
                    </div>
                  </div>
                </div>
                <div class="card-footer bg-white border-top-0 d-flex justify-content-end gap-1">
                  <a [routerLink]="['/classes', c.id_classe, 'modifier']"
                     mat-icon-button matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <a [routerLink]="['/eleves']" [queryParams]="{ classe: c.id_classe }"
                     mat-icon-button matTooltip="Voir les élèves" color="primary">
                    <mat-icon>people</mat-icon>
                  </a>
                </div>
              </div>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class ClassesListComponent {

  private cache = inject(CacheService);

  classes = computed(() => this.cache.getClasses() ?? []);

  effectif(id: string): number {
    return (this.cache.getEleves() ?? [])
      .filter(e => e.id_classe === id && e.statut === 'actif').length;
  }

  remplissageClass(id: string, max: number): string {
    const taux = this.effectif(id) / max;
    if (taux >= 1)   return 'bg-danger';
    if (taux >= 0.8) return 'bg-warning';
    return 'bg-success';
  }
}
