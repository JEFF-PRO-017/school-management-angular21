// familles-list.component.ts — liste des familles avec recherche et tableau Material
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Famille } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-familles-list',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <!-- Barre d'actions -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 class="fw-bold text-primary mb-0">Familles ({{ filtered().length }})</h5>
        <div class="d-flex gap-2">
          <!-- Bouton carte -->
          <a routerLink="/familles/carte" mat-stroked-button color="accent">
            <mat-icon>map</mat-icon> Carte
          </a>
          <a routerLink="/familles/nouveau" mat-raised-button color="primary">
            <mat-icon>add</mat-icon> Nouvelle famille
          </a>
        </div>
      </div>

      <!-- Champ de recherche -->
      <mat-form-field appearance="outline" class="w-100 mb-3">
        <mat-label>Rechercher par nom ou téléphone</mat-label>
        <input matInput [formControl]="search">
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <!-- Tableau responsive -->
      @if (filtered().length === 0) {
        <app-empty-state
          icon="family_restroom"
          title="Aucune famille trouvée"
          subtitle="Ajoutez une famille ou modifiez votre recherche">
        </app-empty-state>
      } @else {
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="filtered()" class="w-100 mat-elevation-z0">

            <!-- Colonne Nom -->
            <ng-container matColumnDef="nom">
              <th mat-header-cell *matHeaderCellDef>Famille</th>
              <td mat-cell *matCellDef="let f">
                <div class="fw-semibold">{{ f.nom_famille }}</div>
                <div class="text-muted small">{{ nbEnfants(f.id_famille) }} enfant(s)</div>
              </td>
            </ng-container>

            <!-- Colonne Père -->
            <ng-container matColumnDef="tel_pere">
              <th mat-header-cell *matHeaderCellDef>Père</th>
              <td mat-cell *matCellDef="let f">{{ f.tel_pere || '—' }}</td>
            </ng-container>

            <!-- Colonne Mère -->
            <ng-container matColumnDef="tel_mere">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Mère</th>
              <td mat-cell *matCellDef="let f" class="d-none d-md-table-cell">
                {{ f.tel_mere || '—' }}
              </td>
            </ng-container>

            <!-- Colonne localisation -->
            <ng-container matColumnDef="localisation">
              <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">
                Localisation
              </th>
              <td mat-cell *matCellDef="let f" class="d-none d-lg-table-cell">
                @if (f.latitude && f.longitude) {
                  <mat-icon class="text-success small" matTooltip="Position enregistrée">
                    location_on
                  </mat-icon>
                } @else {
                  <span class="text-muted small">Non définie</span>
                }
              </td>
            </ng-container>

            <!-- Colonne actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let f">
                <div class="d-flex gap-1 justify-content-end">
                  <a [routerLink]="['/familles', f.id_famille, 'modifier']"
                     mat-icon-button matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button mat-icon-button color="warn"
                          matTooltip="Supprimer"
                          (click)="confirmDelete(f)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"
                class="cursor-pointer"></tr>
          </table>
        </div>
      }

    </div>
  `
})
export class FamillesListComponent {

  private cache   = inject(CacheService);
  private data    = inject(DataService);
  private dialog  = inject(MatDialog);

  // Colonnes affichées (responsive géré par CSS classes dans les cellules)
  cols = ['nom', 'tel_pere', 'tel_mere', 'localisation', 'actions'];

  // Champ de recherche réactif
  search = new FormControl('');

  // Liste filtrée (recalculée à chaque frappe)
  filtered = computed(() => {
    const q   = (this.search.value ?? '').toLowerCase();
    const all = this.cache.getFamilles() ?? [];
    if (!q) return all;
    return all.filter(f =>
      f.nom_famille.toLowerCase().includes(q) ||
      f.tel_pere?.includes(q) ||
      f.tel_mere?.includes(q)
    );
  });

  // Nombre d'enfants par famille (depuis le cache élèves)
  nbEnfants(idFamille: string): number {
    return (this.cache.getEleves() ?? [])
      .filter(e => e.id_famille === idFamille && e.statut === 'actif')
      .length;
  }

  // Suppression avec confirmation
  confirmDelete(f: Famille): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:   'Supprimer la famille',
        message: `Supprimer "${f.nom_famille}" ? Cette action est irréversible.`,
        confirm: 'Supprimer',
      }
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.cache.removeFamille(f.id_famille);
        // La suppression en base sera gérée via queue si rowIndex disponible
      }
    });
  }
}
