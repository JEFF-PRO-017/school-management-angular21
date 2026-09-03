// paiements-list.component.ts
// Page "Liste des paiements" — espace parent.
// Réutilise : ParentHeaderComponent, ParentNavbarComponent, TableComponent.
// Filtres dédiés : statut + mode de paiement (en plus de la recherche globale du tableau).
//
// ⚠️ Ajuste les chemins d'import selon ton arborescence réelle.

import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Paiement } from '../../../../core/models';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { PaiementService } from '../paiement.service';


@Component({
  selector: 'app-paiements-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ParentHeaderComponent, ParentNavbarComponent, TableComponent],
  template: `
    <app-parent-header titre="Paiements"></app-parent-header>
    <app-parent-navbar></app-parent-navbar>

    <div class="container-fluid p-3">

      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select class="form-select form-select-sm" style="max-width:200px"
                [value]="filtreStatut()" (change)="onFiltreStatut($event)">
          <option value="">Tous les statuts</option>
          <option value="crée">Créé</option>
          <option value="confirmé">Confirmé</option>
          <option value="refusé">Refusé</option>
        </select>

        <select class="form-select form-select-sm" style="max-width:200px"
                [value]="filtreMode()" (change)="onFiltreMode($event)">
          <option value="">Tous les modes</option>
          <option value="cash">Cash</option>
          <option value="mobile">Mobile</option>
          <option value="virement">Virement</option>
        </select>

        <button type="button" class="btn btn-primary ms-auto" (click)="onInitierPaiement()">
          <i class="bi bi-plus-lg me-1"></i> Initier un paiement
        </button>
      </div>

      <app-table
        [columns]="columns"
        [data]="paiementsFiltres()"
        [isGlobalFilter]="true"
        searchPlaceholder="Rechercher un paiement…"
        [pageSize]="10"
        emptyMessage="Aucun paiement enregistré"
        [rowIdFn]="rowIdFn"
        [trackByFn]="rowIdFn">

        <ng-template cellDef="statut" let-p>
          <span
            class="badge"
            [class.bg-success]="p.statut === 'confirmé'"
            [class.bg-warning]="(p.statut ?? 'crée') === 'crée'"
            [class.text-dark]="(p.statut ?? 'crée') === 'crée'"
            [class.bg-danger]="p.statut === 'refusé'">
            {{ p.statut ?? 'crée' }}
          </span>
        </ng-template>

        <ng-template cellDef="montant_verse" let-p>
          {{ (p.montant_verse ?? 0) | number }} FCFA
        </ng-template>

      </app-table>
    </div>
  `,
})
export class PaiementsListComponent {
  columns: TableColumn<Paiement>[] = [
    { id: 'date_paiement', header: 'Date', accessor: p => p.date_paiement ?? '—', sortable: true, align: 'center' },
    { id: 'montant_verse', header: 'Montant', accessor: p => p.montant_verse ?? 0, sortable: true, align: 'right' },
    { id: 'mode_paiement', header: 'Mode', accessor: p => p.mode_paiement ?? '—', sortable: true, align: 'center' },
    { id: 'recu_numero', header: 'N° Reçu', accessor: p => p.recu_numero || '—', filterable: true },
    { id: 'statut', header: 'Statut', accessor: p => p.statut ?? 'crée', sortable: true, align: 'center' },
  ];

  rowIdFn = (p: Paiement) => p.id_paiement;

  filtreStatut = signal<string>('');
  filtreMode = signal<string>('');

  private paiements = computed(() => this.paiementService.paiementsFamille());

  paiementsFiltres = computed(() => {
    const statut = this.filtreStatut();
    const mode = this.filtreMode();
    return this.paiements().filter(p =>
      (!statut || p.statut === statut) &&
      (!mode || p.mode_paiement === mode)
    );
  });

  constructor(
    private paiementService: PaiementService,
    private router: Router,
  ) {}

  onFiltreStatut(e: Event): void {
    this.filtreStatut.set((e.target as HTMLSelectElement).value);
  }

  onFiltreMode(e: Event): void {
    this.filtreMode.set((e.target as HTMLSelectElement).value);
  }

  onInitierPaiement(): void {
    this.router.navigate(['/espace-parent/paiements/create']);
  }
}