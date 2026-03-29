// eleves-list.component.ts — liste des élèves avec filtre classe et recherche
import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CacheService } from '../../../core/services/cache.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-eleves-list',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatTooltipModule, EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <!-- Titre + bouton ajout -->
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Élèves ({{ filtered().length }})</h5>
        <a routerLink="/eleves/nouveau" mat-raised-button color="primary">
          <mat-icon>person_add</mat-icon> Nouvel élève
        </a>
      </div>

      <!-- Filtres -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-6">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Rechercher</mat-label>
            <input matInput [formControl]="search">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Classe</mat-label>
            <mat-select [formControl]="filterClasse">
              <mat-option value="">Toutes</mat-option>
              @for (c of classes(); track c.id_classe) {
                <mat-option [value]="c.id_classe">{{ c.nom_classe }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Statut</mat-label>
            <mat-select [formControl]="filterStatut">
              <mat-option value="">Tous</mat-option>
              <mat-option value="actif">Actif</mat-option>
              <mat-option value="archive">Archivé</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Tableau -->
      @if (filtered().length === 0) {
        <app-empty-state icon="people" title="Aucun élève trouvé"></app-empty-state>
      } @else {
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="filtered()" class="w-100 mat-elevation-z0">

            <ng-container matColumnDef="nom">
              <th mat-header-cell *matHeaderCellDef>Élève</th>
              <td mat-cell *matCellDef="let e">
                <div class="fw-semibold">{{ e.nom }} {{ e.prenom }}</div>
                <div class="text-muted small">{{ e.famille?.nom_famille ?? '—' }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="classe">
              <th mat-header-cell *matHeaderCellDef>Classe</th>
              <td mat-cell *matCellDef="let e">
                <span class="badge bg-primary-subtle text-primary">
                  {{ e.classe?.nom_classe ?? '—' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="tel">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Contact</th>
              <td mat-cell *matCellDef="let e" class="d-none d-md-table-cell">
                {{ e.famille?.tel_pere ?? '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="solde">
              <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Solde</th>
              <td mat-cell *matCellDef="let e" class="d-none d-lg-table-cell">
                @if (getSolde(e.id_eleve); as s) {
                  <span [class]="s.statut_insolvable ? 'text-danger fw-semibold' : 'text-success'">
                    {{ s.reste_a_payer.toLocaleString() }} FCFA
                  </span>
                } @else { — }
              </td>
            </ng-container>

            <ng-container matColumnDef="statut">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Statut</th>
              <td mat-cell *matCellDef="let e" class="d-none d-md-table-cell">
                <span [class]="e.statut === 'actif'
                  ? 'badge bg-success-subtle text-success'
                  : 'badge bg-secondary-subtle text-secondary'">
                  {{ e.statut }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let e">
                <div class="d-flex justify-content-end gap-1">
                  <a [routerLink]="['/eleves', e.id_eleve, 'modifier']"
                     mat-icon-button matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <a [routerLink]="['/paiements']"
                     [queryParams]="{ eleve: e.id_eleve }"
                     mat-icon-button matTooltip="Paiements" color="accent">
                    <mat-icon>payments</mat-icon>
                  </a>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      }

    </div>
  `
})
export class ElevesListComponent {

  private cache = inject(CacheService);

  cols = ['nom', 'classe', 'tel', 'solde', 'statut', 'actions'];

  search       = new FormControl('');
  filterClasse = new FormControl('');
  filterStatut = new FormControl('actif');

  classes = computed(() => this.cache.getClasses() ?? []);

  // Liste enrichie filtrée — tout calculé en mémoire depuis le cache
  filtered = computed(() => {
    const q       = (this.search.value ?? '').toLowerCase();
    const classe  = this.filterClasse.value ?? '';
    const statut  = this.filterStatut.value ?? '';
    const fMap    = this.cache.famillesMap();
    const cMap    = this.cache.classesMap();

    return (this.cache.getEleves() ?? [])
      .filter(e => !statut || e.statut === statut)
      .filter(e => !classe || e.id_classe === classe)
      .filter(e => {
        if (!q) return true;
        const nom  = `${e.nom} ${e.prenom}`.toLowerCase();
        const fam  = fMap.get(e.id_famille)?.nom_famille?.toLowerCase() ?? '';
        return nom.includes(q) || fam.includes(q);
      })
      .map(e => ({
        ...e,
        famille: fMap.get(e.id_famille),
        classe:  cMap.get(e.id_classe),
      }));
  });

  getSolde(idEleve: string) {
    return (this.cache.getSoldes() ?? []).find(s => s.id_eleve === idEleve);
  }
}
