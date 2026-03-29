// alertes-log.component.ts — journal des envois WhatsApp
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { DataService } from '../../../core/services/data.service';
import { CacheService } from '../../../core/services/cache.service';
import { LogAlerte } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-alertes-log',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatChipsModule,
    EmptyStateComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="container-fluid px-0">

      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/whatsapp" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">Journal des alertes WhatsApp</h5>
      </div>

      <!-- Filtre statut -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Statut</mat-label>
            <mat-select [formControl]="filterStatut">
              <mat-option value="">Tous</mat-option>
              <mat-option value="envoye">Envoyé</mat-option>
              <mat-option value="echec">Échec</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (filtered().length === 0) {
        <app-empty-state icon="history" title="Aucune alerte"
          subtitle="Les envois apparaîtront ici">
        </app-empty-state>
      } @else {
        <div class="table-responsive rounded shadow-sm">
          <table mat-table [dataSource]="filtered()" class="w-100 mat-elevation-z0">

            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let l">
                {{ l.date_envoi | date:'dd/MM/yyyy HH:mm' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="eleve">
              <th mat-header-cell *matHeaderCellDef>Élève</th>
              <td mat-cell *matCellDef="let l">
                {{ nomEleve(l.id_eleve) }}
              </td>
            </ng-container>

            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef>Numéro</th>
              <td mat-cell *matCellDef="let l">{{ l.numero_dest }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">
                Type
              </th>
              <td mat-cell *matCellDef="let l" class="d-none d-md-table-cell">
                {{ l.id_template }}
              </td>
            </ng-container>

            <ng-container matColumnDef="statut">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let l">
                <span [class]="l.statut === 'envoye'
                  ? 'badge bg-success-subtle text-success'
                  : 'badge bg-danger-subtle text-danger'">
                  {{ l.statut === 'envoye' ? 'Envoyé' : 'Échec' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>

        <!-- Résumé -->
        <div class="d-flex gap-3 mt-3 text-muted small">
          <span>
            <strong class="text-success">{{ nbEnvoyes() }}</strong> envoyé(s)
          </span>
          <span>
            <strong class="text-danger">{{ nbEchecs() }}</strong> échec(s)
          </span>
        </div>
      }

    </div>
  `
})
export class AlertesLogComponent implements OnInit {

  private data  = inject(DataService);
  private cache = inject(CacheService);

  cols    = ['date', 'eleve', 'numero', 'type', 'statut'];
  loading = signal(true);
  logs    = signal<LogAlerte[]>([]);

  filterStatut = new FormControl('');

  filtered = computed(() => {
    const s = this.filterStatut.value ?? '';
    return (this.logs() ?? []).filter(l => !s || l.statut === s);
  });

  nbEnvoyes = computed(() => this.logs().filter(l => l.statut === 'envoye').length);
  nbEchecs  = computed(() => this.logs().filter(l => l.statut === 'echec').length);

  async ngOnInit(): Promise<void> {
    const raw = await this.data.readSheetPublic<LogAlerte>('F8_LOG_ALERTES');
    this.logs.set([...raw].sort((a, b) =>
      new Date(b.date_envoi).getTime() - new Date(a.date_envoi).getTime()
    ));
    this.loading.set(false);
  }

  nomEleve(id: string): string {
    const e = (this.cache.getEleves() ?? []).find(x => x.id_eleve === id);
    return e ? `${e.nom} ${e.prenom}` : id;
  }
}
