// moratoires-list.component.ts
// Page "Liste des moratoires" — espace parent.
// Lecture : ParentService.famille()?.moratoires (source centralisée, aucun accès data direct ici).
// Écriture (suppression) : DeleteServices.deleteMoratoire.

import { Component, ChangeDetectionStrategy, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FamilleService, Moratoire } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';
import {
  TableComponent,
  TableColumn,
  CellDefDirective,                 // ← ajouté : sans lui, <ng-template cellDef> est ignoré
} from '../../../../shared/components/table/table.component';
import { ConfirmWordModalComponent } from '../../components/confirm-word-modal.component';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { MoratoireService } from '../moratoire.service';
import { DashboardFooterComponent } from '../../dashboard/components/dashboard-footer.component';

@Component({
  selector: 'app-moratoires-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ParentHeaderComponent,
    ParentNavbarComponent,
    TableComponent,
    CellDefDirective, // ← ajouté
    ConfirmWordModalComponent,
    DashboardFooterComponent
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
            [class.bg-primary]="statutDe(m) === 'ACTIF'"
            [class.bg-secondary]="statutDe(m) === 'NON-ACTIF'"
            [class.bg-danger]="statutDe(m) === 'REFUSÉ'"
            [class.bg-warning]="statutDe(m) !== 'ACTIF' && statutDe(m) !== 'NON-ACTIF' && statutDe(m) !== 'REFUSÉ'">
            {{ statutDe(m) }}
          </span>
        </ng-template>

        <ng-template cellDef="regler" let-m>
          @if (estRegle(m)) {
            <span class="badge bg-primary">Réglé</span>
          } @else {
            <span class="badge bg-warning text-dark">En attente</span>
          }
        </ng-template>

            <ng-template cellDef="commentaire" let-m>
    <span class="badge text-bg-warning">{{ m.commentaire }}</span>
  </ng-template>
        <ng-template cellDef="actions" let-m>
          <div class="d-flex gap-2 justify-content-center">
  
           @if(m.statut === 'NON-ACTIF'){ 
            <button type="button" class="btn btn-sm btn-outline-danger" (click)="onDemanderSuppression(m)">
              Supprimer
            </button>
          }
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
    
    <app-dashboard-footer></app-dashboard-footer>
  `,
})
export class MoratoiresListComponent {
  @ViewChild('confirmSuppression') confirmSuppression!: ConfirmWordModalComponent;

  private moratoireASupprimer?: Moratoire;

  /** Statut normalisé (ACTIF par défaut). */
  statutDe = (m: Moratoire): string => (m.statut as string) ?? 'ACTIF';

  /** Gère à la fois la chaîne 'TRUE'/'FALSE' et le booléen. */
  estRegle = (m: Moratoire): boolean => {
    const v: unknown = (m as any).regler;
    return v === true || String(v).toUpperCase() === 'TRUE';
  };

  columns: TableColumn<Moratoire>[] = [
    { id: 'numero_moratoire', header: 'N° ', accessor: m => m.numero_moratoire ?? '—', sortable: true },
    { id: 'date_debut', header: 'Début', accessor: m => m.date_debut ?? '—' },
    { id: 'date_fin', header: 'Fin', accessor: m => m.date_fin ?? '—' },
    { id: 'statut', header: 'Statut', accessor: m => this.statutDe(m), align: 'center' },
    { id: 'commentaire', header: 'Commentaire', accessor: m => m.commentaire ?? '—'},
    { id: 'regler', header: 'Réglé', accessor: m => (this.estRegle(m) ? 'Réglé' : 'En attente'), align: 'center' },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  rowIdFn = (m: Moratoire) => m.id_moratoire;

  /** Lecture centralisée : famille() est la seule source, exposée par ParentService. */
  moratoires = computed(() =>
    this.moratoireService.trierParStatut(
      this.familleServices.initService(this.parentService.famille()).anneeSvcEncours?.moratoires ?? []
    )
  );

  constructor(
    private parentService: ParentService,
    private moratoireService: MoratoireService,
    private deleteServices: DeleteServices,
    private router: Router,
    private familleServices: FamilleService
  ) { }

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
    await this.deleteServices.deleteMoratoire(this.moratoireASupprimer.id_moratoire);
    this.moratoireASupprimer = undefined;
  }
}