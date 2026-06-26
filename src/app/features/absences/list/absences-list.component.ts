// absences-list.component.ts — historique + filtres
// Logique WhatsApp : 100% dans WhatsappService
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal }   from '@angular/core/rxjs-interop';

import { CacheService }    from '../../../core/services/cache.service';
import { DataService }     from '../../../core/services/data.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { Absence, EleveEnrichi } from '../../../core/models/last_index';

// Type interne — ligne agrégée par élève
interface LigneAbsence {
  id_enfant:   string;
  nomEleve:    string;
  nomFamille:  string;
  nomClasse:   string;
  telPere:     string;
  telMere:     string;
  nbAbs:       number;
  derniereAbs: Absence | undefined;
  id_famille:  string;
  eleve:       EleveEnrichi | undefined;
}

@Component({
  selector: 'app-absences-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Historique des absences</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>
    <span class="bl-sep"></span>
    <input [formControl]="ctrlSearch" placeholder="Nom élève…" class="bl-input">
    <span class="bl-sep"></span>
    <button class="bl-btn bl-btn--ok"
            (click)="envoyerWhatsapp()"
            [disabled]="selection().size === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor"
              stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      WhatsApp ({{ selection().size }})
    </button>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="bl-chips-bar">
    <span class="bl-chips-lbl">Période</span>
    @for (opt of optsPeriode; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtrePeriode() === opt.val"
              (click)="setPeriode(opt.val)">{{ opt.lbl }}</button>
    }
    <span class="bl-sep"></span>
    <span class="bl-chips-lbl">Classe</span>
    <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === ''"
            (click)="setClasse('')">Toutes</button>
    @for (c of classes(); track c.id_classe) {
      <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === c.id_classe"
              (click)="setClasse(c.id_classe)">{{ c.nom_classe }}</button>
    }
    <span class="bl-sep"></span>
    <span class="bl-chips-lbl">Min. absences</span>
    @for (opt of optsNbAbs; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtreMinAbs() === opt.val"
              (click)="setMinAbs(opt.val)">{{ opt.lbl }}</button>
    }
    <span class="bl-sep"></span>
    <span class="bl-chips-lbl">Justifié</span>
    @for (opt of optsJustifie; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtreJustifie() === opt.val"
              (click)="setJustifie(opt.val)">{{ opt.lbl }}</button>
    }
  </div>

  <!-- ══ TABLEAU ══ -->
  @if (loading()) {
    <div class="bl-empty">Chargement…</div>
  } @else if (lignes().length === 0) {
    <div class="bl-empty">Aucune absence pour ces critères</div>
  } @else {

    <div class="bl-sel-bar">
      <label class="bl-chk-wrap">
        <input type="checkbox" class="bl-chk"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <span>Tout sélectionner</span>
      </label>
      @if (selection().size > 0) {
        <span class="bl-mention bl-mention--info">
          {{ selection().size }} sélectionné(s)
        </span>
      }
    </div>

    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="width:32px"></th>
            <th class="bl-th" style="text-align:left">Élève</th>
            <th class="bl-th">Classe</th>
            <th class="bl-th bl-th--trim">Nb absences</th>
            <th class="bl-th">Date · heure</th>
            <th class="bl-th">Justifié</th>
            <th class="bl-th">Contact parent</th>
            <th class="bl-th">WA</th>
          </tr>
        </thead>
        <tbody>
          @for (l of lignes(); track l.id_enfant) {
            <tr class="bl-tr" [class.bl-tr--sel]="selection().has(l.id_enfant)">
              <td class="bl-td bl-td--center">
                <input type="checkbox" class="bl-chk"
                       [checked]="selection().has(l.id_enfant)"
                       (change)="toggleLigne(l.id_enfant, $event)">
              </td>
              <td class="bl-td">
                <div style="font-weight:500">{{ l.nomEleve }}</div>
                <div style="font-size:10px;color:#aaa">{{ l.nomFamille }}</div>
              </td>
              <td class="bl-td bl-td--center">
                <span class="bl-mention bl-mention--info">{{ l.nomClasse }}</span>
              </td>
              <td class="bl-td bl-td--center bl-td--trim">
                <span [class]="l.nbAbs >= 3 ? 'bl-mention bl-mention--bad'
                                             : 'bl-mention bl-mention--warn'">
                  {{ l.nbAbs }}
                </span>
              </td>
              <td class="bl-td bl-td--center" style="font-size:11px">
                <div>{{ fmtDate(l.derniereAbs?.date) }}</div>
                <div style="color:#aaa">{{ l.derniereAbs?.heure }}</div>
              </td>
              <td class="bl-td bl-td--center">
                <span [class]="l.derniereAbs?.justifie
                  ? 'bl-mention bl-mention--ok' : 'bl-mention bl-mention--neu'">
                  {{ l.derniereAbs?.justifie ? 'Oui' : 'Non' }}
                </span>
              </td>
              <td class="bl-td" style="font-size:11px">
                <div>{{ l.telPere }}</div>
                <div style="color:#aaa">{{ l.telMere }}</div>
              </td>
              <td class="bl-td bl-td--center">
                <button class="bl-icon-btn" title="WhatsApp"
                        (click)="envoyerIndividuel(l)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z"
                          stroke="currentColor" stroke-width="1.3"
                          stroke-linejoin="round"/>
                  </svg>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ lignes().length }} élève(s) · {{ totalAbsences() }} absence(s)
      </span>
    </div>
  }

</div>
  `,
  styles: [`
    .bl-host      { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar       { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                    padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-sep       { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary{ display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre { font-size:12px; font-weight:500; }
    .bl-cfg-seqs  { font-size:10px; color:#185FA5; }
    .bl-input     { height:32px; padding:0 10px; font-size:13px;
                    border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
                    background:white; outline:none; width:160px; }
    .bl-input:focus { border-color:#185FA5; }
    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn:not(:disabled):hover { background:#f5f5f5; }
    .bl-btn--ok { background:#0F6E56; color:#fff; border:none; }
    .bl-btn--ok:not(:disabled):hover { opacity:.88; }
    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px; border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                    cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }
    .bl-sel-bar   { display:flex; align-items:center; gap:10px; padding:4px 0; }
    .bl-chk-wrap  { display:flex; align-items:center; gap:6px; cursor:pointer;
                    font-size:12px; }
    .bl-chk       { width:14px; height:14px; cursor:pointer; accent-color:#185FA5; }
    .bl-table-wrap{ overflow-x:auto; border:0.5px solid rgba(0,0,0,.09);
                    border-radius:8px; }
    .bl-table     { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th        { padding:7px 10px; font-weight:500; font-size:11px;
                    background:#f8f8f8; color:#666;
                    border-bottom:0.5px solid rgba(0,0,0,.08);
                    text-align:center; white-space:nowrap; }
    .bl-th--trim  { background:#EBF3FC; color:#0C447C; }
    .bl-td        { padding:7px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
                    vertical-align:middle; }
    .bl-td--center{ text-align:center; }
    .bl-td--trim  { background:#EBF3FC; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover  .bl-td { background:rgba(0,0,0,.012); }
    .bl-tr--sel   .bl-td { background:#EBF3FC !important; }
    .bl-mention   { font-size:11px; padding:2px 7px; border-radius:99px;
                    display:inline-block; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--neu  { background:#f5f5f5; color:#555; }
    .bl-icon-btn  { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
                    background:white; cursor:pointer; border-radius:5px;
                    display:inline-flex; align-items:center;
                    justify-content:center; color:#555; }
    .bl-icon-btn:hover { background:#EBF3FC; color:#185FA5; border-color:#B5D4F4; }
    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px; color:#ccc; font-size:13px; }
  `],
})
export class AbsencesListComponent implements OnInit {

  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private wa     = inject(WhatsappService);  // ← toute la logique WA est ici
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);

  loading   = signal(true);
  absences  = signal<Absence[]>([]);
  selection = signal<Set<string>>(new Set());

  ctrlSearch     = new FormControl('');
  filtrePeriode  = signal<'today' | 'week' | 'month' | ''>('week');
  filtreClasse   = signal('');
  filtreMinAbs   = signal(0);
  filtreJustifie = signal<'' | 'oui' | 'non'>('');

  private searchSignal = toSignal(this.ctrlSearch.valueChanges, { initialValue: '' });

  optsPeriode  = [
    { val: '' as const,      lbl: 'Toutes'  },
    { val: 'today' as const, lbl: "Auj."    },
    { val: 'week'  as const, lbl: 'Semaine' },
    { val: 'month' as const, lbl: 'Mois'    },
  ];
  optsNbAbs    = [
    { val: 0, lbl: 'Toutes' }, { val: 1, lbl: '≥ 1' },
    { val: 2, lbl: '≥ 2' },   { val: 3, lbl: '≥ 3' },
  ];
  optsJustifie = [
    { val: '' as const,    lbl: 'Tous'       },
    { val: 'oui' as const, lbl: 'Justifiées' },
    { val: 'non' as const, lbl: 'Non-just.'  },
  ];

  setPeriode(v: 'today' | 'week' | 'month' | '') { this.filtrePeriode.set(v); }
  setClasse(v: string)                             { this.filtreClasse.set(v); }
  setMinAbs(v: number)                             { this.filtreMinAbs.set(v); }
  setJustifie(v: '' | 'oui' | 'non')              { this.filtreJustifie.set(v); }

  classes = computed(() => this.cache.getClasses());

  ngOnInit(): void {
    this.data.getAbsences().then(abs => {
      this.absences.set(abs);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  // ── Lignes agrégées par élève (signal pur) ──────────────────

  lignes = computed<LigneAbsence[]>(() => {
    const periode  = this.filtrePeriode();
    const classe   = this.filtreClasse();
    const minAbs   = this.filtreMinAbs();
    const justifie = this.filtreJustifie();
    const q        = (this.searchSignal() ?? '').toLowerCase();
    const debut    = this.debutPeriode(periode);

    const filtrees = this.absences().filter(a => {
      if (debut && a.date < debut)            return false;
      if (classe && a.id_classe !== classe)   return false;
      if (justifie === 'oui' && !a.justifie)  return false;
      if (justifie === 'non' &&  a.justifie)  return false;
      return true;
    });

    const map = new Map<string, Absence[]>();
    filtrees.forEach(a => {
      if (!map.has(a.id_enfant)) map.set(a.id_enfant, []);
      map.get(a.id_enfant)!.push(a);
    });

    return [...map.entries()]
      .map(([idEleve, abs]): LigneAbsence => {
        const eleve = this.cache.getEleves().find(e => e.id_eleve === idEleve);
        const fam   = this.cache.famillesMap().get(eleve?.id_famille ?? '');
        const cls   = this.cache.classesMap().get(eleve?.id_classe   ?? '');
        const derniereAbs = [...abs].sort((a, b) => b.date.localeCompare(a.date))[0];
        return {
          id_enfant:   idEleve,
          nomEleve:    eleve ? `${eleve.nom} ${eleve.prenom}` : idEleve,
          nomFamille:  fam?.nom_famille ?? '—',
          nomClasse:   cls?.nom_classe  ?? '—',
          telPere:     fam?.tel_pere    ?? '—',
          telMere:     fam?.tel_mere    ?? '',
          nbAbs:       abs.length,
          derniereAbs,
          id_famille:  eleve?.id_famille ?? '',
          // EleveEnrichi pour WhatsappService — classe hydratée depuis le cache
          eleve: eleve ? { ...eleve, classe: cls } as EleveEnrichi : undefined,
        };
      })
      .filter(l => l.nbAbs >= minAbs)
      .filter(l => !q || l.nomEleve.toLowerCase().includes(q))
      .sort((a, b) => b.nbAbs - a.nbAbs);
  });

  resumeSous = computed(() =>
    `${this.lignes().length} élève(s) · ${this.totalAbsences()} absence(s)`
  );

  totalAbsences = computed(() =>
    this.lignes().reduce((s, l) => s + l.nbAbs, 0)
  );

  // ── Sélection ────────────────────────────────────────────────

  toutSelectionne = computed(() =>
    this.lignes().length > 0 &&
    this.lignes().every(l => this.selection().has(l.id_enfant))
  );
  selectionPartielle = computed(() =>
    this.selection().size > 0 && !this.toutSelectionne()
  );

  toggleLigne(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.update(s => {
      const n = new Set(s); checked ? n.add(id) : n.delete(id); return n;
    });
  }
  toggleTout(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.set(
      checked ? new Set(this.lignes().map(l => l.id_enfant)) : new Set()
    );
  }

  // ── WhatsApp — 100% délégué à WhatsappService ───────────────

  async envoyerWhatsapp(): Promise<void> {
    const cibles  = this.lignes().filter(l => this.selection().has(l.id_enfant));
    const periode = new Date().toISOString().slice(0, 10);
    let envoyes = 0, doublons = 0, echecs = 0;

    for (const l of cibles) {
      if (!l.eleve) { echecs++; continue; }
      const r = await this.wa.envoyerAbsence(l.eleve, l.nbAbs, null, periode);
      if (r === 'envoye')               envoyes++;
      else if (r === 'doublon')         doublons++;
      else                              echecs++;
    }

    this.snack.open(
      `${envoyes} envoyé(s) · ${doublons} doublon(s) · ${echecs} sans numéro/échec`,
      'OK', { duration: 4000 }
    );
    this.cdr.markForCheck();
  }

  async envoyerIndividuel(l: LigneAbsence): Promise<void> {
    if (!l.eleve) {
      this.snack.open('Données élève manquantes', '', { duration: 2000 });
      return;
    }
    const periode = new Date().toISOString().slice(0, 10);
    const r = await this.wa.envoyerAbsence(l.eleve, l.nbAbs, null, periode);
    const msgs: Record<string, string> = {
      envoye:      'Message envoyé ✓',
      doublon:     'Déjà envoyé aujourd\'hui',
      echec:       'Échec de l\'envoi',
      sans_numero: 'Aucun numéro disponible',
    };
    this.snack.open(msgs[r] ?? r, '', { duration: 2500 });
  }

  // ── Helpers ──────────────────────────────────────────────────

  private debutPeriode(p: string): string | null {
    const now = new Date();
    if (p === 'today') return now.toISOString().slice(0, 10);
    if (p === 'week')  {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    }
    if (p === 'month')
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    return null;
  }

  fmtDate(iso?: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day: '2-digit', month: 'short' });
    } catch { return iso; }
  }
}