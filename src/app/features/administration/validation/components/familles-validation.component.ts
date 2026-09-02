import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FamilleEnrichi } from '../../../../core/models';
import { GetServices, PatchServices } from '../../../../core/services/@data';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';
import { CellDefDirective, TableColumn } from '../../../../shared/components/table/table.component';
import { EntityValidationTableComponent } from './entity-validation-table.component';
import { RefreshServices } from '../../../../core/services/@data/_refresh.services';

@Component({
  selector: 'app-familles-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntityValidationTableComponent, CellDefDirective],
  template: `
<app-entity-validation-table
  title="Familles en attente"
  [columns]="columns"
  [data]="familles()"
  [idFn]="idFn"
  [loading]="loading()"
  [busy]="busy()"
  (refresh)="charger()"
  (valider)="valider($event)"
  (supprimer)="supprimer($event)">

  <ng-template cellDef="status" let-f>
    <span class="badge" [class.text-bg-warning]="f.status !== 'ACTIF'" [class.text-bg-danger]="f.status === 'BANNI'">
      {{ f.status }}
    </span>
  </ng-template>

</app-entity-validation-table>
  `
})
export class FamillesValidationComponent implements OnInit {
  private get = inject(GetServices);
  private refresh = inject(RefreshServices);
  private patch = inject(PatchServices);
  private del = inject(DeleteServices);

  familles = signal<FamilleEnrichi[]>([]);
  loading = signal(false);
  busy = signal(false);

  idFn = (f: FamilleEnrichi) => f.id_famille;

  columns: TableColumn<FamilleEnrichi>[] = [
    { id: 'nom_famille', header: 'Famille', accessor: f => f.nom_famille, sortable: true, filterable: true },
    { id: 'tel_pere', header: 'Tél. père', accessor: f => f.tel_pere || '—' },
    { id: 'tel_mere', header: 'Tél. mère', accessor: f => f.tel_mere || '—' },
    { id: 'adresse_texte', header: 'Adresse', accessor: f => f.adresse_texte || '—' },
    { id: 'nb_eleves', header: 'Enfants', accessor: f => f.eleves?.length ?? 0, align: 'center' },
    { id: 'status', header: 'Statut', align: 'center' },
  ];

  ngOnInit(): void { this.charger(); }

  async charger(): Promise<void> {
    this.loading.set(true);
    try {
      await this.refresh.refreshFamilles()
      const all = await this.get.getFamilles();
      this.familles.set((all ?? []).filter(f => f.status == 'NON-ACTIF'));
    } finally {
      this.loading.set(false);
    }
  }

  async valider(rows: FamilleEnrichi[]): Promise<void> {
    this.busy.set(true);
    try {
      for (const f of rows) await this.patch.updateFamille({ ...f, status: 'ACTIF' });
      await this.charger();
    } finally {
      this.busy.set(false);
    }
  }

  async supprimer(rows: FamilleEnrichi[]): Promise<void> {
    this.busy.set(true);
    try {
      for (const f of rows) await this.del.deleteFamille(f.id_famille);
      await this.charger();
    } finally {
      this.busy.set(false);
    }
  }
}