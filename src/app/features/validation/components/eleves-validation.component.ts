import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EleveEnrichi } from '../../../core/models';
import { GetServices, PatchServices } from '../../../core/services/@data';
import { DeleteServices } from '../../../core/services/@data/_delete.services';
import { CellDefDirective, TableColumn } from '../../../shared/components/table/table.component';
import { EntityValidationTableComponent } from './entity-validation-table.component';
import { FamilleApercuDialogComponent } from './famille-apercu-dialog.component';
import { RefreshServices } from '../../../core/services/@data/_refresh.services';

@Component({
  selector: 'app-eleves-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityValidationTableComponent, CellDefDirective],
  template: `
<app-entity-validation-table
  title="Élèves en attente"
  [columns]="columns"
  [data]="eleves()"
  [idFn]="idFn"
  [loading]="loading()"
  [busy]="busy()"
  (refresh)="charger()"
  (valider)="valider($event)"
  (supprimer)="supprimer($event)">

  <ng-template cellDef="statut" let-e>
    <span class="badge" [class.text-bg-warning]="e.statut !== 'ACTIF'" [class.text-bg-secondary]="e.statut === 'ARCHIVE'">
      {{ e.statut }}
    </span>
  </ng-template>

  <ng-template cellDef="actions" let-e>
    <button class="btn btn-sm btn-outline-primary" (click)="voirFamille(e)">👁 Voir famille</button>
  </ng-template>

</app-entity-validation-table>
  `
})
export class ElevesValidationComponent implements OnInit {
  private get = inject(GetServices);
  private patch = inject(PatchServices);
  private del = inject(DeleteServices);
  private refresh = inject(RefreshServices);
  private dialog = inject(MatDialog);

  eleves = signal<EleveEnrichi[]>([]);
  loading = signal(false);
  busy = signal(false);

  idFn = (e: EleveEnrichi) => e.id_eleve;

  columns: TableColumn<EleveEnrichi>[] = [
    { id: 'nom', header: 'Nom', accessor: e => e.nom, sortable: true, filterable: true },
    { id: 'prenom', header: 'Prénom', accessor: e => e.prenom, sortable: true, filterable: true },
    { id: 'classe', header: 'Classe', accessor: e => e.classe?.nom_classe ?? e.id_classe },
    { id: 'sexe', header: 'Sexe', accessor: e => e.sexe ?? '—', align: 'center' },
    { id: 'statut', header: 'Statut', align: 'center' },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  ngOnInit(): void { this.charger(); }

  async charger(): Promise<void> {
    this.loading.set(true);
    try {
      await this.refresh.refreshEleves();
      const all = await this.get.getEleves();
      this.eleves.set((all ?? []).filter(e => e.statut === 'NON-ACTIF'));
    } finally {
      this.loading.set(false);
    }
  }

  async valider(rows: EleveEnrichi[]): Promise<void> {
    this.busy.set(true);
    try {
      for (const e of rows) await this.patch.updateEleve({ ...e, statut: 'ACTIF' });
      await this.charger();
    } finally {
      this.busy.set(false);
    }
  }

  async supprimer(rows: EleveEnrichi[]): Promise<void> {
    this.busy.set(true);
    try {
      for (const e of rows) await this.del.deleteEleve(e.id_eleve);
      await this.charger();
    } finally {
      this.busy.set(false);
    }
  }

  voirFamille(e: EleveEnrichi): void {
    if (!e.famille) return;
    this.dialog.open(FamilleApercuDialogComponent, {
      data: { famille: e.famille }, width: '420px', maxWidth: '96vw',
    });
  }
}