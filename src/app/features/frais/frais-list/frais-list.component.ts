// frais-list.component.ts — liste de la configuration des frais par classe
import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CacheService } from '../../../core/services/cache.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-frais-list',
  standalone: true,
  imports: [
    RouterLink, MatTableModule, MatButtonModule,
    MatIconModule, MatTooltipModule, EmptyStateComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Configuration des frais</h5>
        <a routerLink="/frais/nouveau" mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Nouveau
        </a>
      </div>

      <!-- Info sur l'anti-effet papillon -->
      <div class="alert alert-info py-2 small mb-3">
        <mat-icon style="font-size:15px;vertical-align:middle">info</mat-icon>
        Modifier le montant ici met à jour automatiquement tous les soldes au prochain snapshot.
      </div>

      @if (frais().length === 0) {
        <app-empty-state icon="payments"
          title="Aucune configuration"
          subtitle="Ajoutez les frais pour chaque classe">
        </app-empty-state>
      } @else {
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="frais()" class="w-100 mat-elevation-z0">

            <ng-container matColumnDef="classe">
              <th mat-header-cell *matHeaderCellDef>Classe</th>
              <td mat-cell *matCellDef="let f">
                <span class="badge bg-primary-subtle text-primary">
                  {{ nomClasse(f.id_classe) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let f">{{ f.type_frais }}</td>
            </ng-container>

            <ng-container matColumnDef="montant">
              <th mat-header-cell *matHeaderCellDef>Montant attendu</th>
              <td mat-cell *matCellDef="let f" class="fw-semibold">
                {{ (+f.montant_total_attendu).toLocaleString() }} FCFA
              </td>
            </ng-container>

            <ng-container matColumnDef="seuil">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">
                Seuil insolvable
              </th>
              <td mat-cell *matCellDef="let f" class="d-none d-md-table-cell text-danger">
                {{ (+f.seuil_insolvable).toLocaleString() }} FCFA
              </td>
            </ng-container>

            <ng-container matColumnDef="echeances">
              <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">
                Échéances
              </th>
              <td mat-cell *matCellDef="let f" class="d-none d-lg-table-cell small text-muted">
                @if (f.echeance_1) { <span class="me-2">{{ f.echeance_1 }}</span> }
                @if (f.echeance_2) { <span class="me-2">{{ f.echeance_2 }}</span> }
                @if (f.echeance_3) { <span>{{ f.echeance_3 }}</span> }
                @if (!f.echeance_1) { — }
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let f">
                <a [routerLink]="['/frais', f.id_frais, 'modifier']"
                   mat-icon-button matTooltip="Modifier">
                  <mat-icon>edit</mat-icon>
                </a>
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
export class FraisListComponent {

  private cache = inject(CacheService);

  cols  = ['classe', 'type', 'montant', 'seuil', 'echeances', 'actions'];
  frais = computed(() => this.cache.getFrais() ?? []);

  nomClasse(id: string): string {
    return this.cache.classesMap().get(id)?.nom_classe ?? id;
  }
}
