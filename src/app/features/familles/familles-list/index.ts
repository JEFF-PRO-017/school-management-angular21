// ─────────────────────────────────────────────────────────────────
// familles-list.component.ts  — orchestrateur allégé
// Bootstrap uniquement, zéro styles inline dans la section styles[]
// Logique : FamilleEnrichi (plus de type Famille)
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData } from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData } from '../famille-form';
import { FamilleEnrichi } from '../../../core/models/family';
import { FamillesToolbarComponent, FiltreEnfants, FiltreEtat } from './Components/familles-toolbar.component';
import { FamilleRowComponent, RowAction } from './Components/famille-row.component';
import { ANNEE_SCOLAIRE } from '../../../core/models/shared';
import { FamilleService } from '../../../core/models/family/famile.service';



@Component({
  selector: 'app-familles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FamillesToolbarComponent, FamilleRowComponent],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

hello
  <!-- ══ TOOLBAR (recherche + filtres) ══ -->
   <app-familles-toolbar
    [classes]="classesDispos()"
    (filtresChange)="onFiltresChange($event)"
    (nouvelleFamille)="ouvrirModalFamille(null)">
  </app-familles-toolbar> 

  <!-- ══ TABLEAU ══ -->
 @if (filtered().length > 0) {

    <div class="table-responsive border rounded-3">
      <table class="table table-sm table-hover mb-0 align-middle" style="font-size:12px;min-width:820px">
        <thead class="table-light">
          <tr>
            <th class="fw-medium text-secondary" style="font-size:11px">Famille</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Téléphones</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Enfants</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Pension</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Versé</th>
            <th class="fw-medium text-center" style="font-size:11px;background:#EBF3FC;color:#0C447C">Restant</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Prochain RDV</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">GPS</th>
            <th class="fw-medium text-secondary text-center" style="font-size:11px">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (f of filtered(); track f.id_famille) {
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

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1">
      <span class="text-muted" style="font-size:11px">
        {{ filtered().length }} famille(s) · {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
      <span class="text-muted" style="font-size:11px">
        Attendu : <strong>{{ fmt(totalAttenduGlobal()) }}</strong> FCFA
        · Versé : <strong>{{ fmt(totalVerseGlobal()) }}</strong> FCFA
        · Restant :
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
      <span class="text-primary" style="cursor:pointer" (click)="ouvrirModalFamille(null)">
        créer la première
      </span>
    </div>
  } 

</div>
  `,
})
export class FamillesListComponent implements OnInit {

  cache = inject(CacheService);          // public → accessible dans le template
  private data = inject(DataService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private faFunction = inject(FamilleService)

  anneeScolaire = ANNEE_SCOLAIRE

  readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' },
    { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' },
    { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#E0F2F1', txt: '#00695C' },
  ];

  // ── État filtres (reçu depuis le toolbar via Output) ──
  private _search = signal('');
  private _etat = signal<FiltreEtat>('tous');
  private _classe = signal('');
  private _enfants = signal<FiltreEnfants>(0);

  onFiltresChange(e: {
    search: string;
    etat: FiltreEtat;
    classe: string;
    enfants: FiltreEnfants;
  }): void {

    this._search.set(e.search);
    this._etat.set(e.etat);
    this._classe.set(e.classe);
    this._enfants.set(e.enfants);

    console.log('onFiltresChange', e);
  }
  hasFiltre = computed(() =>
    !!this._search()
    || this._etat() !== 'tous'
    || this._classe() !== ''
    || this._enfants() !== 0
  );
  // ── Classes disponibles ──
  classesDispos = computed(() => {
    const cMap = this.cache.classesMap();
    const ids = new Set((this.cache.getEleves() ?? []).map(e => e.id_classe));
    return [...ids]
      .map(id => ({ id, nom: cMap.get(id)?.nom_classe ?? id }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  filtered = computed(() => {

    console.log('filtered recalculé');

    const q = this._search().toLowerCase();
    const etat = this._etat();
    const cls = this._classe();
    const nbEnf = this._enfants();

    return (this.cache.getFamilles() ?? []).filter((f: FamilleEnrichi) => {

      if (
        q &&
        !f.nom_famille.toLowerCase().includes(q) &&
        !f.tel_pere?.includes(q) &&
        !f.tel_mere?.includes(q)
      ) {
        return false;
      }

      const anneesvc =
        this.faFunction.anneeSvcEncours(f.annee_scolaires);


      const attendu = this.faFunction.attentu(anneesvc)
      const verse = this.faFunction.verse(f.paiements ?? [])
      const restant = this.faFunction.restant(attendu, verse)

      if (etat === 'solde' && !(restant > 0 && attendu > 0))
        return false;

      if (etat === 'sans-gps' && !!(f.latitude && f.longitude))
        return false;

      if (
        cls &&
        !(f.eleves ?? []).some(e => e.id_classe === cls)
      )
        return false;

      const nb = (f.eleves ?? []).length;

      if (nbEnf === 1 && nb !== 1) return false;
      if (nbEnf === 2 && nb !== 2) return false;
      if (nbEnf === 3 && nb < 3) return false;

      return true;
    });
  });

  // ── Totaux pied ──
  totalEleves = computed(() => this.filtered().reduce((s, f) => s + (f.eleves ?? []).length, 0));
  totalAttenduGlobal = computed(() => this.filtered().reduce((s, f) =>
    s + (f.montant_total_attendu ?? 0) - (f.montant_reduction ?? 0), 0));

  totalVerseGlobal = computed(() => this.filtered().reduce((s, f) =>
    s + (f.paiements ?? []).reduce((sp: number, p: { montant_verse: string | number; }) => sp + (+p.montant_verse), 0), 0)
  );

  totalRestantGlobal = computed(() => Math.max(0, this.totalAttenduGlobal() - this.totalVerseGlobal()));

  ngOnInit(): void { this.cache.getClasses(); }

  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  // ── Dispatch actions du row ──
  onRowAction(action: RowAction, f: FamilleEnrichi): void {
    switch (action) {
      case 'paiement': return this.ouvrirModalPaiement(f);
      case 'modifier': return this.ouvrirModalFamille(f);
      case 'eleve': return this.ouvrirModalEleve(f);
      case 'supprimer': return this.confirmerSuppression(f);
    }
  }

  // ── Modals ──
  private totalVerse(f: FamilleEnrichi): number {
    return (f.paiements ?? []).reduce((s, p) => s + (+p.montant_verse), 0);
  }
  private montantAttendu(f: FamilleEnrichi): number {
    const anneesvc = this.faFunction.anneeSvcEncours(f.annee_scolaires)
    return (anneesvc?.montant_total_attendu ?? 0) - (anneesvc?.montant_reduction ?? 0);
  }

  ouvrirModalPaiement(f: any): void {
    this.dialog.open(PaiementModalComponent, {
      data: { famille: f, totalVerse: this.totalVerse(f), montantAttendu: this.montantAttendu(f) } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalFamille(f: FamilleEnrichi | null): void {
    this.dialog.open(FamilleModalComponent, {
      data: { famille: f } satisfies FamilleModalData,
      width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalEleve(f: any): void {
    this.dialog.open(EleveModalComponent, {
      data: { famille: f } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  confirmerSuppression(f: FamilleEnrichi): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer la famille',
        message: `Supprimer "${f.nom_famille}" ? Cette action est irréversible.`,
        confirm: 'Supprimer',
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.cache.removeFamille(f.id_famille);
      this.data.deleteFamille(f.id_famille);
      this.snack.open('Famille supprimée', 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    });
  }
}