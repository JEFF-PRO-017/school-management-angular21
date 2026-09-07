// detail-paiements.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Paiement } from '../../../../../core/models/payment';
import { TableComponent, CellDefDirective, TableColumn } from '../../../../../shared/components/table/table.component';

@Component({
  selector: 'app-detail-paiements',
  standalone: true,
  imports: [CommonModule, TableComponent, CellDefDirective],
  template: `
<div class="card border-0 shadow-sm">
  <div class="card-header bg-light d-flex align-items-center justify-content-between py-2">
    <span class="small fw-semibold text-secondary">Historique paiements</span>
    <span class="text-muted small">
      {{ paiements.length }} versement(s) ·
      {{ fmt(total) }} FCFA
    </span>
  </div>

  <div class="p-2">
    <app-table
      [columns]="columns"
      [data]="paiements"
      [pageSize]="8"
      [rowIdFn]="rowIdFn"
      [trackByFn]="rowIdFn"
      emptyMessage="Aucun paiement enregistré"
      tableClass="table table-sm table-hover align-middle mb-0"
      divClass="table-responsive">

      <ng-template cellDef="date" let-p>
        <div class="fw-semibold small">{{ fmtDate(p.date_paiement) }}</div>
        <div class="text-muted" style="font-size:10px">
          {{ p.date_paiement || '—' }}
        </div>
      </ng-template>

      <ng-template cellDef="montant" let-p>
        <span class="badge text-bg-success">{{ fmt(p.montant_verse) }}</span>
      </ng-template>

      <ng-template cellDef="mode" let-p>
        <span class="badge text-bg-secondary">
          {{ p.mode_paiement === 'mobile' ? 'Mobile' : 'Cash' }}
        </span>
      </ng-template>

      <ng-template cellDef="whatsapp" let-p>
        <!--
        <span class="badge"
              [class.text-bg-success]="p.statut_alerte_whatsapp === 'ENVOYE'"
              [class.text-bg-danger]="p.statut_alerte_whatsapp === 'ECHEC'"
              [class.text-bg-secondary]="p.statut_alerte_whatsapp !== 'ENVOYE' && p.statut_alerte_whatsapp !== 'ECHEC'">
          {{ wLabel(p.statut_alerte_whatsapp) }}
        </span>
        -->
      </ng-template>

    </app-table>
  </div>
</div>
  `
})
export class DetailPaiementsComponent {
  @Input({ required: true }) paiements: Paiement[] = [];
  @Input() total = 0;

  rowIdFn = (p: Paiement) => p.id_paiement;

  columns: TableColumn<Paiement>[] = [
    { id: 'date',     header: 'Date · Période', accessor: p => p.date_paiement ?? '', sortable: true },
    { id: 'montant',  header: 'Montant',        accessor: p => p.montant_verse, sortable: true, align: 'center' },
    { id: 'mode',     header: 'Mode',           accessor: p => p.mode_paiement === 'mobile' ? 'Mobile' : 'Cash', align: 'center' },
    // { id: 'rdv',    header: 'Prochain RDV',   accessor: p => p.date_prochain_rdv ?? '', align: 'center' },
    { id: 'whatsapp', header: 'WhatsApp',       exportable: false, align: 'center' },
  ];

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(+n));
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  wLabel(s: string): string {
    if (s === 'ENVOYE') return 'Envoyé';
    if (s === 'ECHEC')  return 'Échec';
    return 'En attente';
  }
}