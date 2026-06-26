import {
  Component, inject, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit, signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService }    from '../../../core/services/cache.service';
import { DataService }     from '../../../core/services/data.service';
import { FamilleService }  from '../../../core/models/family/famile.service';
import { ANNEE_SCOLAIRE }  from '../../../core/models/shared';
import { FamilleEnrichi }  from '../../../core/models/family';

import { ConfirmDialogComponent }   from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData }       from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData }   from '../famille-form';

import { FamillesToolbarComponent, FiltreEnfants, FiltreEtat } from './Components/familles-toolbar.component';
import { FamilleRowComponent, RowAction } from './Components/famille-row.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-familles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FamillesToolbarComponent, FamilleRowComponent, PaginationComponent],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- Toolbar -->
  <app-familles-toolbar
    [classes]="classesDispos()"
    (filtresChange)="onFiltresChange($event)"
    (nouvelleFamille)="ouvrirModalFamille(null)">
  </app-familles-toolbar>

  @if (filtered().length > 0) {

    <!-- Tableau (page courante uniquement) -->
    <div class="table-responsive border rounded-3">
      <table class="table table-sm table-hover mb-0 align-middle"
             style="font-size:12px;min-width:820px">
        <thead class="table-light">
          <tr>
            <th class="fw-medium text-secondary" style="font-size:11px">Famille</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Téléphones</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Enfants</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Attendu</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Versé</th>
            <th class="fw-medium text-center"
                style="font-size:11px;background:#EBF3FC;color:#0C447C">Restant</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">GPS</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (f of page(); track f.id_famille) {
            <tr app-famille-row
                [f]="f"
                [classesMap]="cache.classesMap()"
                [palette]="palette"
                (action)="onRowAction($event, f)">
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <app-pagination
      [total]="filtered().length"
      [pageSize]="pageSize"
      (pageChange)="onPage($event)">
    </app-pagination>

    <!-- Pied — totaux globaux (toute la liste filtrée, pas seulement la page) -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">
        {{ filtered().length }} famille(s) · {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
      <span class="text-muted" style="font-size:11px">
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
      <span class="text-primary" style="cursor:pointer"
            (click)="ouvrirModalFamille(null)">créer la première</span>
    </div>
  }

</div>
  `,
})
export class FamillesListComponent implements OnInit {

  cache       = inject(CacheService);
  private data        = inject(DataService);
  private dialog      = inject(MatDialog);
  private snack       = inject(MatSnackBar);
  private cdr         = inject(ChangeDetectorRef);
  private fas         = inject(FamilleService);

  anneeScolaire = ANNEE_SCOLAIRE;
  readonly pageSize = 10;

  readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];

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
    // Retour page 1 à chaque changement de filtre
    this._debut.set(0);
    this._fin.set(this.pageSize);
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

    return (this.cache.getFamilles() ?? []).filter((f: FamilleEnrichi) => {
      if (q && !f.nom_famille.toLowerCase().includes(q)
             && !f.tel_pere?.includes(q)
             && !f.tel_mere?.includes(q)) return false;

      const attendu  = this.fas.montantAttentu(f);
      const verse    = this.fas.montantVerse(f);
      const restant  = this.fas.montantRestant(attendu, verse);

      if (etat === 'solde'    && !(restant > 0 && attendu > 0)) return false;
      if (etat === 'sans-gps' && !!(f.latitude && f.longitude)) return false;
      if (cls && !(f.eleves ?? []).some(e => e.id_classe === cls)) return false;

      const nb = (f.eleves ?? []).length;
      if (nbEnf === 1 && nb !== 1) return false;
      if (nbEnf === 2 && nb !== 2) return false;
      if (nbEnf === 3 && nb < 3)   return false;
      return true;
    });
  });

  // ── Pagination ───────────────────────────────────────────────
  private _debut = signal(0);
  private _fin   = signal(this.pageSize);

  page = computed(() => this.filtered().slice(this._debut(), this._fin()));

  onPage(e: { debut: number; fin: number }): void {
    this._debut.set(e.debut);
    this._fin.set(e.fin);
  }

  // ── Totaux globaux (liste filtrée entière) ───────────────────
  totalEleves        = computed(() => this.filtered().reduce((s, f) => s + (f.eleves ?? []).length, 0));
  totalAttenduGlobal = computed(() => this.filtered().reduce((s, f) =>
    s + this.fas.montantAttentu(f),0));
  totalVerseGlobal   = computed(() => this.filtered().reduce((s, f) =>
    s + this.fas.montantVerse(f), 0));
  totalRestantGlobal = computed(() => Math.max(0, this.totalAttenduGlobal() - this.totalVerseGlobal()));

  ngOnInit(): void { this.cache.getClasses(); }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  // ── Actions row ──────────────────────────────────────────────
  onRowAction(action: RowAction, f: FamilleEnrichi): void {
    switch (action) {
      case 'paiement':  return this.ouvrirModalPaiement(f);
      case 'modifier':  return this.ouvrirModalFamille(f);
      case 'eleve':     return this.ouvrirModalEleve(f);
      case 'supprimer': return this.confirmerSuppression(f);
    }
  }

  private montantAttendu(f: FamilleEnrichi): number {
    return this.fas.montantAttentu(f);
  }

  ouvrirModalPaiement(f: FamilleEnrichi): void {
    this.dialog.open(PaiementModalComponent, {
      data: { famille: f as any, totalVerse: this.fas.montantVerse(f), montantAttendu: this.montantAttendu(f) } satisfies PaiementModalData,
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
      this.cache.removeFamille(f.id_famille);
      this.data.deleteFamille(f.id_famille);
      this.snack.open('Famille supprimée', 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    });
  }
}