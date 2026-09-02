import {
  Component, inject, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService }    from '../../../../core/services/cache.service';
import { FamilleService }  from '../../../../core/models/family/famile.service';
import { ANNEE_SCOLAIRE }  from '../../../../core/models/shared';
import { FamilleEnrichi }  from '../../../../core/models/family';

import { ConfirmDialogComponent }   from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData }       from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData }   from '../famille-form';

import { FamillesToolbarComponent, FiltreEnfants, FiltreEtat } from './Components/familles-toolbar.component';
import { TableComponent, CellDefDirective, TableColumn } from '../../../../shared/components/table/table.component';
import { GetServices } from '../../../../core/services/@data';

export type RowAction = 'detail' | 'paiement' | 'modifier' | 'eleve' | 'supprimer';

@Component({
  selector: 'app-familles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FamillesToolbarComponent, TableComponent, CellDefDirective, RouterLink],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <app-familles-toolbar
    [classes]="classesDispos()"
    (filtresChange)="onFiltresChange($event)"
    (nouvelleFamille)="ouvrirModalFamille(null)">
  </app-familles-toolbar>

  @if (filtered().length > 0) {

    <app-table
      [columns]="columns"
      [data]="filtered()"
      [pageSize]="pageSize"
      [trackByFn]="trackByFamille"
      [isExport]="true"
      exportFilename="familles"
      emptyMessage="Aucune famille ne correspond à ces critères">

      <ng-template cellDef="famille" let-f>
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
               [style.background]="avBg(f)" [style.color]="avTxt(f)"
               style="width:28px;height:28px;font-size:10px;font-weight:600">
            {{ initiales(f) }}
          </div>
          <span class="fw-medium">{{ f.nom_famille }}</span>
        </div>
      </ng-template>

      <ng-template cellDef="tel" let-f>
        <div style="font-size:11px;color:#666">
          <div>{{ f.tel_pere || '—' }}</div>
          @if (f.tel_mere) { <div class="text-muted">{{ f.tel_mere }}</div> }
        </div>
      </ng-template>

      <ng-template cellDef="enfants" let-f>
        <span class="badge rounded-pill bg-success-subtle text-success-emphasis">
          {{ nbEnfantsLabel(f) }}
        </span>
        @if (nomClasses(f).length > 0) {
          <div class="text-muted mt-1" style="font-size:10px">{{ nomClasses(f).join(', ') }}</div>
        }
      </ng-template>

      <ng-template cellDef="verse" let-f>
        <span [class.text-success]="isSolde(f)">{{ fmt(fas.montantVerse(f)) }}</span>
      </ng-template>

      <ng-template cellDef="restant" let-f>
        @if (isOk(f)) {
          <span class="badge rounded-pill bg-success-subtle text-success-emphasis">Soldé ✓</span>
        } @else if (aDette(f)) {
          <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis">{{ fmt(restant(f)) }}</span>
        } @else {
          <span class="text-muted">—</span>
        }
      </ng-template>

      <ng-template cellDef="gps" let-f>
        @if (f.latitude && f.longitude) {
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z" stroke="#0F6E56" stroke-width="1.3" fill="#9FE1CB"/>
            <circle cx="8" cy="6" r="1.5" stroke="#0F6E56" stroke-width="1.2"/>
          </svg>
        } @else {
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z" stroke="#ccc" stroke-width="1.3" fill="#f0f0f0"/>
            <circle cx="8" cy="6" r="1.5" stroke="#ccc" stroke-width="1.2"/>
          </svg>
        }
      </ng-template>

      <ng-template cellDef="actions" let-f>
        <div class="d-flex gap-1 justify-content-center">
          <button [routerLink]="['/familles', f.id_famille]" class="btn btn-sm btn-outline-secondary icon-btn" title="Voir la famille">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="btn btn-sm icon-btn"
                  [class.btn-outline-warning]="aDette(f)"
                  [class.btn-outline-secondary]="!aDette(f)"
                  title="Payer pension" (click)="onRowAction('paiement', f)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
              <circle cx="5" cy="10" r="1" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-secondary icon-btn" title="Modifier" (click)="onRowAction('modifier', f)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-secondary icon-btn" title="Ajouter un élève" (click)="onRowAction('eleve', f)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
              <path d="M1 13c0-2.5 2.5-4 6-4M13 10v4M11 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger icon-btn" title="Supprimer" (click)="onRowAction('supprimer', f)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </ng-template>

    </app-table>

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
      <span class="text-muted" style="font-size:11px">
        {{ filtered().length }} famille(s) · {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
      <span class="text-muted" style="font-size:11px">
        Reduction Spectial: <strong>{{ fmt(totalReductionSpecial()) }}</strong> FCFA ·
        Reduction %Enfants: <strong>{{ fmt(totalReduction()) }}</strong> FCFA ·
        Attendu : <strong>{{ fmt(totalAttenduGlobal()) }}</strong> FCFA ·
        Versé : <strong>{{ fmt(totalVerseGlobal()) }}</strong> FCFA ·
        Restant :
        <strong [class.text-success]="totalRestantGlobal() === 0"
                [class.text-danger]="totalRestantGlobal() > 0">
          {{ fmt(totalRestantGlobal()) }} FCFA
        </strong>
      </span>
    </div>

  } @else if (hasFiltre()) {
    <div class="text-center text-muted py-5">Aucune famille ne correspond à ces critères</div>
  } @else {
    <div class="text-center text-muted py-5">
      Aucune famille enregistrée —
      <span class="text-primary" style="cursor:pointer" (click)="ouvrirModalFamille(null)">créer la première</span>
    </div>
  }

</div>
  `,
  styles: [`.icon-btn { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; }`],
})
export class FamillesListComponent implements OnInit {

  private cache       = inject(CacheService);
  private get = inject(GetServices);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);
  fas            = inject(FamilleService); // public : utilisé dans les cellDef du template

  anneeScolaire = ANNEE_SCOLAIRE;
  readonly pageSize = 10;

  private readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];

  columns: TableColumn<FamilleEnrichi>[] = [
    { id: 'famille',           header: 'Famille',            sortable: true, accessor: f => f.nom_famille },
    { id: 'tel',               header: 'Téléphones',         align: 'center', exportable: false, accessor: f => f.tel_pere ?? '' },
    { id: 'enfants',           header: 'Enfants',            align: 'center', accessor: f => (f.eleves ?? []).length },
    { id: 'reductionSpecial',  header: 'Reduction Special',  align: 'center', sortable: true, accessor: f => this.fas.anneeSvcEncours(f)?.montant_reduction_special ?? 0 },
    { id: 'reductionPct',      header: 'Reduction %Enfants', align: 'center', sortable: true, accessor: f => this.fas.anneeSvcEncours(f)?.montant_reduction ?? 0 },
    { id: 'attendu',           header: 'Attendu',            align: 'center', sortable: true, accessor: f => this.fas.montantAttentu(f) },
    { id: 'verse',             header: 'Versé',              align: 'center', sortable: true, accessor: f => this.fas.montantVerse(f) },
    { id: 'restant',           header: 'Restant',            align: 'center', headerBg: '#EBF3FC', headerColor: '#0C447C',
      accessor: f => this.fas.montantRestant(this.fas.montantAttentu(f), this.fas.montantVerse(f)) },
    { id: 'gps',               header: 'GPS',                align: 'center', exportable: false },
    { id: 'actions',           header: 'Actions',            align: 'center', exportable: false },
  ];

  trackByFamille = (f: FamilleEnrichi) => f.id_famille;

  // ── Filtres ──────────────────────────────────────────────────
  private _search  = signal('');
  private _etat    = signal<FiltreEtat>('tous');
  private _classe  = signal('');
  private _enfants = signal<FiltreEnfants>(0);

  onFiltresChange(e: { search: string; etat: FiltreEtat; classe: string; enfants: FiltreEnfants }): void {
    this._search.set(e.search);
    this._etat.set(e.etat);
    this._classe.set(e.classe);
    this._enfants.set(e.enfants);
  }

  hasFiltre = computed(() =>
    !!this._search() || this._etat() !== 'tous'
    || this._classe() !== '' || this._enfants() !== 0
  );

  classesDispos = computed(() => {
    const cMap = this.cache.classesMap();
    const ids  = new Set((this.cache.getEleves() ?? []).map(e => e.id_classe));
    return [...ids]
      .map(id => ({ id, nom: cMap.get(id)?.nom_classe ?? id }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  filtered = computed(() => {
    const q      = this._search().toLowerCase();
    const etat   = this._etat();
    const cls    = this._classe();
    const nbEnf  = this._enfants();

    return (this.get.getFamilles() ?? []).filter((f: FamilleEnrichi) => {
      if (q && !f.nom_famille.toLowerCase().includes(q)
             && !f.tel_pere?.includes(q)
             && !f.tel_mere?.includes(q)
             && !(f.eleves ?? []).some(e => e.nom.toLowerCase().includes(q) || e.prenom.toLowerCase().includes(q))
            ) return false;

      const attendu = this.fas.montantAttentu(f);
      const verse   = this.fas.montantVerse(f);
      const restant = this.fas.montantRestant(attendu, verse);

      if (etat === 'no-solde' && !(restant > 0 && attendu > 0)) return false;
      if (etat === 'solde'    && !(restant === 0 && attendu > 0)) return false;
      if (etat === 'sans-gps' && !!(f.latitude && f.longitude)) return false;
      if (cls && !(f.eleves ?? []).some(e => e.id_classe === cls)) return false;

      const nb = (f.eleves ?? []).length;
      if (nbEnf === 1 && nb !== 1) return false;
      if (nbEnf === 2 && nb !== 2) return false;
      if (nbEnf === 3 && nb < 3)   return false;
      return true;
    });
  });

  // ── Totaux globaux (liste filtrée entière) ───────────────────
  totalEleves           = computed(() => this.filtered().reduce((s, f) => s + (f.eleves ?? []).length, 0));
  totalReduction        = computed(() => this.filtered().reduce((s, f) => s + +(this.fas.anneeSvcEncours(f)?.montant_reduction ?? 0), 0));
  totalReductionSpecial = computed(() => this.filtered().reduce((s, f) => s + +(this.fas.anneeSvcEncours(f)?.montant_reduction_special ?? 0), 0));
  totalAttenduGlobal    = computed(() => this.filtered().reduce((s, f) => s + this.fas.montantAttentu(f), 0));
  totalVerseGlobal      = computed(() => this.filtered().reduce((s, f) => s + this.fas.montantVerse(f), 0));
  totalRestantGlobal    = computed(() => Math.max(0, this.totalAttenduGlobal() - this.totalVerseGlobal()));

  ngOnInit(): void { this.cache.getClasses(); }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  // ── Helpers ex-FamilleRowComponent, réutilisés dans les cellDef ──
  initiales(f: FamilleEnrichi): string {
    return f.nom_famille.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
  private hashIdx(f: FamilleEnrichi): number {
    return [...f.id_famille].reduce((s, c) => s + c.charCodeAt(0), 0) % (this.palette.length || 1);
  }
  avBg(f: FamilleEnrichi): string { return this.palette[this.hashIdx(f)]?.bg ?? '#e0e0e0'; }
  avTxt(f: FamilleEnrichi): string { return this.palette[this.hashIdx(f)]?.txt ?? '#333'; }

  nomClasses(f: FamilleEnrichi): string[] {
    return [...new Set((f.eleves ?? []).map(e =>
      this.cache.classesMap().get(e.id_classe)?.nom_classe ?? e.id_classe
    ))];
  }
  nbEnfantsLabel(f: FamilleEnrichi): string {
    const n = (f.eleves ?? []).length;
    return `${n} élève${n > 1 ? 's' : ''}`;
  }
  restant(f: FamilleEnrichi): number {
    return this.fas.montantRestant(this.fas.montantAttentu(f), this.fas.montantVerse(f));
  }
  aDette(f: FamilleEnrichi): boolean { return this.restant(f) > 0 && this.fas.montantAttentu(f) > 0; }
  isOk(f: FamilleEnrichi): boolean { return this.restant(f) === 0 && this.fas.montantAttentu(f) > 0; }
  isSolde(f: FamilleEnrichi): boolean { return this.fas.montantVerse(f) >= this.fas.montantAttentu(f) && this.fas.montantAttentu(f) > 0; }

  // ── Actions row ──────────────────────────────────────────────
  onRowAction(action: RowAction, f: FamilleEnrichi): void {
    switch (action) {
      case 'paiement':  return this.ouvrirModalPaiement(f);
      case 'modifier':  return this.ouvrirModalFamille(f);
      case 'eleve':     return this.ouvrirModalEleve(f);
      case 'supprimer': return this.confirmerSuppression(f);
    }
  }

  ouvrirModalPaiement(f: FamilleEnrichi): void {
    this.dialog.open(PaiementModalComponent, {
      data: { famille: f as any, totalVerse: this.fas.montantVerse(f), montantAttendu: this.fas.montantAttentu(f) } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalFamille(f: FamilleEnrichi | null): void {
    this.dialog.open(FamilleModalComponent, {
      data: { famille: f } satisfies FamilleModalData,
      width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalEleve(f: FamilleEnrichi): void {
    this.dialog.open(EleveModalComponent, {
      data: { famille: f } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  confirmerSuppression(f: FamilleEnrichi): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Supprimer la famille', message: `Supprimer "${f.nom_famille}" ?`, confirm: 'Supprimer' }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.snack.open('Famille supprimée', 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    });
  }
}