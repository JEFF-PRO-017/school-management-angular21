import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { DemandePaiement } from '../../../core/models/parent.models';
import { GetServices, PatchServices } from '../../../core/services/@data';
import { CacheService } from '../../../core/services/cache.service';
import { TableComponent, CellDefDirective, TableColumn } from '../../../shared/components/table/table.component';

interface DemandeEnrichie extends DemandePaiement {
  nom_famille: string;
  reste_avant: number;
}

@Component({
  selector: 'app-paiements-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableComponent, CellDefDirective],
  template: `
<div>
  <div class="d-flex align-items-center justify-content-between mb-2">
    <h6 class="mb-0">Paiements en attente</h6>
    <button class="btn btn-sm btn-outline-secondary" (click)="charger()" [disabled]="loading()">
      @if (loading()) { <span class="spinner-border spinner-border-sm me-1"></span> }
      Actualiser
    </button>
  </div>

  <app-table [columns]="columns" [data]="demandes()" [isGlobalFilter]="true"
             emptyMessage="Aucune demande de paiement en attente">

    <ng-template cellDef="actions" let-d>
      <div class="d-flex gap-1 justify-content-center">
        <button class="btn btn-sm btn-success" [disabled]="busy()" (click)="valider(d)">✅</button>
        <button class="btn btn-sm btn-danger" [disabled]="busy()" (click)="refuser(d)">✕</button>
      </div>
    </ng-template>

  </app-table>
</div>
  `
})
export class PaiementsValidationComponent implements OnInit {
  private get = inject(GetServices);
  private patch = inject(PatchServices);
  private cache = inject(CacheService);

  loading = signal(false);
  busy = signal(false);
  demandes = signal<DemandeEnrichie[]>([]);

  columns: TableColumn<DemandeEnrichie>[] = [
    { id: 'nom_famille', header: 'Famille', accessor: d => d.nom_famille, sortable: true, filterable: true },
    { id: 'montant', header: 'Montant', accessor: d => this.fcfa(d.montant) + ' FCFA', align: 'right' },
    { id: 'reste_avant', header: 'Restant', accessor: d => this.fcfa(d.reste_avant) + ' FCFA', align: 'right' },
    { id: 'mode_paiement', header: 'Mode', accessor: d => d.mode_paiement },
    { id: 'date_demande', header: 'Date', accessor: d => d.date_demande, sortable: true },
    { id: 'actions', header: 'Actions', exportable: false, align: 'center' },
  ];

  ngOnInit(): void { this.charger(); }

  async charger(): Promise<void> {
    this.loading.set(true);
    try {
      const [pais, familles] = await Promise.all([this.get.getPaiements(), this.get.getFamilles()]);
      const soldes = this.cache.getSoldes();
    //   this.demandes.set(
    //     (pais ?? []).filter(d => d.statut === 'en_attente').map(d => {
    //       const fam = familles.find((f: any) => f.id_famille === d.id_famille);
    //       const solde = soldes.find((s: any) => s.id_famille === d.id_famille);
    //       const attendu = +(fam?.annee_scolaires?.[0]?.montant_total_attendu ?? 0);
    //       const actuel = +(solde?.total_verse ?? 0);
    //       return { ...d, nom_famille: fam?.nom_famille ?? d.id_famille, reste_avant: Math.max(0, attendu - actuel) };
    //     })
    //   );
    } finally {
      this.loading.set(false);
    }
  }

  async valider(d: DemandeEnrichie): Promise<void> {
    if (!confirm(`Valider le paiement de ${this.fcfa(d.montant)} FCFA pour ${d.nom_famille} ?`)) return;
    this.busy.set(true);
    // try { await this.patch.updateDemandePaiement({ ...d, statut: 'valide' }); await this.charger(); }
    // finally { this.busy.set(false); }
  }

  async refuser(d: DemandeEnrichie): Promise<void> {
    this.busy.set(true);
    // try { await this.patch.updateDemandePaiement({ ...d, statut: 'refuse' }); await this.charger(); }
    // finally { this.busy.set(false); }
  }

  fcfa(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }
}