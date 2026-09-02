// absences-list.component.ts
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EleveEnrichi, Absence } from '../../../../core/models';
import { WhatsappService } from '../../../../core/services';
import { GetServices } from '../../../../core/services/@data';
import { TableComponent, CellDefDirective, TableColumn } from '../../../../shared/components/table/table.component';



type Periode = 'today' | 'week' | 'month' | '';
type Justifie = '' | 'oui' | 'non';

interface LigneAbsence {
  eleve: EleveEnrichi;
  nomEleve: string;
  nomClasse: string;
  telPere: string;
  telMere: string;
  nbAbs: number;
  derniereAbs?: Absence;
}

@Component({
  selector: 'app-absences-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableComponent, CellDefDirective],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <div class="d-flex flex-column" style="gap:1px">
      <span class="fw-medium" style="font-size:12px">Historique des absences</span>
      <span class="text-primary" style="font-size:10px">{{ resumeSous() }}</span>
    </div>
    <div class="vr mx-1"></div>
    <input [formControl]="ctrlSearch" placeholder="Nom élève…"
           class="form-control form-control-sm" style="width:160px">
    <div class="vr mx-1"></div>
    <button class="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
            (click)="envoyerWhatsapp()" [disabled]="selection().size === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      WhatsApp ({{ selection().size }})
    </button>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <span class="text-muted" style="font-size:11px">Période</span>
    @for (opt of optsPeriode; track opt.val) {
      <button class="btn btn-sm" style="font-size:11px;padding:2px 10px"
              [class.btn-primary]="filtrePeriode() === opt.val"
              [class.btn-outline-secondary]="filtrePeriode() !== opt.val"
              (click)="filtrePeriode.set(opt.val)">{{ opt.lbl }}</button>
    }
    <div class="vr mx-1"></div>
    <span class="text-muted" style="font-size:11px">Classe</span>
    <button class="btn btn-sm" style="font-size:11px;padding:2px 10px"
            [class.btn-primary]="filtreClasse() === ''"
            [class.btn-outline-secondary]="filtreClasse() !== ''"
            (click)="filtreClasse.set('')">Toutes</button>
    @for (c of classes(); track c.id_classe) {
      <button class="btn btn-sm" style="font-size:11px;padding:2px 10px"
              [class.btn-primary]="filtreClasse() === c.id_classe"
              [class.btn-outline-secondary]="filtreClasse() !== c.id_classe"
              (click)="filtreClasse.set(c.id_classe)">{{ c.nom_classe }}</button>
    }
    <div class="vr mx-1"></div>
    <span class="text-muted" style="font-size:11px">Min. absences</span>
    @for (opt of optsNbAbs; track opt.val) {
      <button class="btn btn-sm" style="font-size:11px;padding:2px 10px"
              [class.btn-primary]="filtreMinAbs() === opt.val"
              [class.btn-outline-secondary]="filtreMinAbs() !== opt.val"
              (click)="filtreMinAbs.set(opt.val)">{{ opt.lbl }}</button>
    }
    <div class="vr mx-1"></div>
    <span class="text-muted" style="font-size:11px">Justifié</span>
    @for (opt of optsJustifie; track opt.val) {
      <button class="btn btn-sm" style="font-size:11px;padding:2px 10px"
              [class.btn-primary]="filtreJustifie() === opt.val"
              [class.btn-outline-secondary]="filtreJustifie() !== opt.val"
              (click)="filtreJustifie.set(opt.val)">{{ opt.lbl }}</button>
    }
  </div>

  <!-- ══ TABLEAU ══ -->
  @if (lignes().length === 0) {
    <div class="text-center text-muted py-5">Aucune absence pour ces critères</div>
  } @else {

    <div class="d-flex align-items-center gap-3 py-1">
      <div class="form-check mb-0">
        <input type="checkbox" class="form-check-input" id="chkTout"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <label class="form-check-label" for="chkTout" style="font-size:12px">Tout sélectionner</label>
      </div>
      @if (selection().size > 0) {
        <span class="badge text-bg-primary">{{ selection().size }} sélectionné(s)</span>
      }
    </div>

    <app-table
      [columns]="columns"
      [data]="lignes()"
      [pageSize]="pageSize"
      [trackByFn]="trackByLigne"
      emptyMessage="Aucune absence pour ces critères">

      <ng-template cellDef="check" let-l>
        <input type="checkbox" class="form-check-input"
               [checked]="selection().has(l.eleve.id_eleve)"
               (change)="toggleLigne(l.eleve.id_eleve, $event)">
      </ng-template>

      <ng-template cellDef="eleve" let-l>
        <div class="fw-medium">{{ l.nomEleve }}</div>
        <div class="text-muted" style="font-size:10px">{{ l.eleve.famille?.nom_famille ?? '—' }}</div>
      </ng-template>

      <ng-template cellDef="classe" let-l>
        <span class="badge rounded-pill bg-info-subtle text-info-emphasis">{{ l.nomClasse }}</span>
      </ng-template>

      <ng-template cellDef="nbAbs" let-l>
        <span class="badge rounded-pill"
              [class.bg-danger-subtle]="l.nbAbs >= 3" [class.text-danger-emphasis]="l.nbAbs >= 3"
              [class.bg-warning-subtle]="l.nbAbs < 3" [class.text-warning-emphasis]="l.nbAbs < 3">
          {{ l.nbAbs }}
        </span>
      </ng-template>

      <ng-template cellDef="date" let-l>
        <div style="font-size:11px">{{ fmtDate(l.derniereAbs?.date) }}</div>
        <div class="text-muted" style="font-size:10px">{{ l.derniereAbs?.heure }}</div>
      </ng-template>

      <ng-template cellDef="justifie" let-l>
        <span class="badge rounded-pill"
              [class.bg-success-subtle]="l.derniereAbs?.justifie" [class.text-success-emphasis]="l.derniereAbs?.justifie"
              [class.bg-secondary-subtle]="!l.derniereAbs?.justifie" [class.text-secondary-emphasis]="!l.derniereAbs?.justifie">
          {{ l.derniereAbs?.justifie ? 'Oui' : 'Non' }}
        </span>
      </ng-template>

      <ng-template cellDef="contact" let-l>
        <div style="font-size:11px">{{ l.telPere }}</div>
        <div class="text-muted" style="font-size:10px">{{ l.telMere }}</div>
      </ng-template>

      <ng-template cellDef="wa" let-l>
        <button class="btn btn-sm btn-outline-secondary icon-btn" title="WhatsApp"
                (click)="envoyerIndividuel(l)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
        </button>
      </ng-template>

    </app-table>

    <div class="d-flex justify-content-between flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">{{ lignes().length }} élève(s) · {{ totalAbsences() }} absence(s)</span>
    </div>
  }

</div>
  `,
  styles: [`.icon-btn { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; }`],
})
export class AbsencesListComponent {

  private get = inject(GetServices);
  private wa    = inject(WhatsappService);
  private snack = inject(MatSnackBar);
  private cdr   = inject(ChangeDetectorRef);

  readonly pageSize = 15;
  trackByLigne = (l: LigneAbsence) => l.eleve.id_eleve;

  columns: TableColumn<LigneAbsence>[] = [
    { id: 'check',    header: '',              width: '32px', exportable: false },
    { id: 'eleve',    header: 'Élève',         sortable: true, accessor: l => l.nomEleve },
    { id: 'classe',   header: 'Classe',        align: 'center', sortable: true, accessor: l => l.nomClasse },
    { id: 'nbAbs',    header: 'Nb absences',   align: 'center', sortable: true, headerBg: '#EBF3FC', headerColor: '#0C447C', accessor: l => l.nbAbs },
    { id: 'date',     header: 'Date · heure',  align: 'center', exportable: false },
    { id: 'justifie', header: 'Justifié',      align: 'center', exportable: false },
    { id: 'contact',  header: 'Contact parent', exportable: false },
    { id: 'wa',       header: 'WA',            align: 'center', exportable: false },
  ];

  selection = signal<Set<string>>(new Set());

  ctrlSearch     = new FormControl('');
  filtrePeriode  = signal<Periode>('week');
  filtreClasse   = signal('');
  filtreMinAbs   = signal(0);
  filtreJustifie = signal<Justifie>('');

  private searchSignal = toSignal(this.ctrlSearch.valueChanges, { initialValue: '' });

  optsPeriode  = [
    { val: '' as Periode, lbl: 'Toutes' }, { val: 'today' as Periode, lbl: 'Auj.' },
    { val: 'week' as Periode, lbl: 'Semaine' }, { val: 'month' as Periode, lbl: 'Mois' },
  ];
  optsNbAbs = [
    { val: 0, lbl: 'Toutes' }, { val: 1, lbl: '≥ 1' }, { val: 2, lbl: '≥ 2' }, { val: 3, lbl: '≥ 3' },
  ];
  optsJustifie = [
    { val: '' as Justifie, lbl: 'Tous' }, { val: 'oui' as Justifie, lbl: 'Justifiées' }, { val: 'non' as Justifie, lbl: 'Non-just.' },
  ];

  classes = computed(() => this.get.getClasses());

  // ── Pipeline principal : petites fonctions composées ──────────
  lignes = computed<LigneAbsence[]>(() => {
    const classe = this.filtreClasse();
    const minAbs = this.filtreMinAbs();
    const q      = (this.searchSignal() ?? '').toLowerCase();
    return this.get.getEleves()
      .filter(e => !classe || e.id_classe === classe)
      .map(e => this.construireLigne(e))
      .filter(l => l.nbAbs >= minAbs && l.nbAbs > 0)
      .filter(l => !q || l.nomEleve.toLowerCase().includes(q))
      .sort((a, b) => b.nbAbs - a.nbAbs);
  });

  private construireLigne(e: EleveEnrichi |any): LigneAbsence {
    const abs = this.absencesFiltrees(e);
    return {
      eleve: e,
      nomEleve: `${e.nom} ${e.prenom}`,
      nomClasse: e.classe?.nom_classe ?? '—',
      telPere: e.famille?.tel_pere ?? '—',
      telMere: e.famille?.tel_mere ?? '',
      nbAbs: abs.length,
      derniereAbs: this.dernierePar(abs),
    };
  }

  private absencesFiltrees(e: EleveEnrichi | any): Absence[] {
    const debut    = this.debutPeriode(this.filtrePeriode());
    const justifie = this.filtreJustifie();
    return (e.absences ?? []).filter((a: { date: any; justifie: any; }) =>
      (!debut || a.date >= debut) &&
      (justifie !== 'oui' || a.justifie) &&
      (justifie !== 'non' || !a.justifie)
    );
  }

  private dernierePar(abs: Absence[]): Absence | undefined {
    return [...abs].sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  private debutPeriode(p: Periode): string | null {
    const now = new Date();
    if (p === 'today') return now.toISOString().slice(0, 10);
    if (p === 'week')  { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
    if (p === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return null;
  }

  resumeSous     = computed(() => `${this.lignes().length} élève(s) · ${this.totalAbsences()} absence(s)`);
  totalAbsences  = computed(() => this.lignes().reduce((s, l) => s + l.nbAbs, 0));

  // ── Sélection (cross-page) ────────────────────────────────────
  toutSelectionne     = computed(() => this.lignes().length > 0 && this.lignes().every(l => this.selection().has(l.eleve.id_eleve)));
  selectionPartielle  = computed(() => this.selection().size > 0 && !this.toutSelectionne());

  toggleLigne(id: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selection.update(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n; });
  }
  toggleTout(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selection.set(checked ? new Set(this.lignes().map(l => l.eleve.id_eleve)) : new Set());
  }

  // ── WhatsApp ───────────────────────────────────────────────────
  async envoyerWhatsapp(): Promise<void> {
    const cibles = this.lignes().filter(l => this.selection().has(l.eleve.id_eleve));
    const periode = new Date().toISOString().slice(0, 10);
    let envoyes = 0, doublons = 0, echecs = 0;

    // for (const l of cibles) {
    //   const r = await this.wa.envoyerAbsence(l.eleve, l.nbAbs, null, periode);
    //   r === 'envoye' ? envoyes++ : r === 'doublon' ? doublons++ : echecs++;
    // }
    this.snack.open(`${envoyes} envoyé(s) · ${doublons} doublon(s) · ${echecs} sans numéro/échec`, 'OK', { duration: 4000 });
    this.cdr.markForCheck();
  }

  async envoyerIndividuel(l: LigneAbsence): Promise<void> {
    const periode = new Date().toISOString().slice(0, 10);
    // const r = await this.wa.envoyerAbsence(l.eleve, l.nbAbs, null, periode);
    // const msgs: Record<string, string> = {
    //   envoye: 'Message envoyé ✓', doublon: 'Déjà envoyé aujourd\'hui',
    //   echec: 'Échec de l\'envoi', sans_numero: 'Aucun numéro disponible',
    // };
    // this.snack.open(msgs[r] ?? r, '', { duration: 2500 });
  }

  fmtDate(iso?: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
    catch { return iso; }
  }
}