// paiements-list.component.ts — liste des paiements récents + soldes
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Paiement } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-paiements-list',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    EmptyStateComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="fw-bold text-primary mb-0">Paiements</h5>
        <a routerLink="/paiements/nouveau" mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Nouveau paiement
        </a>
      </div>

      <!-- Recherche élève -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-6">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Rechercher un élève</mat-label>
            <input matInput [formControl]="searchEleve">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-3 d-flex align-items-center">
          <button mat-stroked-button class="w-100"
                  (click)="chargerPaiements()"
                  [disabled]="!selectedEleveId() || loading()">
            <mat-icon>refresh</mat-icon> Voir historique
          </button>
        </div>
      </div>

      <!-- Suggestions d'élèves -->
      @if (searchEleve.value && suggestions().length > 0) {
        <div class="list-group mb-3 shadow-sm" style="max-height:200px;overflow-y:auto">
          @for (e of suggestions(); track e.id_eleve) {
            <button type="button"
                    class="list-group-item list-group-item-action d-flex justify-content-between"
                    (click)="selectionnerEleve(e.id_eleve)">
              <span>{{ e.nom }} {{ e.prenom }}</span>
              <span class="badge bg-primary-subtle text-primary">
                {{ e.classe?.nom_classe }}
              </span>
            </button>
          }
        </div>
      }

      <!-- Solde de l'élève sélectionné -->
      @if (selectedEleveId() && soldeSelectionne()) {
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body d-flex flex-wrap gap-4">
            <div>
              <div class="text-muted small">Élève sélectionné</div>
              <div class="fw-bold">{{ nomEleveSelectionne() }}</div>
            </div>
            <div>
              <div class="text-muted small">Total versé</div>
              <div class="fw-bold text-success">
                {{ soldeSelectionne()!.total_verse.toLocaleString() }} FCFA
              </div>
            </div>
            <div>
              <div class="text-muted small">Reste à payer</div>
              <div class="fw-bold text-danger">
                {{ soldeSelectionne()!.reste_a_payer.toLocaleString() }} FCFA
              </div>
            </div>
            <div>
              <div class="text-muted small">Dernier paiement</div>
              <div class="small">
                {{ soldeSelectionne()!.dernier_paiement || '—' }}
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Liste des paiements -->
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (paiements().length === 0 && selectedEleveId()) {
        <app-empty-state icon="payments" title="Aucun paiement"
          subtitle="Cet élève n'a pas encore effectué de paiement">
        </app-empty-state>
      } @else if (paiements().length > 0) {
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="paiements()" class="w-100 mat-elevation-z0">

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let p">{{ p.date_paiement }}</td>
            </ng-container>

            <ng-container matColumnDef="montant">
              <th mat-header-cell *matHeaderCellDef>Montant</th>
              <td mat-cell *matCellDef="let p" class="fw-semibold text-success">
                +{{ (+p.montant_verse).toLocaleString() }} FCFA
              </td>
            </ng-container>

            <ng-container matColumnDef="mode">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Mode</th>
              <td mat-cell *matCellDef="let p" class="d-none d-md-table-cell">
                {{ p.mode_paiement }}
              </td>
            </ng-container>

            <ng-container matColumnDef="recu">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Reçu</th>
              <td mat-cell *matCellDef="let p" class="d-none d-md-table-cell">
                <span class="text-muted small">{{ p.recu_numero }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="rdv">
              <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">
                Prochain RDV
              </th>
              <td mat-cell *matCellDef="let p" class="d-none d-lg-table-cell">
                @if (p.date_prochain_rdv) {
                  <span class="badge bg-warning-subtle text-warning">
                    {{ p.date_prochain_rdv }}
                  </span>
                } @else { — }
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
export class PaiementsListComponent implements OnInit {

  private cache = inject(CacheService);
  private data  = inject(DataService);
  private route = inject(ActivatedRoute);

  cols = ['date', 'montant', 'mode', 'recu', 'rdv'];

  searchEleve    = new FormControl('');
  loading        = signal(false);
  paiements      = signal<Paiement[]>([]);
  selectedEleveId= signal('');

  // Suggestions de recherche
  suggestions = computed(() => {
    const q    = (this.searchEleve.value ?? '').toLowerCase();
    const cMap = this.cache.classesMap();
    if (!q) return [];
    return (this.cache.getEleves() ?? [])
      .filter(e => `${e.nom} ${e.prenom}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map(e => ({ ...e, classe: cMap.get(e.id_classe) }));
  });

  soldeSelectionne = computed(() => {
    const id = this.selectedEleveId();
    if (!id) return null;
    return (this.cache.getSoldes() ?? []).find(s => s.id_eleve === id) ?? null;
  });

  nomEleveSelectionne = computed(() => {
    const id = this.selectedEleveId();
    const e  = (this.cache.getEleves() ?? []).find(x => x.id_eleve === id);
    return e ? `${e.nom} ${e.prenom}` : '';
  });

  ngOnInit(): void {
    // Pré-sélection depuis query param (?eleve=xxx)
    const id = this.route.snapshot.queryParamMap.get('eleve');
    if (id) this.selectionnerEleve(id);
  }

  selectionnerEleve(id: string): void {
    this.selectedEleveId.set(id);
    this.searchEleve.setValue('');
  }

  async chargerPaiements(): Promise<void> {
    const id = this.selectedEleveId();
    if (!id) return;
    this.loading.set(true);
    this.paiements.set(await this.data.getPaiementsEleve(id));
    this.loading.set(false);
  }
}
