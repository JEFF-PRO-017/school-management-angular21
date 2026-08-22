// features/paiements/list/paiements-gestion-list.component.ts
import { Component, inject, computed, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FamilleEnrichi, FamilleService, PaiementEnrichi } from '../../core/models';
import { GetServices } from '../../core/services/@data';
import { DeleteServices } from '../../core/services/@data/_delete.services';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TableComponent, CellDefDirective, TableColumn } from '../../shared/components/table/table.component';
import { WhatsappModalComponent, WhatsappModalData } from '../../shared/components/whatsapp-modal/whatsapp-modal.component';
import { RecuModalComponent, RecuModalData } from './modal/recu-modal.component';
import { PaiementModalComponent, PaiementModalData } from './modal/paiement-modal.component';

@Component({
  selector: 'app-paiements-gestion-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableComponent, CellDefDirective, RouterLink],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE DE FILTRES ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-3 border-bottom">
    <div class="d-flex flex-column">
      <span class="fw-medium">{{ filtered().length }} paiement(s)</span>
      <span class="small text-success">{{ fmt(totalMontant()) }} FCFA au total</span>
    </div>

    <div class="vr mx-1"></div>

    @for (opt of optsStatut; track opt.val) {
      <button type="button" class="btn btn-sm rounded-pill"
              [class.btn-primary]="filtreStatut() === opt.val"
              [class.btn-outline-secondary]="filtreStatut() !== opt.val"
              (click)="filtreStatut.set(opt.val)">
        {{ opt.label }}
      </button>
    }

    <div class="vr mx-1"></div>

    @for (opt of optsMode; track opt.val) {
      <button type="button" class="btn btn-sm rounded-pill"
              [class.btn-primary]="filtreMode() === opt.val"
              [class.btn-outline-secondary]="filtreMode() !== opt.val"
              (click)="filtreMode.set(opt.val)">
        {{ opt.label }}
      </button>
    }
  </div>

  <app-table
    [columns]="columns"
    [data]="filtered()"
    [isGlobalFilter]="true"
    searchPlaceholder="Rechercher une famille, un reçu..."
    [pageSize]="10"
    [trackByFn]="trackByPaiement"
    [isExport]="true"
    exportFilename="paiements"
    emptyMessage="Aucun paiement ne correspond à ces critères">

    <ng-template cellDef="famille" let-p>
      <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
             [style.background]="avBg(p)" [style.color]="avTxt(p)"
             style="width:28px;height:28px;font-size:10px;font-weight:600">
          {{ initiales(p) }}
        </div>
        <span class="fw-medium">{{ p.famille.nom_famille }}</span>
      </div>
    </ng-template>

    <ng-template cellDef="montant" let-p>
      <span class="fw-bold">{{ fmt(p.montant_verse) }} FCFA</span>
    </ng-template>

    <ng-template cellDef="recu_numero" let-p>
      <span class="font-monospace text-muted" style="font-size:11px">{{ p.recu_numero }}</span>
    </ng-template>

    <ng-template cellDef="nb_impressions" let-p>
      <span class="badge rounded-pill bg-light text-dark border">{{ p.nb_impressions }}×</span>
    </ng-template>

    <ng-template cellDef="mode_paiement" let-p>
      <span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">
        {{ p.mode_paiement === 'cash' ? '💵 Espèces' : '📱 Mobile' }}
      </span>
    </ng-template>

    <ng-template cellDef="date_paiement" let-p>
      <span class="text-muted" style="font-size:12px">{{ p.date_paiement }}</span>
    </ng-template>

    <ng-template cellDef="statut" let-p>
{{ p.statut }}
    </ng-template>

    <ng-template cellDef="actions" let-p>
      <div class="d-flex gap-1 justify-content-center">
        <button [routerLink]="['/familles', p.id_famille]" class="btn btn-sm btn-outline-secondary icon-btn" title="Voir la famille">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-outline-secondary icon-btn" title="Reçu / Imprimer" (click)="ouvrirRecu(p)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1" width="12" height="14" rx="1" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-outline-success icon-btn" title="Envoyer un message WhatsApp" (click)="ouvrirWhatsapp(p)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a7 7 0 0 0-6 10.6L1 15l3.5-1A7 7 0 1 0 8 1z" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
        @if (p.statut !== 'confirmé') {
          <button class="btn btn-sm btn-outline-secondary icon-btn" title="Modifier" (click)="ouvrirModifier(p)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger icon-btn" title="Supprimer" (click)="supprimer(p)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        }
      </div>
    </ng-template>

  </app-table>

</div>
  `,
  styles: [`.icon-btn { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; }`],
})
export class PaiementsGestionListComponent {

  private get = inject(GetServices);
  private del = inject(DeleteServices);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private fas = inject(FamilleService);
  private router = inject(Router)

  private readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];

  columns: TableColumn<PaiementEnrichi>[] = [
    { id: 'famille', header: 'Famille', sortable: true, accessor: p => p.famille.nom_famille },
    { id: 'montant', header: 'Montant', align: 'center', sortable: true, accessor: p => p.montant_verse },
    { id: 'recu_numero', header: 'N° Reçu', align: 'center', sortable: true, accessor: p => p.recu_numero },
    { id: 'nb_impressions', header: 'Impressions', align: 'center', sortable: true, accessor: p => p.nb_impressions },
    { id: 'mode_paiement', header: 'Mode', align: 'center', sortable: true, accessor: p => p.mode_paiement },
    { id: 'date_paiement', header: 'Date', align: 'center', sortable: true, accessor: p => p.date_paiement },
    { id: 'statut', header: 'Statut', align: 'center', sortable: true, accessor: p => p.statut },
    { id: 'actions', header: 'Actions', align: 'center', exportable: false },
  ];

  optsStatut = [
    { val: 'Tous', label: 'Tous' },
    { val: 'crée', label: 'Créé' },
    { val: 'confirmé', label: 'Vérifié' },
    { val: 'refusé', label: 'Refusé' },
  ];

  optsMode = [
    { val: 'Tous', label: 'Tous modes' },
    { val: 'cash', label: '💵 Espèces' },
    { val: 'mobile', label: '📱 Mobile' },
  ];

  filtreStatut = signal('Tous');
  filtreMode = signal('Tous');

  paiements = computed(() => this.get.getPaiements() ?? []);

  filtered = computed(() => {
    const statut = this.filtreStatut();
    const mode = this.filtreMode();
    return this.paiements().filter(p => {
      if (statut !== 'Tous' && p.statut !== statut) return false;
      if (mode !== 'Tous' && p.mode_paiement !== mode) return false;
      return true;
    });
  });

  totalMontant = computed(() => this.filtered().reduce((s, p) => s + p.montant_verse, 0));

  trackByPaiement = (p: PaiementEnrichi) => p.id_paiement;

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  initiales(p: PaiementEnrichi): string {
    return p.famille.nom_famille.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
  private hashIdx(p: PaiementEnrichi): number {
    return [...p.id_paiement].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }
  avBg(p: PaiementEnrichi): string { return this.palette[this.hashIdx(p)].bg; }
  avTxt(p: PaiementEnrichi): string { return this.palette[this.hashIdx(p)].txt; }

  ouvrirRecu(p: PaiementEnrichi): void {
    this.router.navigate(['/paiement/recus', p.id_paiement]);
  }
  ouvrirWhatsapp(p: PaiementEnrichi): void {
    const message = `Bonjour, nous confirmons la réception de votre paiement de ${this.fmt(p.montant_verse)} FCFA. Merci.`;
    this.dialog.open(WhatsappModalComponent, {
      data: {
        telPere: p.famille.tel_pere,
        telMere: p.famille.tel_mere,
        messageDefaut: message,
        variables: [
          { label: 'Montant', valeur: `${this.fmt(p.montant_verse)} FCFA` },
          { label: 'Reçu N°', valeur: p.recu_numero },
          { label: 'Date', valeur: p.date_paiement },
        ],
      } satisfies WhatsappModalData,
      width: '560px', maxWidth: '96vw',
    });
  }

  ouvrirModifier(p: PaiementEnrichi): void {
    this.dialog.open(PaiementModalComponent, {
      data: {
        famille: p.famille as any,
        totalVerse: this.fas.montantVerse(p.famille as FamilleEnrichi) - p.montant_verse,
        montantAttendu: this.fas.montantAttentu(p.famille as FamilleEnrichi),
        paiement: p,
      } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  supprimer(p: PaiementEnrichi): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Supprimer le paiement', message: `Supprimer ce paiement de ${this.fmt(p.montant_verse)} FCFA ?`, confirm: 'Supprimer' }
    }).afterClosed().subscribe(async ok => {
      if (!ok) return;
      await this.del.deletePaiement(p.id_paiement);
      this.cdr.markForCheck();
    });
  }
}