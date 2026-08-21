// alertes-log.component.ts — journal des envois WhatsApp
// Filtres multiples tous en signal() purs → computed() réactif garanti
// Pas de FormControl.value dans computed() (non-réactif)
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { LogAlerte } from '../../../core/models/last_index';
import { TemplateFormComponent } from '../template-form/template-form.component';
import { GetServices } from '../../../core/services/@data';

// Valeurs possibles des filtres
type FiltreStatut = '' | 'envoye' | 'echec';
type FiltrePeriode = '' | 'today' | 'week' | 'month';

@Component({
  selector: 'app-alertes-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <a routerLink="/whatsapp" class="bl-btn" style="padding:0 10px">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>

    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Journal WhatsApp</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <span class="bl-sep"></span>

    <input [value]="recherche()"
           (input)="setRecherche($event)"
           placeholder="Nom, numéro…"
           class="bl-input">

    <span class="bl-sep"></span>

    <button class="bl-btn bl-btn--primary" (click)="ouvrirNouveauTemplate()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouveau template
    </button>
  </div>

  <!-- ══ CHIPS FILTRES ══ -->
  <div class="bl-chips-bar">

    <span class="bl-chips-lbl">Statut</span>
    @for (opt of optsStatut; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtreStatut() === opt.val"
              (click)="setStatut(opt.val)">{{ opt.lbl }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Période</span>
    @for (opt of optsPeriode; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtrePeriode() === opt.val"
              (click)="setPeriode(opt.val)">{{ opt.lbl }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Type</span>
    @for (t of typesDispos(); track t) {
      <button class="bl-chip" [class.bl-chip--on]="filtreType() === t"
              (click)="setType(t)">{{ t }}</button>
    }
    @if (typesDispos().length > 0) {
      <button class="bl-chip" [class.bl-chip--on]="filtreType() === ''"
              (click)="setType('')">Tous</button>
    }

  </div>

  <!-- ══ STATS RAPIDES ══ -->
  @if (!loading()) {
    <div class="bl-stats">
      <div class="bl-stat-item">
        <span class="bl-stat-val" style="color:#0F6E56">{{ nbEnvoyes() }}</span>
        <span class="bl-stat-lbl">Envoyé(s)</span>
      </div>
      <div class="bl-stat-sep"></div>
      <div class="bl-stat-item">
        <span class="bl-stat-val" style="color:#A32D2D">{{ nbEchecs() }}</span>
        <span class="bl-stat-lbl">Échec(s)</span>
      </div>
      <div class="bl-stat-sep"></div>
      <div class="bl-stat-item">
        <span class="bl-stat-val" style="color:#185FA5">{{ tauxReussite() }}%</span>
        <span class="bl-stat-lbl">Taux réussite</span>
      </div>
      <div class="bl-stat-sep"></div>
      <div class="bl-stat-item">
        <span class="bl-stat-val" style="color:#555">{{ filtered().length }}</span>
        <span class="bl-stat-lbl">Résultat(s)</span>
      </div>
    </div>
  }

  <!-- ══ TABLEAU ══ -->
  @if (loading()) {
    <div class="bl-empty">Chargement…</div>

  } @else if (filtered().length === 0) {
    <div class="bl-empty">Aucun envoi pour ces critères</div>

  } @else {
    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="text-align:left">Date</th>
            <th class="bl-th" style="text-align:left">Élève · Famille</th>
            <th class="bl-th">Numéro</th>
            <th class="bl-th">Type template</th>
            <th class="bl-th bl-th--trim">Statut</th>
            <th class="bl-th">Dédup.</th>
          </tr>
        </thead>
        <tbody>
          @for (l of filtered(); track l.id_log) {
            <tr class="bl-tr">

              <!-- Date -->
              <td class="bl-td" style="font-size:11px;white-space:nowrap">
                <div>{{ fmtDate(l.date_envoi) }}</div>
                <div style="color:#aaa;font-size:10px">{{ fmtHeure(l.date_envoi) }}</div>
              </td>

              <!-- Élève + famille -->
              <td class="bl-td">
                <div style="font-weight:500">{{ nomEleve(l.id_eleve) }}</div>
                <div style="font-size:10px;color:#aaa">{{ nomFamille(l.id_famille) }}</div>
              </td>

              <!-- Numéro -->
              <td class="bl-td bl-td--center" style="font-size:11px;font-family:monospace">
                {{ l.numero_dest || '—' }}
              </td>

              <!-- Type template -->
              <td class="bl-td bl-td--center">
                @if (l.id_template) {
                  <span class="bl-mention bl-mention--info">{{ l.id_template }}</span>
                } @else {
                  <span style="color:#bbb">—</span>
                }
              </td>

              <!-- Statut — colonne accentuée -->
              <td class="bl-td bl-td--center bl-td--trim">
                <span [class]="statutCls(l.statut)">{{ statutLbl(l.statut) }}</span>
              </td>

              <!-- Hash dédup -->
              <td class="bl-td bl-td--center" style="font-size:10px;color:#bbb;
                          font-family:monospace;max-width:80px;overflow:hidden;
                          text-overflow:ellipsis">
                {{ l.hash_dedup || '—' }}
              </td>

            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pied -->
    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ filtered().length }} entrée(s) affichée(s) sur {{ logs().length }} total
      </span>
      <span class="bl-foot-info">
        Dernier envoi :
        {{ logs().length > 0 ? fmtDate(logs()[0].date_envoi) : '—' }}
      </span>
    </div>
  }

</div>
  `,
  styles: [`
    .bl-host       { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar        { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                     padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-sep        { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary{ display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre  { font-size:12px; font-weight:500; }
    .bl-cfg-seqs   { font-size:10px; color:#185FA5; }

    .bl-input { height:32px; padding:0 10px; font-size:13px;
                border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
                background:white; outline:none; width:180px; }
    .bl-input:focus { border-color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333;
              text-decoration:none; }
    .bl-btn:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                    cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }

    /* Stats rapides */
    .bl-stats      { display:flex; align-items:center; gap:0;
                     background:white; border:0.5px solid rgba(0,0,0,.09);
                     border-radius:8px; overflow:hidden; }
    .bl-stat-item  { display:flex; flex-direction:column; align-items:center;
                     padding:8px 18px; flex:1; }
    .bl-stat-val   { font-size:18px; font-weight:500; line-height:1.2; }
    .bl-stat-lbl   { font-size:10px; color:#aaa; }
    .bl-stat-sep   { width:0.5px; height:32px; background:rgba(0,0,0,.08);
                     flex-shrink:0; }

    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table      { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th         { padding:7px 10px; font-weight:500; font-size:11px;
                     background:#f8f8f8; color:#666;
                     border-bottom:0.5px solid rgba(0,0,0,.08);
                     text-align:center; white-space:nowrap; }
    .bl-th--trim   { background:#EBF3FC; color:#0C447C; }
    .bl-td         { padding:7px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
                     vertical-align:middle; }
    .bl-td--center { text-align:center; }
    .bl-td--trim   { background:#f0f8ff; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td    { background:rgba(0,0,0,.012); }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--neu  { background:#f5f5f5; color:#555; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px; color:#ccc; font-size:13px; }
  `],
})
export class AlertesLogComponent implements OnInit {

  private data = inject(GetServices);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // ── Données ──
  loading = signal(true);
  logs = signal<LogAlerte[]>([]);

  // ── Filtres — TOUS en signal() purs ──────────────────────────────
  // Règle : jamais de FormControl.value dans computed().
  // FormControl.value est une propriété ordinaire, pas un Signal.
  // computed() ne s'abonne qu'aux Signals — il ne verra jamais
  // les changements de FormControl.value.
  // Solution : signal() + méthode setter explicite.
  filtreStatut = signal<FiltreStatut>('');
  filtrePeriode = signal<FiltrePeriode>('');
  filtreType = signal('');
  recherche = signal('');

  // Options pour les chips
  optsStatut: { val: FiltreStatut; lbl: string }[] = [
    { val: '', lbl: 'Tous' },
    { val: 'envoye', lbl: 'Envoyés' },
    { val: 'echec', lbl: 'Échecs' },
  ];

  optsPeriode: { val: FiltrePeriode; lbl: string }[] = [
    { val: '', lbl: 'Toutes' },
    { val: 'today', lbl: "Aujourd'hui" },
    { val: 'week', lbl: 'Cette semaine' },
    { val: 'month', lbl: 'Ce mois' },
  ];

  // Setters — méthodes TS, jamais d'arrow functions ni de signal.set() dans le template
  setStatut(v: FiltreStatut): void { this.filtreStatut.set(v); }
  setPeriode(v: FiltrePeriode): void { this.filtrePeriode.set(v); }
  setType(v: string): void { this.filtreType.set(v); }

  setRecherche(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.recherche.set(val);
  }

  // ── Types distincts pour le filtre "Type" ──────────────────────
  typesDispos = computed<string[]>(() =>
    [...new Set(this.logs().map(l => l.id_template).filter(Boolean))]
  );

  // ── Liste filtrée — computed() pur, lit uniquement des Signals ──
  filtered = computed<LogAlerte[]>(() => {
    const statut = this.filtreStatut();
    const periode = this.filtrePeriode();
    const type = this.filtreType();
    const q = this.recherche().toLowerCase().trim();

    const now = new Date();
    const debut = this.debutPeriode(periode, now);

    return this.logs().filter(l => {

      // Filtre statut
      if (statut && l.statut !== statut) return false;

      // Filtre période
      if (debut) {
        const d = new Date(l.date_envoi);
        if (isNaN(d.getTime()) || d < debut) return false;
      }

      // Filtre type template
      if (type && l.id_template !== type) return false;

      // Filtre recherche (nom élève ou numéro)
      if (q) {
        const nomE = this.nomEleve(l.id_eleve).toLowerCase();
        const nomF = this.nomFamille(l.id_famille).toLowerCase();
        const num = (l.numero_dest ?? '').toLowerCase();
        if (!nomE.includes(q) && !nomF.includes(q) && !num.includes(q)) return false;
      }

      return true;
    });
  });

  // ── Statistiques ──
  nbEnvoyes = computed(() => this.logs().filter(l => l.statut === 'envoye').length);
  nbEchecs = computed(() => this.logs().filter(l => l.statut === 'echec').length);
  tauxReussite = computed(() => {
    const total = this.logs().length;
    if (!total) return 0;
    return Math.round((this.nbEnvoyes() / total) * 100);
  });

  resumeSous = computed(() => {
    const f = this.filtered().length;
    const t = this.logs().length;
    return `${f} / ${t} entrée(s)`;
  });

  // ── Init ──

  ngOnInit(): void {
    // const logs = this.data.getLogs().sort((a, b) =>
    //   new Date(b.date_envoi).getTime() - new Date(a.date_envoi).getTime()
    // );
    // this.logs.set(logs);
    // this.loading.set(false);
    // this.cdr.markForCheck();
  }

  // ── Action ──

  ouvrirNouveauTemplate(): void {
    this.dialog.open(TemplateFormComponent, {
      data: {} as any,
      width: '560px',
      maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) this.cdr.markForCheck();
    });
  }

  // ── Helpers données ──

  nomEleve(id: string): string {
    const e = this.data.getEleves().find(x => x.id_eleve === id);
    return e ? `${e.nom} ${e.prenom}` : id || '—';
  }

  nomFamille(id: string): string {
    return (this.data.getFamilles().find(f => f.id_famille === id)?.nom_famille ?? id) || '—';
  }

  // ── Helpers affichage ──

  statutLbl(s: string): string {
    if (s === 'envoye') return 'Envoyé ✓';
    if (s === 'echec') return 'Échec ✗';
    return s || '—';
  }

  statutCls(s: string): string {
    if (s === 'envoye') return 'bl-mention bl-mention--ok';
    if (s === 'echec') return 'bl-mention bl-mention--bad';
    return 'bl-mention bl-mention--neu';
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return iso; }
  }

  fmtHeure(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  }

  // ── Calcul du début de période pour le filtre ──
  private debutPeriode(p: FiltrePeriode, now: Date): Date | null {
    if (!p) return null;
    const d = new Date(now);
    if (p === 'today') {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (p === 'week') {
      d.setDate(d.getDate() - d.getDay());   // début de semaine (dimanche)
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (p === 'month') {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  }
}