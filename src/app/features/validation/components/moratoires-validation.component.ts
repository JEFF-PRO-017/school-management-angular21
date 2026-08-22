import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MoratoireEnrichi } from '../../../core/models';
import { GetServices, PatchServices } from '../../../core/services/@data';
import { DeleteServices } from '../../../core/services/@data/_delete.services';
import { CellDefDirective, TableColumn } from '../../../shared/components/table/table.component';
import { EntityValidationTableComponent } from './entity-validation-table.component';
import { FamilleApercuDialogComponent } from './famille-apercu-dialog.component';

@Component({
  selector: 'app-moratoires-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityValidationTableComponent, CellDefDirective],
  template: `
<app-entity-validation-table
  title="Moratoires en attente"
  [columns]="columns"
  [data]="moratoires()"
  [idFn]="idFn"
  [loading]="loading()"
  [busy]="busy()"
  (refresh)="charger()"
  (valider)="valider($event)"
  (supprimer)="supprimer($event)">

  <ng-template cellDef="regler" let-m>
    <span class="badge" [class.text-bg-success]="m.regler" [class.text-bg-secondary]="!m.regler">
      {{ m.regler ? 'Réglé' : 'Non réglé' }}
    </span>
  </ng-template>

  <ng-template cellDef="statut" let-m>
    <span class="badge text-bg-warning">{{ m.statut }}</span>
  </ng-template>

  <ng-template cellDef="actions" let-m>
    <button class="btn btn-sm btn-outline-primary" (click)="voirFamille(m)">👁 Voir famille</button>
  </ng-template>

</app-entity-validation-table>
  `
})
export class MoratoiresValidationComponent implements OnInit {
  private get = inject(GetServices);
  private patch = inject(PatchServices);
  private del = inject(DeleteServices);
  private dialog = inject(MatDialog);

  moratoires = signal<MoratoireEnrichi[]>([]);
  loading = signal(false);
  busy = signal(false);

  idFn = (m: MoratoireEnrichi) => m.id_moratoire;

  columns: TableColumn<MoratoireEnrichi>[] = [
    { id: 'numero_moratoire', header: 'N°', accessor: m => m.numero_moratoire ?? '—' },
    { id: 'famille', header: 'Famille', accessor: m => m.famille?.nom_famille ?? m.id_famille, sortable: true, filterable: true },
    { id: 'date_debut', header: 'Début', accessor: m => m.date_debut, sortable: true },
    { id: 'date_fin', header: 'Fin', accessor: m => m.date_fin, sortable: true },
    { id: 'regler', header: 'Réglé', align: 'center' },
    { id: 'statut', header: 'Statut', align: 'center' },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  ngOnInit(): void { this.charger(); }

  async charger(): Promise<void> {
    this.loading.set(true);
    // try {
    //   const all = await this.get.getMoratoires();
    //   this.moratoires.set((all ?? []).filter(m => m.statut !== 'ACTIF'));
    // } finally {
    //   this.loading.set(false);
    // }
  }

  async valider(rows: MoratoireEnrichi[]): Promise<void> {
    this.busy.set(true);
    // try {
    //   for (const m of rows) await this.patch.updateMoratoire({ ...m, statut: 'ACTIF' });
    //   await this.charger();
    // } finally {
    //   this.busy.set(false);
    // }
  }

  async supprimer(rows: MoratoireEnrichi[]): Promise<void> {
    this.busy.set(true);
    // try {
    //   for (const m of rows) await this.del.deleteMoratoire(m.id_moratoire);
    //   await this.charger();
    // } finally {
    //   this.busy.set(false);
    // }
  }

  voirFamille(m: MoratoireEnrichi): void {
    if (!m.famille) return;
    this.dialog.open(FamilleApercuDialogComponent, {
      data: { famille: m.famille }, width: '420px', maxWidth: '96vw',
    });
  }
}