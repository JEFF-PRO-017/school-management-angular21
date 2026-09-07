// detail-enfants.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Eleve } from '../../../../../core/models/academic';
import { EleveEnrichi } from '../../../../../core/models';
import { TableComponent, CellDefDirective, TableColumn } from '../../../../../shared/components/table/table.component';

@Component({
  selector: 'app-detail-enfants',
  standalone: true,
  imports: [CommonModule, TableComponent, CellDefDirective],
  template: `
<div class="card border-0 shadow-sm">
  <div class="card-header bg-light d-flex align-items-center justify-content-between py-2">
    <span class="small fw-semibold text-secondary">Enfants ({{ enfants().length }})</span>
    <button class="btn btn-sm btn-primary" (click)="ajouter.emit()">+ Ajouter</button>
  </div>

  <div class="p-2">
    <app-table
      [columns]="columns"
      [data]="enfants()"
      [pageSize]="5"
      [rowIdFn]="rowIdFn"
      [trackByFn]="rowIdFn"
      emptyMessage="Aucun enfant enregistré"
      tableClass="table table-sm table-hover align-middle mb-0"
      divClass="table-responsive">

      <ng-template cellDef="eleve" let-e>
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle d-flex align-items-center
                       justify-content-center fw-semibold flex-shrink-0"
               style="width:30px;height:30px;font-size:10px"
               [style.background]="avBg(e.id_eleve)"
               [style.color]="avTxt(e.id_eleve)">
            {{ initiales(e.nom, e.prenom) }}
          </div>
          <div>
            <div>{{ e.nom }} {{ e.prenom }}</div>
            <div class="text-muted" style="font-size:10px">{{ e.id_eleve }}</div>
          </div>
        </div>
      </ng-template>

      <ng-template cellDef="classe" let-e>
        <span class="badge text-bg-primary">{{ e.classe?.nom_classe }}</span>
      </ng-template>

      <ng-template cellDef="naissance" let-e>
        <span class="text-muted small">{{ fmtDate(e.date_naissance ?? '') }}</span>
      </ng-template>

      <ng-template cellDef="absences" let-e>
        <span class="badge"
              [class.text-bg-success]="nbAbsences(e) === 0"
              [class.text-bg-warning]="nbAbsences(e) > 0 && nbAbsences(e) <= 3"
              [class.text-bg-danger]="nbAbsences(e) > 3">
          {{ nbAbsences(e) }}
        </span>
      </ng-template>

      <ng-template cellDef="verifie" let-e>
        @if (e.verifie === 'OUI' || e.verifie === true) {
          <span class="badge text-bg-success">Vérifié</span>
        } @else {
          <span class="badge text-bg-secondary">Non vérifié</span>
        }
      </ng-template>

      <ng-template cellDef="statut" let-e>
        <span class="badge"
              [class.text-bg-success]="e.statut === 'ACTIF'"
              [class.text-bg-secondary]="e.statut !== 'ACTIF'">
          {{ e.statut }}
        </span>
      </ng-template>

      <ng-template cellDef="actions" let-e>
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-outline-secondary p-0"
                  style="width:26px;height:26px" title="Modifier"
                  (click)="modifier.emit(e)">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                    stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger p-0" disabled
                  style="width:26px;height:26px" title="Archiver"
                  (click)="archiver.emit(e)">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="3" rx="1"
                    stroke="currentColor" stroke-width="1.3"/>
              <path d="M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"
                    stroke="currentColor" stroke-width="1.3"/>
              <path d="M6 9h4" stroke="currentColor"
                    stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>

          <button class="btn btn-sm btn-outline-danger icon-btn"  style="width:26px;height:26px"  title="Supprimer" (click)="supprimer.emit(e)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </ng-template>

    </app-table>
  </div>
</div>
  `
})
export class DetailEnfantsComponent {
  enfants = input<EleveEnrichi[]>([]);

  ajouter = output<void>();
  modifier = output<Eleve>();
  archiver = output<Eleve>();
  supprimer = output<Eleve>();

  rowIdFn = (e: EleveEnrichi) => e.id_eleve;

  columns: TableColumn<EleveEnrichi>[] = [
    { id: 'eleve', header: 'Élève', accessor: e => `${e.nom} ${e.prenom}`, sortable: true, filterable: true },
    { id: 'classe', header: 'Classe', accessor: e => e.classe?.nom_classe ?? '—', sortable: true, align: 'center' },
    { id: 'sexe', header: 'Sexe', accessor: e => e.sexe || '—', align: 'center' },
    { id: 'naissance', header: 'Naissance', accessor: e => e.date_naissance ?? '', sortable: true, align: 'center' },
    { id: 'absences', header: 'Absences', accessor: e => this.nbAbsences(e), sortable: true, align: 'center' },
    { id: 'verifie', header: 'Vérifié', accessor: e => e.verifie ?? '', align: 'center' },
    { id: 'statut', header: 'Statut', accessor: e => e.statut ?? '—', sortable: true, align: 'center' },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  /** Nombre d'absences de l'élève (basé sur le tableau `absences[]`). */
  nbAbsences(e: EleveEnrichi): number {
    return (e as any).absences?.length ?? 0;
  }

  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }

  private palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];
  private hash(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }
  avBg(id: string): string { return this.palette[this.hash(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hash(id)].txt; }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }
}