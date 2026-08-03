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
import { InsolvablesPdfService } from '../../../core/services/@insolvables/insolvables-pdf.service';
import { _dernierRdvFamille, _fmtDate } from '../../../core/services/@insolvables';
import { EleveEnrichi, FamilleService, Famille, FamilleEnrichi, MsgTemplate, ANNEE_SCOLAIRE } from '../../../core/models';
import { TableComponent, CellDefDirective, TableColumn } from '../../../shared/components/table/table.component';
import { Message, WhatsappService } from '../../../core/services/@whatsapp/whatsapp.service';

export interface EleveData extends EleveEnrichi {
  nb_enfants_famille: number;
  montant_par_enfant: number;
  reste_par_enfant: number;
  verse_famille: number;
  attendu_famille: number;
  restant_famille: number;
  moratoire_depasse: boolean;
  insolvable: boolean;
}

@Component({
  selector: 'app-insolvables-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe, TableComponent, CellDefDirective],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE OUTILS (inchangée) ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <div class="d-flex flex-column" style="gap:1px">
      <span class="fw-medium" style="font-size:12px">Suivi des impayés</span>
      <span class="text-primary" style="font-size:10px">{{ resumeSous() }}</span>
    </div>
    <div class="vr mx-1"></div>
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Versé &lt;</span>
      <input [formControl]="ctrlSeuil" type="number" min="0" step="1000"
             class="form-control form-control-sm" style="width:110px" placeholder="50 000">
      <span class="text-muted" style="font-size:11px">FCFA</span>
    </div>
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Restant &lt;</span>
      <input [formControl]="ctrlMaxRestant" type="number" min="0" step="5000"
             class="form-control form-control-sm" style="width:110px" placeholder="200 000">
      <span class="text-muted" style="font-size:11px">FCFA</span>
    </div>
    <div class="d-flex align-items-center gap-1" style="font-size:12px">
      <span class="text-secondary" style="white-space:nowrap">Exclure RDV après</span>
      <input [formControl]="ctrlDateRef" type="date" class="form-control form-control-sm" style="width:140px">
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
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      WhatsApp {{ labelCibles() }}
    </button>
  </div>

  <!-- ══ CHIPS FILTRES (inchangé) ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <span class="text-muted" style="font-size:11px">Classe</span>
    <button class="btn btn-sm"
            [class.btn-primary]="filtreClasse() === ''"
            [class.btn-outline-secondary]="filtreClasse() !== ''"
            style="font-size:11px;padding:2px 10px" (click)="setClasse('')">Toutes</button>
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
                style="font-size:11px;padding:2px 10px" (click)="setTemplate(t)">{{ t.objet }}</button>
      }
    }
  </div>

  <!-- ══ CONTENU ══ -->
  @if (filtered().length === 0) {
    <div class="text-center text-muted py-5">Aucun élève correspondant aux critères</div>
  } @else {

    <!-- Barre sélection (inchangée — cross-page) -->
    <div class="d-flex align-items-center gap-3 py-1">
      <div class="form-check mb-0">
        <input type="checkbox" class="form-check-input" id="chkTout"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <label class="form-check-label" for="chkTout" style="font-size:12px">Tout sélectionner</label>
      </div>
      @if (selection().size > 0) {
        <span class="badge text-bg-primary">{{ selection().size }} / {{ filtered().length }} sél.</span>
        <button class="btn btn-sm btn-outline-secondary" style="font-size:11px;padding:1px 8px"
                (click)="viderSelection()">Désélectionner</button>
      }
    </div>

    <app-table
      [columns]="columns"
      [data]="filtered()"
      [trackByFn]="trackByEleve"
      emptyMessage="Aucun élève correspondant aux critères">

      <ng-template cellDef="check" let-e>
        <input type="checkbox" class="form-check-input"
               [checked]="estSelectionne(e.id_eleve)"
               (change)="toggleLigne(e.id_eleve, $event)">
      </ng-template>

      <ng-template cellDef="famille" let-e>
        <div>{{ e.famille?.nom_famille }}</div>
        <div class="text-muted" style="font-size:10px">({{ e.nb_enfants_famille }}) enfant(s)</div>
      </ng-template>

      <ng-template cellDef="classe" let-e>
        <div>{{ e.classe?.nom_classe }}</div>
        <div class="text-muted" style="font-size:10px">{{ e.classe?.enseignant_principal }}</div>
      </ng-template>

      <ng-template cellDef="contact" let-e>
        <div>{{ e.famille?.tel_pere || '—' }}</div>
        @if (e.famille?.tel_mere) { <div class="text-muted">{{ e.famille?.tel_mere }}</div> }
      </ng-template>

      <ng-template cellDef="versePar" let-e>
        <span class="badge text-bg-warning">{{ e.montant_par_enfant | number }} FCFA</span>
      </ng-template>

      <ng-template cellDef="reste" let-e>
        <span class="badge"
              [class.text-bg-danger]="e.moratoire_depasse"
              [class.text-bg-warning]="!e.moratoire_depasse">
          {{ e.restant_famille | number }} FCFA
        </span>
      </ng-template>

      <ng-template cellDef="rdv" let-e>
        @if (prochainRdv(e.famille)) {
          <span class="badge"
                [class.text-bg-danger]="e.moratoire_depasse"
                [class.text-bg-info]="!e.moratoire_depasse">
            {{ prochainRdv(e.famille) }}
          </span>
        } @else {
          <span class="text-muted">—</span>
        }
      </ng-template>

      <ng-template cellDef="wa" let-e>
        <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center"
                style="width:28px;height:28px;padding:0" title="WhatsApp individuel"
                (click)="waIndividuel(e.famille)">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
        </button>
      </ng-template>

    </app-table>

    <div class="d-flex justify-content-between flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">{{ filtered().length }} élève(s) en retard</span>
      <span class="text-muted" style="font-size:11px">
        @if (seuil() > 0)      { Versé &lt; {{ seuil() | number }} · }
        @if (maxRestant() > 0) { Restant &lt; {{ maxRestant() | number }} · }
      </span>
    </div>
  }

</div>
  `,
})
export class InsolvablesListComponent implements OnInit {

  private cache = inject(CacheService);
  private data = inject(DataService);
  private wa = inject(WhatsappService);
  private pdf = inject(InsolvablesPdfService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private fasSvc = inject(FamilleService);

  trackByEleve = (e: EleveData) => e.id_eleve;

  columns: TableColumn<EleveData>[] = [
    { id: 'check', header: '', width: '32px', exportable: false },
    { id: 'eleve', header: 'Élève', accessor: e => `${e.nom} ${e.prenom}` },
    { id: 'famille', header: 'Famille', align: 'center' },
    { id: 'classe', header: 'Classe', align: 'center' },
    { id: 'contact', header: 'Contact', align: 'center', exportable: false },
    { id: 'versePar', header: 'Versé/e', align: 'center', accessor: e => e.montant_par_enfant },
    { id: 'restePar', header: 'Reste/e', align: 'center', accessor: e => e.reste_par_enfant },
    { id: 'verseFamille', header: 'Versé T', align: 'center', accessor: e => e.verse_famille },
    { id: 'attendu', header: 'Attendu', align: 'center', accessor: e => e.attendu_famille },
    { id: 'reste', header: 'Reste', align: 'center', accessor: e => e.restant_famille },
    { id: 'rdv', header: 'Prochain RDV', align: 'center', exportable: false },
    { id: 'wa', header: 'WA', align: 'center', exportable: false },
  ];

  // ── FormControls → signals ──────────────────────────────────────
  ctrlSeuil = new FormControl<number | null>(-1);
  ctrlMaxRestant = new FormControl<number | null>(-1);
  ctrlDateRef = new FormControl<string>('');

  private seuil$ = toSignal(this.ctrlSeuil.valueChanges, { initialValue: this.ctrlSeuil.value });
  private maxRestant$ = toSignal(this.ctrlMaxRestant.valueChanges, { initialValue: this.ctrlMaxRestant.value });
  private dateRef$ = toSignal(this.ctrlDateRef.valueChanges, { initialValue: this.ctrlDateRef.value ?? '' });

  seuil = computed<number>(() => +(this.seuil$() ?? 0));
  maxRestant = computed<number>(() => +(this.maxRestant$() ?? 0));
  dateRefSignal = computed<string>(() => this.dateRef$() ?? '');

  filtreClasse = signal('');
  templateChoisi = signal<MsgTemplate | null>(null);
  selection = signal<Set<string>>(new Set());

  setClasse(v: string) { this.filtreClasse.set(v); }
  setTemplate(t: MsgTemplate) { this.templateChoisi.set(t); }

  classes = computed(() => this.cache.getClasses());
  templates = computed(() => this.data.getTemplates());

  elevesData = signal<EleveData[]>([]);

  ngOnInit(): void {
    this.data.loadTemplates().then(() => {
      const rappel = this.data.getTemplates().find(t => t.type === 'rappel' || t.type === 'relance');
      if (rappel) this.templateChoisi.set(rappel);
      this.cdr.markForCheck();
    });
    this.elevesData.set(this.fasSvc.construireElevesDataAvecFamille(this.data.getFamilles()));
  }

  filtered = computed<EleveData[]>(() => {
    const seuil = this.seuil();
    const maxRestant = this.maxRestant();
    const dateRef = this.dateRefSignal();
    const classe = this.filtreClasse();

    if (seuil <= 0 && maxRestant <= 0 && !dateRef && !classe) return this.elevesData();
    return this.elevesData().filter(e => {
      if (seuil > 0 && e.montant_par_enfant >= seuil) return false;
      if (maxRestant > 0 && e.reste_par_enfant <= maxRestant) return false;
      if (dateRef) {
        const rdv = _dernierRdvFamille(e.famille);
        if (rdv && rdv > dateRef) return false;
      }
      if (classe && e.classe?.id_classe !== classe) return false;
      return true;
    });
  });

  // ── Sélection (cross-page, inchangée) ────────────────────────────
  estSelectionne(idEleve: string): boolean { return this.selection().has(idEleve); }

  toutSelectionne = computed(() =>
    this.filtered().length > 0 && this.filtered().every(e => this.selection().has(e.id_eleve))
  );
  selectionPartielle = computed(() => this.selection().size > 0 && !this.toutSelectionne());

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
    this.selection.set(checked ? new Set(this.filtered().map(e => e.id_eleve)) : new Set());
  }

  viderSelection(): void { this.selection.set(new Set()); }

  cibles = computed<EleveData[]>(() =>
    this.selection().size > 0
      ? this.filtered().filter(e => this.selection().has(e.id_eleve))
      : this.filtered()
  );

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

  resumeSous = computed(() => {
    if (this.seuil() <= 0 && this.maxRestant() <= 0) return 'Saisissez un seuil pour filtrer';
    const n = this.filtered().length;
    const sel = this.selection().size;
    return sel > 0 ? `${n} élève(s) · ${sel} sélectionné(s)` : `${n} élève(s) en retard`;
  });

  totalRestantGlobal = computed(() => this.filtered().reduce((s, e) => s + e.reste_par_enfant, 0));

  exportPdf(): void {
    this.pdf.genererListeInsolvables(this.cibles(), this.seuil(), ANNEE_SCOLAIRE, this.dateRefSignal() || undefined);
  }

  envoyerRappels(): void {
    const messages: Message[] = this.famillesCibles().map(f => ({
      tel: this.wa.choisirTel(f),
      msg: this.wa.msgDefautRappel(f)
    })
    )
    this.wa.send_message_bulk(messages);
  }

  async waIndividuel(f: FamilleEnrichi | undefined): Promise<void> {
    if (!f || !this.wa.choisirTel(f)) {
      this.snack.open('Aucun numéro pour cette famille', '', { duration: 2500 });
      return;
    }
    // const message = {
    //   tel: this.wa.choisirTel(f),
    //   msg: this.wa.msgDefautRappel(f)
    // }
    const message = {
      tel: '+237653477170',
      msg: 'yo man cest le berceau'
    }
    await this.wa.send_message_bulk([message]);
    console.log('je viens de finir le send message')
  }

  prochainRdv(f: FamilleEnrichi | undefined): string | null {
    const r = _dernierRdvFamille(f);
    return r ? _fmtDate(r) : null;
  }
}