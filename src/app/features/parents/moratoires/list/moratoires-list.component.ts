// moratoires-list.component.ts
// Page "Liste des moratoires" — espace parent.
// Réutilise : ParentHeaderComponent, ParentNavbarComponent, TableComponent,
// ConfirmWordModalComponent (pour la confirmation de suppression).
//
// ⚠️ Ajuste les chemins d'import ci-dessous selon ton arborescence réelle.

import { Component, ChangeDetectionStrategy, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Moratoire } from '../../../../core/models';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';
import { ConfirmWordModalComponent } from '../../components/confirm-word-modal.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { MoratoireService } from '../moratoire.service';



@Component({
  selector: 'app-moratoires-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ParentHeaderComponent,
    ParentNavbarComponent,
    TableComponent,
    ConfirmWordModalComponent,
  ],
  template: `
    <app-parent-header titre="Moratoires"></app-parent-header>
    <app-parent-navbar></app-parent-navbar>

    <div class="container-fluid p-3">

      <div class="d-flex justify-content-end mb-3">
        <button type="button" class="btn btn-primary" (click)="onNouveauMoratoire()">
          <i class="bi bi-plus-lg me-1"></i> Nouveau moratoire
        </button>
      </div>

      <app-table
        [columns]="columns"
        [data]="moratoires()"
        [isGlobalFilter]="true"
        searchPlaceholder="Rechercher un moratoire…"
        [pageSize]="10"
        emptyMessage="Aucun moratoire enregistré"
        [rowIdFn]="rowIdFn"
        [trackByFn]="rowIdFn">

        <ng-template cellDef="statut" let-m>
          <span
            class="badge"
            [class.bg-success]="(m.statut ?? 'ACTIF') === 'ACTIF'"
            [class.bg-secondary]="m.statut === 'NON-ACTIF'">
            {{ m.statut ?? 'ACTIF' }}
          </span>
        </ng-template>

        <ng-template cellDef="regler" let-m>
          @if (m.regler ?? false) {
            <span class="badge bg-success">Réglé</span>
          } @else {
            <span class="badge bg-warning text-dark">En attente</span>
          }
        </ng-template>

        <ng-template cellDef="actions" let-m>
          <div class="d-flex gap-2 justify-content-center">
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="onModifier(m)">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" (click)="onDemanderSuppression(m)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </ng-template>

      </app-table>
    </div>

    <app-confirm-word-modal
      #confirmSuppression
      modalId="confirmSuppressionMoratoire"
      mot="SUPPRIMER"
      titre="Supprimer ce moratoire ?"
      message="Cette action est irréversible. Le moratoire sera définitivement supprimé."
      (confirmed)="onConfirmerSuppression()">
    </app-confirm-word-modal>
  `,
})
export class MoratoiresListComponent {
  @ViewChild('confirmSuppression') confirmSuppression!: ConfirmWordModalComponent;

  private moratoireASupprimer?: Moratoire;

  columns: TableColumn<Moratoire>[] = [
    { id: 'numero_moratoire', header: 'N° Moratoire', accessor: m => m.numero_moratoire ?? '—', sortable: true, filterable: true },
    { id: 'date_debut', header: 'Date début', accessor: m => m.date_debut ?? '—', sortable: true, align: 'center' },
    { id: 'date_fin', header: 'Date fin', accessor: m => m.date_fin ?? '—', sortable: true, align: 'center' },
    { id: 'statut', header: 'Statut', accessor: m => m.statut ?? 'ACTIF', sortable: true, align: 'center' },
    { id: 'regler', header: 'Réglé', accessor: m => (m.regler ?? false) ? 'Réglé' : 'En attente', align: 'center' },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  rowIdFn = (m: Moratoire) => m.id_moratoire;

  moratoires = computed(() => this.moratoireService.moratoiresFamille());

  constructor(
    private moratoireService: MoratoireService,
    private router: Router,
  ) {}

  onNouveauMoratoire(): void {
    this.router.navigate(['/espace-parent/moratoires/create']);
  }

  onModifier(m: Moratoire): void {
    this.router.navigate(['/espace-parent/moratoires', m.id_moratoire]);
  }

  onDemanderSuppression(m: Moratoire): void {
    this.moratoireASupprimer = m;
    this.confirmSuppression.open();
  }

  async onConfirmerSuppression(): Promise<void> {
    if (!this.moratoireASupprimer) return;
    await this.moratoireService.deleteMoratoire(this.moratoireASupprimer.id_moratoire);
    this.moratoireASupprimer = undefined;
  }
}