import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';

import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { InsolvablesPdfService } from '../../../core/services/@insolvables/insolvables-pdf.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { _dernierRdvFamille, _fmtDate } from '../../../core/services/@insolvables';
import { EleveEnrichi, FamilleService, Famille, FamilleEnrichi, MsgTemplate, ANNEE_SCOLAIRE, POURCENT_PENSION } from '../../../core/models';

// ── Modèle enrichi par élève ──────────────────────────────────────
export interface EleveData extends EleveEnrichi {
  nb_enfants_famille: number;   // nb frères/sœurs actifs dans la famille
  montant_par_enfant: number;   // part versée imputée à cet élève
  reste_par_enfant: number;   // pension - montant_par_enfant
  verse_famille: number;   // total versé par la famille
  attendu_famille: number;   // total attendu pour la famille
  restant_famille: number;   // restant global de la famille
  moratoire_depasse: boolean;  // dernier RDV de moratoire dépassé aujourd'hui
  insolvable: boolean
}

@Component({
  selector: 'app-insolvables-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe, PaginationComponent],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE OUTILS ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <div class="d-flex flex-column" style="gap:1px">
      <span class="fw-medium" style="font-size:12px">Suivi des impayés</span>
      <span class="text-primary" style="font-size:10px">{{ resumeSous() }}</span>
    </div>

    <div class="vr mx-1"></div>

    <!-- Versé < seuil -->
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Versé &lt;</span>
      <input [formControl]="ctrlSeuil" type="number" min="0" step="1000"
             class="form-control form-control-sm" style="width:110px"
             placeholder="50 000">
      <span class="text-muted" style="font-size:11px">FCFA</span>
    </div>

    <!-- Restant < max -->
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Restant &lt;</span>
      <input [formControl]="ctrlMaxRestant" type="number" min="0" step="5000"
             class="form-control form-control-sm" style="width:110px"
             placeholder="200 000">
      <span class="text-muted" style="font-size:11px">FCFA</span>
    </div>

    <!-- Date RDV -->
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Exclure RDV après</span>
      <input [formControl]="ctrlDateRef" type="date"
             class="form-control form-control-sm" style="width:140px">
    </div>

    <div class="vr mx-1"></div>

    <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
            (click)="exportPdf()" [disabled]="cibles().length === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 1h7l3 3v11H3V1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M10 1v3h3M6 9h4M6 11.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      PDF {{ labelCibles() }}
    </button>

    <button class="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
            (click)="envoyerRappels()" [disabled]="cibles().length === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z"
              stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      WhatsApp {{ labelCibles() }}
    </button>
  </div>

  <!-- ══ CHIPS FILTRES ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <span class="text-muted" style="font-size:11px">Classe</span>
    <button class="btn btn-sm"
            [class.btn-primary]="filtreClasse() === ''"
            [class.btn-outline-secondary]="filtreClasse() !== ''"
            style="font-size:11px;padding:2px 10px"
            (click)="setClasse('')">Toutes</button>
    @for (c of classes(); track c.id_classe) {
      <button class="btn btn-sm"
              [class.btn-primary]="filtreClasse() === c.id_classe"
              [class.btn-outline-secondary]="filtreClasse() !== c.id_classe"
              style="font-size:11px;padding:2px 10px"
              (click)="setClasse(c.id_classe)">{{ c.nom_classe }}</button>
    }

    <div class="vr mx-1"></div>

    <span class="text-muted" style="font-size:11px">Message</span>
    @if (templates().length === 0) {
      <span class="text-muted" style="font-size:11px">Aucun template</span>
    } @else {
      @for (t of templates(); track t.id_template) {
        <button class="btn btn-sm"
                [class.btn-primary]="templateChoisi()?.id_template === t.id_template"
                [class.btn-outline-secondary]="templateChoisi()?.id_template !== t.id_template"
                style="font-size:11px;padding:2px 10px"
                (click)="setTemplate(t)">{{ t.objet }}</button>
      }
    }
  </div>

  <!-- ══ CONTENU ══ -->
  @if (seuil() <= 0 && maxRestant() <= 0) {
    <div class="text-center text-muted py-5">
      Saisissez un montant seuil pour lancer la recherche
    </div>

  } @else if (filtered().length === 0) {
    <div class="text-center text-muted py-5">
      Aucun élève correspondant aux critères
    </div>

  } @else {

    <!-- Barre sélection -->
    <div class="d-flex align-items-center gap-3 py-1">
      <div class="form-check mb-0">
        <input type="checkbox" class="form-check-input" id="chkTout"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <label class="form-check-label" for="chkTout" style="font-size:12px">
          Tout sélectionner
        </label>
      </div>
      @if (selection().size > 0) {
        <span class="badge text-bg-primary">
          {{ selection().size }} / {{ filtered().length }} sél.
        </span>
        <button class="btn btn-sm btn-outline-secondary"
                style="font-size:11px;padding:1px 8px"
                (click)="viderSelection()">Désélectionner</button>
      }
    </div>

    <!-- Tableau -->
    <div class="table-responsive border rounded">
      <table class="table table-sm table-hover mb-0" style="font-size:12px">
        <thead class="table-light">
          <tr>
  <th style="width:32px"></th>
  <th class="text-start">Élève</th>
  <th class="text-center">Famille</th>
  <th class="text-center">Classe</th>
  <th class="text-center">Contact</th>
  <th class="text-center table-primary">Versé/e</th>
  <th class="text-center table-primary">Versé T</th>
  <th class="text-center">Attendu</th>
  <th class="text-center table-warning">Reste</th>
  <th class="text-center">Prochain RDV</th>
  <th class="text-center">WA</th>
          </tr>
        </thead>
        <tbody>
          @for (e of pageCourante(); track e.id_eleve) {
<!-- TBODY — une ligne @for -->
<tr [class.table-active]="estSelectionne(e.id_eleve)">

  <td class="text-center align-middle">
    <input type="checkbox" class="form-check-input"
           [checked]="estSelectionne(e.id_eleve)"
           (change)="toggleLigne(e.id_eleve, $event)">
  </td>

  <!-- Élève -->
  <td class="fw-medium align-middle">{{ e.nom }} {{ e.prenom }}</td>

  <!-- Famille -->
  <td class="text-center align-middle" style="font-size:11px">
    <div> {{ e.famille?.nom_famille }}</div>
    <div class="text-muted" style="font-size:10px">({{ e.nb_enfants_famille }}) enfant(s)</div>
  </td>

  <!-- Classe -->
  <td class="text-center align-middle" style="font-size:11px">
    <div>{{ e.classe?.nom_classe }}</div>
    <div class="text-muted" style="font-size:10px">{{ e.classe?.enseignant_principal }}</div>
  </td>

  <!-- Contact -->
  <td class="text-center align-middle" style="font-size:11px">
    <div>{{ e.famille?.tel_pere || '—' }}</div>
    @if (e.famille?.tel_mere) {
      <div class="text-muted">{{ e.famille?.tel_mere }}</div>
    }
  </td>

  <!-- Versé/e (par élève) -->
  <td class="text-center align-middle table-primary">
    <span class="badge text-bg-warning">{{ e.montant_par_enfant | number }} FCFA</span>
  </td>

  <!-- Versé T (total famille) -->
  <td class="text-center align-middle table-primary" style="font-size:11px">
    {{ e.verse_famille | number }} FCFA
  </td>

  <!-- Attendu famille -->
  <td class="text-center align-middle" style="font-size:11px">
    {{ e.attendu_famille | number }} FCFA
  </td>

  <!-- Reste -->
  <td class="text-center align-middle">
    <span class="badge"
          [class.text-bg-danger]="e.moratoire_depasse"
          [class.text-bg-warning]="!e.moratoire_depasse">
      {{ e.restant_famille | number }} FCFA
    </span>
  </td>

  <!-- Prochain RDV -->
  <td class="text-center align-middle" style="font-size:11px">
    @if (prochainRdv(e.famille)) {
      <span class="badge"
            [class.text-bg-danger]="e.moratoire_depasse"
            [class.text-bg-info]="!e.moratoire_depasse">
        {{ prochainRdv(e.famille) }}
      </span>
    } @else {
      <span class="text-muted">—</span>
    }
  </td>

  <!-- WA -->
  <td class="text-center align-middle">
    <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center"
            style="width:28px;height:28px;padding:0"
            title="WhatsApp individuel"
            (click)="waIndividuel(e.famille)">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z"
              stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
    </button>
  </td>

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

    <!-- Pied de liste -->
    <div class="d-flex justify-content-between flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">
        {{ filtered().length }} élève(s) en retard
        <!-- · Total restant : {{ totalRestantGlobal() | number }} FCFA -->
      </span>
      <span class="text-muted" style="font-size:11px">
        @if (seuil() > 0)      { Versé &lt; {{ seuil() | number }} · }
        @if (maxRestant() > 0) { Restant &lt; {{ maxRestant() | number }} · }
        <!-- @if (dateRefSignal())  { RDV exclu après {{ _fmtDate(dateRefSignal()) }} } -->
      </span>
    </div>
  }

</div>
  `,
  // Zéro style local — tout Bootstrap
})
export class InsolvablesListComponent implements OnInit {

  private cache = inject(CacheService);
  private data = inject(DataService);
  private wa = inject(WhatsappService);
  private pdf = inject(InsolvablesPdfService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private fasSvc = inject(FamilleService);

  // ── Pagination ───────────────────────────────────────────────────
  readonly pageSize = 15;
  private _debut = signal(0);
  private _fin = signal(this.pageSize);

  pageCourante = computed(() => this.filtered().slice(this._debut(), this._fin()));

  onPage(e: { debut: number; fin: number }): void {
    this._debut.set(e.debut);
    this._fin.set(e.fin);
  }

  // ── FormControls → signals réactifs ─────────────────────────────
  ctrlSeuil = new FormControl<number | null>(null);
  ctrlMaxRestant = new FormControl<number | null>(null);
  ctrlDateRef = new FormControl<string>('');

  private seuil$ = toSignal(this.ctrlSeuil.valueChanges,
    { initialValue: this.ctrlSeuil.value });
  private maxRestant$ = toSignal(this.ctrlMaxRestant.valueChanges,
    { initialValue: this.ctrlMaxRestant.value });
  private dateRef$ = toSignal(this.ctrlDateRef.valueChanges,
    { initialValue: this.ctrlDateRef.value ?? '' });

  seuil = computed<number>(() => +(this.seuil$() ?? 0));
  maxRestant = computed<number>(() => +(this.maxRestant$() ?? 0));
  dateRefSignal = computed<string>(() => this.dateRef$() ?? '');

  // ── Filtres ──────────────────────────────────────────────────────
  filtreClasse = signal('');
  templateChoisi = signal<MsgTemplate | null>(null);
  selection = signal<Set<string>>(new Set());

  setClasse(v: string) { this.filtreClasse.set(v); }
  setTemplate(t: MsgTemplate) { this.templateChoisi.set(t); }

  // ── Données brutes ───────────────────────────────────────────────
  classes = computed(() => this.cache.getClasses());
  templates = computed(() => this.data.getTemplates());

  /** Liste enrichie par élève — calculée une fois à l'init */
  elevesData = signal<EleveData[]>([]);

  ngOnInit(): void {
    this.data.loadTemplates().then(() => {
      const rappel = this.data.getTemplates()
        .find(t => t.type === 'rappel' || t.type === 'relance');
      if (rappel) this.templateChoisi.set(rappel);
      this.cdr.markForCheck();
    });
    this.elevesData.set(this.fasSvc.construireElevesDataAvecFamille(this.data.getFamilles()));
  }

  /** Transforme chaque famille → un EleveData par élève actif */

  // ── Liste filtrée ────────────────────────────────────────────────
  filtered = computed<EleveData[]>(() => {
    const seuil = this.seuil();
    const maxRestant = this.maxRestant();
    const dateRef = this.dateRefSignal();
    const classe = this.filtreClasse();

    if (seuil <= 0 && maxRestant <= 0 && !dateRef && !classe) return this.elevesData();

    return this.elevesData().filter(e => {
      if (seuil > 0 && e.montant_par_enfant >= seuil) return false;
      if (maxRestant > 0 && e.reste_par_enfant >= maxRestant) return false;
      if (dateRef) {
        const rdv = _dernierRdvFamille(e.famille);
        if (rdv && rdv > dateRef) return false;
      }
      if (classe && e.classe?.id_classe !== classe) return false;
      return true;
    });
  });

  // ── Sélection (par id_eleve) ─────────────────────────────────────
  estSelectionne(idEleve: string): boolean { return this.selection().has(idEleve); }

  toutSelectionne = computed(() =>
    this.filtered().length > 0 &&
    this.filtered().every(e => this.selection().has(e.id_eleve))
  );
  selectionPartielle = computed(() =>
    this.selection().size > 0 && !this.toutSelectionne()
  );

  toggleLigne(idEleve: string, evt: Event): void {
    const checked = (evt.target as HTMLInputElement).checked;
    this.selection.update(s => {
      const n = new Set(s);
      checked ? n.add(idEleve) : n.delete(idEleve);
      return n;
    });
  }

  toggleTout(evt: Event): void {
    const checked = (evt.target as HTMLInputElement).checked;
    this.selection.set(
      checked ? new Set(this.filtered().map(e => e.id_eleve)) : new Set()
    );
  }

  viderSelection(): void { this.selection.set(new Set()); }

  /**
   * Cibles pour PDF / WhatsApp.
   * - PDF  → liste d'EleveData (exportée par élève)
   * - WA   → familles dédupliquées (un message par famille)
   */
  cibles = computed<EleveData[]>(() =>
    this.selection().size > 0
      ? this.filtered().filter(e => this.selection().has(e.id_eleve))
      : this.filtered()
  );

  /** Familles dédupliquées pour WhatsApp */
  famillesCibles = computed<Famille[]>(() => {
    const seen = new Set<string>();
    return this.cibles()
      .filter(e => e.famille && !seen.has(e.id_famille) && seen.add(e.id_famille))
      .map(e => e.famille!);
  });

  labelCibles(): string {
    const n = this.cibles().length;
    return this.selection().size > 0 ? `(${n} sél.)` : `(${n})`;
  }

  // ── Stats ────────────────────────────────────────────────────────
  resumeSous = computed(() => {
    if (this.seuil() <= 0 && this.maxRestant() <= 0)
      return 'Saisissez un seuil pour filtrer';
    const n = this.filtered().length;
    const sel = this.selection().size;
    return sel > 0
      ? `${n} élève(s) · ${sel} sélectionné(s)`
      : `${n} élève(s) en retard`;
  });

  totalRestantGlobal = computed(() =>
    this.filtered().reduce((s, e) => s + e.reste_par_enfant, 0)
  );

  // ── Actions ──────────────────────────────────────────────────────
  exportPdf(): void {
    this.pdf.genererListeInsolvables(
      this.cibles(),
      this.seuil(),
      ANNEE_SCOLAIRE,
      this.dateRefSignal() || undefined,
    );
  }

  envoyerRappels(): void {
    const n = this.wa.ouvrirWAMasse(this.famillesCibles(), this.templateChoisi());
    this.snack.open(`${n} message(s) ouvert(s) dans WhatsApp`, 'OK', { duration: 4000 });
  }

  waIndividuel(f: FamilleEnrichi | undefined): void {
    if (!f || !this.wa.choisirTel(f)) {
      this.snack.open('Aucun numéro pour cette famille', '', { duration: 2500 });
      return;
    }
    this.wa.ouvrirWA(f, this.templateChoisi());
  }

  prochainRdv(f: FamilleEnrichi | undefined): string | null {
    const r = _dernierRdvFamille(f);
    return r ? _fmtDate(r) : null;
  }

}