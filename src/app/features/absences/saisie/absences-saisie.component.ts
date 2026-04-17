// absences-saisie.component.ts — saisie des absences
// Deux modes basculables par l'utilisateur :
//   • Mode GRILLE (défaut) — cartes cliquables, interface terrain rapide
//   • Mode LISTE           — tableau avec checkboxes, vue compacte
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../core/services/cache.service';
import { DataService }  from '../../../core/services/data.service';
import { AuthService }  from '../../../core/services/auth.service';
import { Eleve, Absence } from '../../../core/models';

type ViewMode = 'grille' | 'liste';

@Component({
  selector: 'app-absences-saisie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Saisie des absences</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <span class="bl-sep"></span>

    <!-- Date et heure -->
    <input [formControl]="ctrlDate"  type="date" class="bl-fi" style="width:140px">
    <input [formControl]="ctrlHeure" type="time" class="bl-fi" style="width:100px">

    <span class="bl-sep"></span>

    <!-- Bascule de mode -->
    <div class="bl-mode-toggle">
      <button class="bl-mode-btn" [class.on]="mode() === 'grille'"
              (click)="setMode('grille')" title="Vue grille">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1"
                stroke="currentColor" stroke-width="1.3"/>
          <rect x="9" y="1" width="6" height="6" rx="1"
                stroke="currentColor" stroke-width="1.3"/>
          <rect x="1" y="9" width="6" height="6" rx="1"
                stroke="currentColor" stroke-width="1.3"/>
          <rect x="9" y="9" width="6" height="6" rx="1"
                stroke="currentColor" stroke-width="1.3"/>
        </svg>
        Grille
      </button>
      <button class="bl-mode-btn" [class.on]="mode() === 'liste'"
              (click)="setMode('liste')" title="Vue liste">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M4 4h9M4 8h9M4 12h9" stroke="currentColor"
                stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="1.5" cy="4"  r="1" fill="currentColor"/>
          <circle cx="1.5" cy="8"  r="1" fill="currentColor"/>
          <circle cx="1.5" cy="12" r="1" fill="currentColor"/>
        </svg>
        Liste
      </button>
    </div>

    <span class="bl-sep"></span>

    <!-- Enregistrer -->
    <button class="bl-btn bl-btn--primary"
            (click)="enregistrer()"
            [disabled]="absents().size === 0 || saving()">
      @if (saving()) { <span class="bl-spinner"></span> }
      @else {
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l4 4 6-7" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      }
      Enregistrer ({{ absents().size }})
    </button>
  </div>

  <!-- ══ CHIPS CLASSES ══ -->
  <div class="bl-chips-bar">
    <span class="bl-chips-lbl">Classe</span>
    @for (c of classes(); track c.id_classe) {
      <button class="bl-chip" [class.bl-chip--on]="classeId() === c.id_classe"
              (click)="setClasse(c.id_classe)">
        {{ c.nom_classe }}
        @if (nbAbsentsClasse(c.id_classe) > 0) {
          <span class="bl-badge-red">{{ nbAbsentsClasse(c.id_classe) }}</span>
        }
      </button>
    }
  </div>

  <!-- ══ CONTENU ══ -->
  @if (!classeId()) {
    <div class="bl-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
           style="color:#ddd;margin-bottom:8px">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Sélectionnez une classe pour commencer
    </div>

  } @else if (eleves().length === 0) {
    <div class="bl-empty">Aucun élève actif dans cette classe</div>

  } @else {

    <!-- Barre statut sélection -->
    <div class="bl-sel-bar">
      <!-- Tout cocher / décocher -->
      <label class="bl-chk-wrap">
        <input type="checkbox" class="bl-chk"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <span>Tout marquer absent</span>
      </label>

      @if (absents().size > 0) {
        <span class="bl-mention bl-mention--bad">
          {{ absents().size }} absent(s)
        </span>
      } @else {
        <span style="font-size:11px;color:#aaa">
          Cochez les élèves absents
        </span>
      }

      @if (absents().size > 0) {
        <button class="bl-btn"
                style="height:26px;font-size:11px;padding:0 10px"
                (click)="toutDecocher()">
          Tout décocher
        </button>
      }

      <span style="flex:1"></span>
      <span style="font-size:11px;color:#aaa">
        {{ eleves().length }} élève(s)
      </span>
    </div>

    <!-- ══ MODE GRILLE ══ -->
    @if (mode() === 'grille') {
      <div class="el-grid">
        @for (e of eleves(); track e.id_eleve) {
          <label class="el-card"
                 [class.el-card--absent]="estAbsent(e.id_eleve)"
                 [class.el-card--insolvable]="estInsolvable(e.id_famille)">

            <!-- checkbox cachée — la carte entière est la zone de clic -->
            <input type="checkbox" class="el-chk-hidden"
                   [checked]="estAbsent(e.id_eleve)"
                   (change)="toggleAbsent(e.id_eleve, e.id_famille, $event)">

            <!-- Avatar -->
            <div class="el-av"
                 [style.background]="avBg(e.id_eleve)"
                 [style.color]="avTxt(e.id_eleve)">
              {{ initiales(e.nom, e.prenom) }}
            </div>

            <!-- Infos -->
            <div class="el-info">
              <div class="el-nom">{{ e.nom }} {{ e.prenom }}</div>
              @if (estInsolvable(e.id_famille)) {
                <div class="el-dette">Pension en retard</div>
              }
            </div>

            <!-- Coche absent -->
            @if (estAbsent(e.id_eleve)) {
              <div class="el-check-icon">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-7" stroke="white"
                        stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round"/>
                </svg>
              </div>
            }
          </label>
        }
      </div>
    }

    <!-- ══ MODE LISTE ══ -->
    @if (mode() === 'liste') {
      <div class="bl-table-wrap">
        <table class="bl-table">
          <thead>
            <tr>
              <th class="bl-th" style="width:36px">
                <input type="checkbox" class="bl-chk"
                       [checked]="toutSelectionne()"
                       [indeterminate]="selectionPartielle()"
                       (change)="toggleTout($event)">
              </th>
              <th class="bl-th" style="text-align:left">Élève</th>
              <th class="bl-th">Statut</th>
              <th class="bl-th">Pension</th>
            </tr>
          </thead>
          <tbody>
            @for (e of eleves(); track e.id_eleve) {
              <tr class="bl-tr" [class.bl-tr--absent]="estAbsent(e.id_eleve)">

                <!-- Checkbox -->
                <td class="bl-td bl-td--center">
                  <input type="checkbox" class="bl-chk"
                         [checked]="estAbsent(e.id_eleve)"
                         (change)="toggleAbsent(e.id_eleve, e.id_famille, $event)">
                </td>

                <!-- Nom + avatar -->
                <td class="bl-td">
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="el-av el-av--sm"
                         [style.background]="avBg(e.id_eleve)"
                         [style.color]="avTxt(e.id_eleve)">
                      {{ initiales(e.nom, e.prenom) }}
                    </div>
                    <div>
                      <div style="font-weight:500;font-size:12px">
                        {{ e.nom }} {{ e.prenom }}
                      </div>
                      @if (e.matricule) {
                        <div style="font-size:10px;color:#aaa">
                          {{ e.matricule }}
                        </div>
                      }
                    </div>
                  </div>
                </td>

                <!-- Statut présence -->
                <td class="bl-td bl-td--center">
                  @if (estAbsent(e.id_eleve)) {
                    <span class="bl-mention bl-mention--bad">Absent(e)</span>
                  } @else {
                    <span class="bl-mention bl-mention--ok">Présent(e)</span>
                  }
                </td>

                <!-- Pension -->
                <td class="bl-td bl-td--center">
                  @if (estInsolvable(e.id_famille)) {
                    <span class="bl-mention bl-mention--warn">En retard</span>
                  } @else {
                    <span style="color:#bbb;font-size:11px">—</span>
                  }
                </td>

              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="bl-foot">
      <span class="bl-foot-info">
        @if (mode() === 'grille') {
          🟥 Carte rouge = absent · 🟡 Nom rouge = pension en retard
        } @else {
          Cochez les élèves absents dans la colonne de gauche
        }
      </span>
      <span class="bl-foot-info">
        {{ absents().size }} absent(s) / {{ eleves().length }} élève(s)
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

    .bl-fi { height:32px; padding:0 10px; font-size:13px;
             border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
             background:white; outline:none; }
    .bl-fi:focus { border-color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn:not(:disabled):hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:not(:disabled):hover { opacity:.88; }

    /* Bascule de mode */
    .bl-mode-toggle { display:flex; background:#f5f5f5; border-radius:6px;
                       padding:2px; gap:2px; }
    .bl-mode-btn    { height:28px; padding:0 10px; border:none; border-radius:5px;
                       font-size:11px; cursor:pointer; background:transparent;
                       color:#888; transition:all .15s;
                       display:flex; align-items:center; gap:5px; }
    .bl-mode-btn.on { background:white; color:#185FA5; font-weight:500;
                       box-shadow:0 1px 3px rgba(0,0,0,.12); }
    .bl-mode-btn:not(.on):hover { background:rgba(0,0,0,.05); color:#555; }

    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:28px; padding:0 10px; border-radius:6px; font-size:12px;
                    cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s;
                    display:flex; align-items:center; gap:5px; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }
    .bl-badge-red { background:#dc3545; color:white; border-radius:99px;
                    font-size:10px; padding:1px 5px; font-weight:500; }

    /* Barre sélection */
    .bl-sel-bar  { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .bl-chk-wrap { display:flex; align-items:center; gap:6px;
                   cursor:pointer; font-size:12px; }
    .bl-chk      { width:14px; height:14px; cursor:pointer; accent-color:#185FA5; }

    /* ── MODE GRILLE ── */
    .el-grid { display:grid;
               grid-template-columns:repeat(auto-fill, minmax(170px, 1fr));
               gap:8px; }

    .el-card { display:flex; align-items:center; gap:10px;
               padding:10px 12px; border-radius:8px;
               border:1.5px solid rgba(0,0,0,.09);
               background:white; cursor:pointer;
               position:relative; transition:all .15s; user-select:none; }
    .el-card:hover { border-color:#185FA5; background:#f8fbff; }

    /* Absent — fond rouge clair, bordure rouge */
    .el-card--absent { background:#fff5f5 !important;
                       border-color:#dc3545 !important; }

    /* Insolvable — nom en rouge */
    .el-card--insolvable .el-nom { color:#dc3545; font-weight:500; }
    /* Insolvable ET absent — avatar rouge */
    .el-card--absent.el-card--insolvable .el-av,
    .el-card--insolvable .el-av { background:#FCEBEB !important;
                                   color:#791F1F !important; }

    /* Checkbox cachée — la carte entière est cliquable */
    .el-chk-hidden { position:absolute; opacity:0; width:0; height:0; }

    .el-av    { width:36px; height:36px; border-radius:50%; flex-shrink:0;
                display:flex; align-items:center; justify-content:center;
                font-size:12px; font-weight:600; }
    .el-av--sm{ width:28px; height:28px; font-size:10px; }

    .el-info  { flex:1; min-width:0; }
    .el-nom   { font-size:12px; font-weight:500; color:#333;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .el-dette { font-size:10px; color:#dc3545; font-weight:500; }

    .el-check-icon { width:22px; height:22px; background:#dc3545;
                     border-radius:50%; flex-shrink:0;
                     display:flex; align-items:center; justify-content:center; }

    /* ── MODE LISTE ── */
    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th  { padding:7px 10px; font-weight:500; font-size:11px;
              background:#f8f8f8; color:#666;
              border-bottom:0.5px solid rgba(0,0,0,.08);
              text-align:center; white-space:nowrap; }
    .bl-td  { padding:7px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
              vertical-align:middle; }
    .bl-td--center { text-align:center; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover     .bl-td  { background:rgba(0,0,0,.012); }
    .bl-tr--absent   .bl-td  { background:#fff5f5; }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px;
                        display:inline-block; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { display:flex; flex-direction:column; align-items:center;
                    justify-content:center; padding:48px; color:#ccc;
                    font-size:13px; gap:4px; }

    .bl-spinner { width:13px; height:13px; border-radius:50%;
                  border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
                  animation:sp .7s linear infinite; display:inline-block; }
    @keyframes sp { to { transform:rotate(360deg); } }
  `],
})
export class AbsencesSaisieComponent implements OnInit {

  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);

  // ── Formulaire date/heure ─────────────────────────────────────────
  ctrlDate  = new FormControl(new Date().toISOString().slice(0, 10));
  ctrlHeure = new FormControl(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );

  // ── State ─────────────────────────────────────────────────────────
  classeId = signal('');
  absents  = signal<Set<string>>(new Set());  // id_eleve
  saving   = signal(false);
  mode     = signal<ViewMode>('grille');

  // ── Palette avatars ───────────────────────────────────────────────
  private readonly _palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' },
    { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' },
    { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#E0F2F1', txt: '#00695C' },
    { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#E8EAF6', txt: '#283593' },
    { bg: '#FBE9E7', txt: '#BF360C' },
  ];

  ngOnInit(): void {
    const classes = this.classes();
    if (classes.length) this.classeId.set(classes[0].id_classe);
  }

  // ── Données ───────────────────────────────────────────────────────

  classes = computed(() => {
    const all     = this.cache.getClasses();
    const section = this.auth.getSectionActive();
    const primCycles = ['CP','CE1','CE2','CM1','CM2'];
    return all.filter(c => {
      if (section === 'primaire')   return primCycles.some(n => c.nom_classe.includes(n));
      if (section === 'secondaire') return !primCycles.some(n => c.nom_classe.includes(n));
      return true;
    });
  });

  eleves = computed<Eleve[]>(() => {
    if (!this.classeId()) return [];
    return this.cache.getEleves()
      .filter(e => e.id_classe === this.classeId() && e.statut === 'actif')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  resumeSous = computed(() => {
    const c = this.cache.classesMap().get(this.classeId());
    if (!c) return 'Choisir une classe';
    const abs = this.absents().size;
    const tot = this.eleves().length;
    return `${c.nom_classe} · ${abs} absent(s) / ${tot} élève(s)`;
  });

  // Insolvable : restant dû > 0
  estInsolvable(idFamille: string): boolean {
    const f = this.cache.famillesMap().get(idFamille);
    if (!f) return false;
    const attendu = +(f.montant_total_attendu ?? 0) - +(f.montant_reduction ?? 0);
    const verse   = (f.paiements ?? []).reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
    return attendu > 0 && verse < attendu;
  }

  // Badge chips : nb d'absents déjà cochés dans une classe
  nbAbsentsClasse(idClasse: string): number {
    const ids = this.cache.getEleves()
      .filter(e => e.id_classe === idClasse).map(e => e.id_eleve);
    return ids.filter(id => this.absents().has(id)).length;
  }

  // ── Sélection ─────────────────────────────────────────────────────

  toutSelectionne = computed(() =>
    this.eleves().length > 0 &&
    this.eleves().every(e => this.absents().has(e.id_eleve))
  );
  selectionPartielle = computed(() =>
    this.absents().size > 0 && !this.toutSelectionne()
  );

  estAbsent(idEleve: string): boolean { return this.absents().has(idEleve); }

  toggleAbsent(idEleve: string, idFamille: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.absents.update(s => {
      const n = new Set(s); checked ? n.add(idEleve) : n.delete(idEleve); return n;
    });
  }

  toggleTout(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.absents.set(
      checked ? new Set(this.eleves().map(e => e.id_eleve)) : new Set()
    );
  }

  toutDecocher(): void { this.absents.set(new Set()); }

  // ── Mode ──────────────────────────────────────────────────────────

  setMode(m: ViewMode): void { this.mode.set(m); }

  // ── Changement de classe ──────────────────────────────────────────

  setClasse(id: string): void {
    this.classeId.set(id);
    this.absents.set(new Set());  // réinitialise à chaque changement
  }

  // ── Enregistrement ───────────────────────────────────────────────

  async enregistrer(): Promise<void> {
    if (this.absents().size === 0) return;
    this.saving.set(true);

    const date  = this.ctrlDate.value  ?? new Date().toISOString().slice(0, 10);
    const heure = this.ctrlHeure.value ?? '08:00';

    const absences: Absence[] = [...this.absents()].map(idEleve => {
      const eleve = this.cache.getEleves().find(e => e.id_eleve === idEleve);
      return {
        id:         `ABS-${Date.now()}-${idEleve.slice(-4)}`,
        id_enfant:  idEleve,
        id_famille: eleve?.id_famille ?? '',
        id_classe:  this.classeId(),
        date,
        heure,
        justifie:   false,
      };
    });

    await this.data.addAbsencesBatch(absences);
    this.saving.set(false);

    this.snack.open(
      `${absences.length} absence(s) enregistrée(s) — ${date} à ${heure}`,
      'OK',
      { duration: 4000 }
    );
    this.absents.set(new Set());
    this.cdr.markForCheck();
  }

  // ── Helpers visuels ──────────────────────────────────────────────

  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }

  private _hashIdx(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this._palette.length;
  }

  avBg(id: string):  string { return this._palette[this._hashIdx(id)].bg; }
  avTxt(id: string): string { return this._palette[this._hashIdx(id)].txt; }
}