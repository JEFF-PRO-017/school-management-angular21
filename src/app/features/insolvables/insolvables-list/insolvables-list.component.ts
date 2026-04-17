// insolvables-list.component.ts — v3
// - Logique WhatsApp déléguée à WhatsappService
// - Filtre montant restant (max restant)
// - Filtres tous en signal() purs — toSignal() pour FormControl
// - debugger supprimé
// - Pas de recherche texte (trop lent — supprimée)
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal }   from '@angular/core/rxjs-interop';

import { CacheService }      from '../../../core/services/cache.service';
import { DataService }       from '../../../core/services/data.service';
import { WhatsappService }   from '../../../core/services/whatsapp.service';
import { Famille, MsgTemplate } from '../../../core/models';
import { InsolvablesPdfService } from '../../../core/services/insolvables-pdf.service';

@Component({
  selector: 'app-insolvables-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Suivi des impayés</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <span class="bl-sep"></span>

    <!-- Versé inférieur à (seuil min) -->
    <div class="bl-fi-group">
      <span class="bl-fi-label">Versé &lt;</span>
      <input [formControl]="ctrlSeuil" type="number" min="0" step="1000"
             class="bl-fi" style="width:110px" placeholder="50 000">
      <span class="bl-fi-unit">FCFA</span>
    </div>

    <!-- Restant inférieur à (filtre max restant) -->
    <div class="bl-fi-group">
      <span class="bl-fi-label">Restant &lt;</span>
      <input [formControl]="ctrlMaxRestant" type="number" min="0" step="5000"
             class="bl-fi" style="width:110px" placeholder="200 000">
      <span class="bl-fi-unit">FCFA</span>
    </div>

    <!-- Date RDV -->
    <div class="bl-fi-group">
      <span class="bl-fi-label">Exclure RDV après</span>
      <input [formControl]="ctrlDateRef" type="date" class="bl-fi"
             style="width:140px">
    </div>

    <span class="bl-sep"></span>

    <button class="bl-btn" (click)="exportPdf()"
            [disabled]="cibles().length === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 1h7l3 3v11H3V1z" stroke="currentColor"
              stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M10 1v3h3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M6 9h4M6 11.5h2" stroke="currentColor"
              stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      PDF {{ labelCibles() }}
    </button>

    <button class="bl-btn bl-btn--ok" (click)="envoyerRappels()"
            [disabled]="cibles().length === 0">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z"
              stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      WhatsApp {{ labelCibles() }}
    </button>
  </div>

  <!-- ══ CHIPS FILTRES ══ -->
  <div class="bl-chips-bar">

    <span class="bl-chips-lbl">Classe</span>
    <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === ''"
            (click)="setClasse('')">Toutes</button>
    @for (c of classes(); track c.id_classe) {
      <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === c.id_classe"
              (click)="setClasse(c.id_classe)">{{ c.nom_classe }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Message</span>
    @if (templates().length === 0) {
      <span style="font-size:11px;color:#bbb">Aucun template</span>
    } @else {
      @for (t of templates(); track t.id_template) {
        <button class="bl-chip"
                [class.bl-chip--on]="templateChoisi()?.id_template === t.id_template"
                (click)="setTemplate(t)">{{ t.objet }}</button>
      }
    }

  </div>

  <!-- ══ CONTENU ══ -->
  @if (seuil() <= 0 && maxRestant() <= 0) {
    <div class="bl-empty">Saisissez un montant seuil pour lancer la recherche</div>

  } @else if (filtered().length === 0) {
    <div class="bl-empty">Aucune famille correspondant aux critères</div>

  } @else {

    <!-- Barre sélection -->
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
          {{ selection().size }} / {{ filtered().length }} sél.
        </span>
        <button class="bl-btn" style="height:26px;font-size:11px;padding:0 10px"
                (click)="viderSelection()">Désélectionner</button>
      }
    </div>

    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="width:32px"></th>
            <th class="bl-th" style="text-align:left">Famille</th>
            <th class="bl-th">Enfants · classe</th>
            <th class="bl-th">Contact</th>
            <th class="bl-th">Attendu</th>
            <th class="bl-th bl-th--trim">Versé</th>
            <th class="bl-th bl-th--trim">Restant</th>
            <th class="bl-th">Prochain RDV</th>
            <th class="bl-th">WA</th>
          </tr>
        </thead>
        <tbody>
          @for (f of filtered(); track f.id_famille) {
            <tr class="bl-tr" [class.bl-tr--sel]="estSelectionne(f.id_famille)">

              <td class="bl-td bl-td--center">
                <input type="checkbox" class="bl-chk"
                       [checked]="estSelectionne(f.id_famille)"
                       (change)="toggleLigne(f.id_famille, $event)">
              </td>

              <td class="bl-td bl-td--name">
                <div>{{ f.nom_famille }}</div>
                <div style="font-size:10px;color:#aaa">{{ f.id_famille }}</div>
              </td>

              <td class="bl-td bl-td--center" style="font-size:11px">
                <div>{{ nbEnfants(f) }} enfant(s)</div>
                <div style="color:#aaa">{{ nomsClasses(f) }}</div>
              </td>

              <td class="bl-td bl-td--center" style="font-size:11px">
                <div>{{ f.tel_pere || '—' }}</div>
                @if (f.tel_mere) {
                  <div style="color:#aaa">{{ f.tel_mere }}</div>
                }
              </td>

              <td class="bl-td bl-td--center" style="font-size:11px;color:#888">
                {{ fmt(montantAttendu(f)) }}
              </td>

              <td class="bl-td bl-td--center bl-td--trim">
                <span class="bl-mention bl-mention--warn">{{ fmt(totalVerse(f)) }}</span>
              </td>

              <td class="bl-td bl-td--center bl-td--trim">
                <span class="bl-mention bl-mention--bad">
                  {{ fmt(restant(f)) }} FCFA
                </span>
              </td>

              <td class="bl-td bl-td--center" style="font-size:11px">
                @if (prochainRdv(f)) {
                  <span class="bl-mention bl-mention--info">{{ prochainRdv(f) }}</span>
                } @else {
                  <span style="color:#bbb">—</span>
                }
              </td>

              <td class="bl-td bl-td--center">
                <button class="bl-icon-btn" title="WhatsApp individuel"
                        (click)="waIndividuel(f)">
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
        {{ filtered().length }} famille(s) en retard
        · Total restant : {{ fmt(totalRestantGlobal()) }} FCFA
      </span>
      <span class="bl-foot-info">
        @if (seuil() > 0)    { Versé &lt; {{ fmt(seuil()) }} · }
        @if (maxRestant() > 0){ Restant &lt; {{ fmt(maxRestant()) }} · }
        @if (dateRefSignal()) { RDV exclu après {{ fmtDate(dateRefSignal()) }} }
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

    /* Input group */
    .bl-fi-group  { display:flex; align-items:center; gap:5px; font-size:12px; }
    .bl-fi-label  { color:#888; white-space:nowrap; }
    .bl-fi-unit   { color:#aaa; font-size:11px; }
    .bl-fi        { height:32px; padding:0 8px; font-size:13px;
                    border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
                    background:white; outline:none; }
    .bl-fi:focus  { border-color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn:not(:disabled):hover { background:#f5f5f5; }
    .bl-btn--ok { background:#0F6E56; color:#fff; border:none; }
    .bl-btn--ok:not(:disabled):hover { opacity:.88; }

    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                    cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }

    .bl-sel-bar   { display:flex; align-items:center; gap:10px; padding:4px 0; }
    .bl-chk-wrap  { display:flex; align-items:center; gap:6px; cursor:pointer;
                    font-size:12px; color:#555; }
    .bl-chk       { width:14px; height:14px; cursor:pointer; accent-color:#185FA5; }

    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th    { padding:7px 10px; font-weight:500; font-size:11px;
                background:#f8f8f8; color:#666;
                border-bottom:0.5px solid rgba(0,0,0,.08);
                text-align:center; white-space:nowrap; }
    .bl-th--trim  { background:#EBF3FC; color:#0C447C; }
    .bl-td        { padding:6px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
                    vertical-align:middle; }
    .bl-td--name   { font-weight:500; }
    .bl-td--center { text-align:center; }
    .bl-td--trim   { background:#EBF3FC; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td    { background:rgba(0,0,0,.012); }
    .bl-tr--sel    .bl-td    { background:#EBF3FC !important; }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px;
                        display:inline-block; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }

    .bl-icon-btn { width:28px; height:28px; padding:0;
                   border:0.5px solid rgba(0,0,0,.12); background:white;
                   cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555; }
    .bl-icon-btn:hover { background:#EBF3FC; color:#185FA5; border-color:#B5D4F4; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px; color:#ccc; font-size:13px; }
  `],
})
export class InsolvablesListComponent implements OnInit {

  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private wa     = inject(WhatsappService);
  private pdf    = inject(InsolvablesPdfService);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);

  // ── FormControl → toSignal() pour que computed() réagisse ────────
  ctrlSeuil      = new FormControl<number | null>(null);
  ctrlMaxRestant = new FormControl<number | null>(null);
  ctrlDateRef    = new FormControl<string>('');

  private seuil$      = toSignal(this.ctrlSeuil.valueChanges,
    { initialValue: this.ctrlSeuil.value });
  private maxRestant$ = toSignal(this.ctrlMaxRestant.valueChanges,
    { initialValue: this.ctrlMaxRestant.value });
  private dateRef$    = toSignal(this.ctrlDateRef.valueChanges,
    { initialValue: this.ctrlDateRef.value ?? '' });

  seuil         = computed<number>(() => +(this.seuil$()      ?? 0));
  maxRestant    = computed<number>(() => +(this.maxRestant$()  ?? 0));
  dateRefSignal = computed<string>(() =>   this.dateRef$()     ?? '');

  // ── Filtres signal purs ───────────────────────────────────────────
  filtreClasse   = signal('');
  templateChoisi = signal<MsgTemplate | null>(null);
  selection      = signal<Set<string>>(new Set());

  setClasse(v: string)        { this.filtreClasse.set(v); }
  setTemplate(t: MsgTemplate) { this.templateChoisi.set(t); }

  // ── Données ───────────────────────────────────────────────────────
  classes   = computed(() => this.cache.getClasses());
  templates = computed(() => this.data.getTemplates());

  ngOnInit(): void {
    this.data.loadTemplates().then(() => {
      const rappel = this.data.getTemplates()
        .find(t => t.type === 'rappel' || t.type === 'relance');
      if (rappel) this.templateChoisi.set(rappel);
      this.cdr.markForCheck();
    });
  }

  // ── Liste filtrée ─────────────────────────────────────────────────
  filtered = computed<Famille[]>(() => {
    const seuil      = this.seuil();
    const maxRestant = this.maxRestant();
    const dateRef    = this.dateRefSignal();
    const classe     = this.filtreClasse();

    // Au moins un filtre actif
    if (seuil <= 0 && maxRestant <= 0) return [];

    return this.cache.getFamilles().filter(f => {
      const verse = this.totalVerse(f);
      const rest  = this.restant(f);

      // Filtre 1 — versé inférieur au seuil
      if (seuil > 0 && verse >= seuil) return false;

      // Filtre 2 — restant inférieur au max (ex : familles qui doivent < 50 000)
      if (maxRestant > 0 && rest >= maxRestant) return false;

      // Filtre 3 — exclure si RDV futur après dateRef
      if (dateRef) {
        const rdv = this.dernierRdv(f);
        if (rdv && rdv > dateRef) return false;
      }

      // Filtre 4 — classe
      if (classe) {
        const ok = (f.eleves ?? [])
          .some(e => e.id_classe === classe && e.statut === 'actif');
        if (!ok) return false;
      }

      return true;
    });
  });

  // ── Sélection ─────────────────────────────────────────────────────
  estSelectionne(id: string) { return this.selection().has(id); }

  toutSelectionne = computed(() =>
    this.filtered().length > 0 &&
    this.filtered().every(f => this.selection().has(f.id_famille))
  );
  selectionPartielle = computed(() =>
    this.selection().size > 0 && !this.toutSelectionne()
  );

  cibles = computed<Famille[]>(() =>
    this.selection().size > 0
      ? this.filtered().filter(f => this.selection().has(f.id_famille))
      : this.filtered()
  );

  labelCibles(): string {
    const n = this.cibles().length;
    return this.selection().size > 0 ? `(${n} sél.)` : `(${n})`;
  }

  toggleLigne(id: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selection.update(s => {
      const n = new Set(s);
      checked ? n.add(id) : n.delete(id);
      return n;
    });
  }

  toggleTout(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selection.set(
      checked ? new Set(this.filtered().map(f => f.id_famille)) : new Set()
    );
  }

  viderSelection() { this.selection.set(new Set()); }

  // ── Stats ─────────────────────────────────────────────────────────
  resumeSous = computed(() => {
    const n   = this.filtered().length;
    const sel = this.selection().size;
    if (this.seuil() <= 0 && this.maxRestant() <= 0)
      return 'Saisissez un seuil pour filtrer';
    return sel > 0
      ? `${n} famille(s) · ${sel} sélectionné(s)`
      : `${n} famille(s) en retard`;
  });

  totalRestantGlobal = computed(() =>
    this.filtered().reduce((s, f) => s + this.restant(f), 0)
  );

  // ── Actions ───────────────────────────────────────────────────────

  exportPdf(): void {
    const annee = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    this.pdf.genererListeInsolvables(
      this.cibles(), this.seuil(), annee,
      this.dateRefSignal() || undefined
    );
  }

  /** Masse — ouvre WA pour chaque cible via WhatsappService */
  envoyerRappels(): void {
    const n = this.wa.ouvrirWAMasse(this.cibles(), this.templateChoisi());
    this.snack.open(`${n} message(s) ouvert(s) dans WhatsApp`, 'OK', { duration: 4000 });
  }

  /** Individuel — délègue à WhatsappService */
  waIndividuel(f: Famille): void {
    if (!this.wa.choisirTel(f)) {
      this.snack.open('Aucun numéro pour cette famille', '', { duration: 2500 });
      return;
    }
    this.wa.ouvrirWA(f, this.templateChoisi());
  }

  // ── Helpers données ───────────────────────────────────────────────
  montantAttendu(f: Famille): number {
    return +(f.montant_total_attendu ?? 0) - +(f.montant_reduction ?? 0);
  }
  totalVerse(f: Famille): number {
    return (f.paiements ?? []).reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
  }
  restant(f: Famille): number {
    return Math.max(0, this.montantAttendu(f) - this.totalVerse(f));
  }
  nbEnfants(f: Famille): number {
    return (f.eleves ?? []).filter(e => e.statut === 'actif').length;
  }
  nomsClasses(f: Famille): string {
    const ids = [...new Set(
      (f.eleves ?? []).filter(e => e.statut === 'actif').map(e => e.id_classe)
    )];
    return ids.map(id => this.cache.classesMap().get(id)?.nom_classe ?? id).join(', ');
  }
  private dernierRdv(f: Famille): string | null {
    const rdvs = (f.paiements ?? [])
      .map(p => p.date_prochain_rdv).filter(Boolean) as string[];
    return rdvs.length ? rdvs.sort().at(-1)! : null;
  }
  prochainRdv(f: Famille): string | null {
    const r = this.dernierRdv(f);
    return r ? this.fmtDate(r) : null;
  }
  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
  fmtDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day:'2-digit', month:'short', year:'numeric' });
    } catch { return iso; }
  }
}