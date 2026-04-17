// classes-list.component.ts — liste + modal création/modification
import {
  Component, inject, computed, signal,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog }  from '@angular/material/dialog';
import { DataService }  from '../../../core/services/data.service';
import { CacheService } from '../../../core/services/cache.service';
import { Classe } from '../../../core/models';
import { ClasseModalComponent, ClasseModalData } from '../classe-form/classe-form.component';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ filtered().length }} classe(s)</span>
      <span class="bl-cfg-seqs">
        {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
    </div>

    <span class="bl-sep"></span>

    <!-- Filtre cycle — chips compactes -->
    @for (opt of optsCycle(); track opt) {
      <button class="bl-chip" [class.bl-chip--on]="filtreCycle() === opt"
              (click)="setCycle(opt)">{{ opt }}</button>
    }

    <span class="bl-sep"></span>

    <button class="bl-btn bl-btn--primary" (click)="ouvrirModal(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvelle classe
    </button>
  </div>

  <!-- ══ TABLEAU ══ -->
  @if (filtered().length > 0) {
    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="text-align:left">Classe</th>
            <th class="bl-th">Section · niveau</th>
            <th class="bl-th bl-th--trim">Effectif</th>
            <th class="bl-th">Remplissage</th>
            <th class="bl-th">Année</th>
            <th class="bl-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (c of filtered(); track c.id_classe) {
            <tr class="bl-tr">

              <!-- Nom + avatar -->
              <td class="bl-td bl-td--name">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="bl-av"
                       [style.background]="avBg(c.id_classe)"
                       [style.color]="avTxt(c.id_classe)">
                    {{ abrev(c.nom_classe) }}
                  </div>
                  {{ c.nom_classe }}
                </div>
              </td>

              <!-- Section + niveau -->
              <td class="bl-td bl-td--center" style="font-size:11px">
                <span [class]="sectionCls(c.cycle)">{{ c.cycle }}</span>
                @if (c.niveau) {
                  <div style="color:#aaa;margin-top:2px">{{ c.niveau }}</div>
                }
              </td>

              <!-- Effectif accentué -->
              <td class="bl-td bl-td--center bl-td--trim">
                <span [class]="effectifCls(c.id_classe, c.effectif_max)">
                  {{ effectif(c.id_classe) }} / {{ c.effectif_max }}
                </span>
              </td>

              <!-- Barre de remplissage -->
              <td class="bl-td bl-td--center" style="min-width:110px">
                <div class="bl-prog-track">
                  <div [class]="progCls(c.id_classe, c.effectif_max)"
                       [style.width.%]="tauxPct(c.id_classe, c.effectif_max)">
                  </div>
                </div>
                <div style="font-size:10px;color:#aaa;margin-top:2px">
                  {{ tauxPct(c.id_classe, c.effectif_max) }}%
                </div>
              </td>

              <!-- Année -->
              <td class="bl-td bl-td--center"
                  style="font-size:11px;color:#888">
                {{ c.annee_scolaire }}
              </td>

              <!-- Actions -->
              <td class="bl-td bl-td--center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <!-- Élèves -->
                  <a [routerLink]="['/eleves']"
                     [queryParams]="{ classe: c.id_classe }"
                     class="bl-icon-btn" title="Voir les élèves"
                     style="text-decoration:none">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="5" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
                      <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"
                            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      <circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/>
                      <path d="M10 9.5c2 0 4 1.5 4 3.5"
                            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                  </a>
                  <!-- Modifier -->
                  <button class="bl-icon-btn" title="Modifier"
                          (click)="ouvrirModal(c)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <!-- Bulletins -->
                  <a [routerLink]="['/notes/bulletins']"
                     [queryParams]="{ classe: c.id_classe }"
                     class="bl-icon-btn" title="Bulletins"
                     style="text-decoration:none">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="1" width="12" height="14" rx="1.5"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M5 5h6M5 8h6M5 11h3"
                            stroke="currentColor" stroke-width="1.2"
                            stroke-linecap="round"/>
                    </svg>
                  </a>
                </div>
              </td>

            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ filtered().length }} classe(s) · {{ totalEleves() }} élève(s)
      </span>
      <span class="bl-foot-info">
        {{ nbPlein() }} complète(s) · {{ nbDisponible() }} disponible(s)
      </span>
    </div>

  } @else {
    <div class="bl-empty">
      Aucune classe —
      <span style="color:#185FA5;cursor:pointer"
            (click)="ouvrirModal(null)">créer la première</span>
    </div>
  }

</div>
  `,
  styles: [`
    .bl-host  { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar   { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-sep   { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              text-decoration:none; border:0.5px solid rgba(0,0,0,.18);
              background:white; color:#333; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    .bl-chip    { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                  cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                  background:white; color:#555; transition:all .12s; }
    .bl-chip--on{ background:#EBF3FC; color:#185FA5;
                  border-color:#B5D4F4; font-weight:500; }

    .bl-av { width:28px; height:28px; border-radius:50%; flex-shrink:0;
             display:flex; align-items:center; justify-content:center;
             font-size:10px; font-weight:600; }

    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th    { padding:7px 10px; font-weight:500; font-size:11px;
                background:#f8f8f8; color:#666;
                border-bottom:0.5px solid rgba(0,0,0,.08);
                text-align:center; white-space:nowrap; }
    .bl-th--trim { background:#EBF3FC; color:#0C447C; }
    .bl-td       { padding:7px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
                   vertical-align:middle; }
    .bl-td--name   { font-weight:500; }
    .bl-td--center { text-align:center; }
    .bl-td--trim   { background:#EBF3FC; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td { background:rgba(0,0,0,.015); }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--pri  { background:#E8F5E9; color:#2E7D32; }
    .bl-mention--sec  { background:#EBF3FC; color:#185FA5; }

    .bl-prog-track { height:5px; border-radius:3px;
                     background:#f0f0f0; overflow:hidden; }
    .bl-prog-fill  { height:100%; border-radius:3px; transition:width .3s; }
    .bl-prog--ok   { background:#0F6E56; }
    .bl-prog--warn { background:#BA7517; }
    .bl-prog--bad  { background:#993C1D; }

    .bl-icon-btn { width:28px; height:28px; padding:0;
                   border:0.5px solid rgba(0,0,0,.12); background:white;
                   cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555; }
    .bl-icon-btn:hover { background:#EBF3FC; color:#185FA5; border-color:#B5D4F4; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px;
                    color:#ccc; font-size:13px; }
  `],
})
export class ClassesListComponent {

  private dialog = inject(MatDialog);
  private data   = inject(DataService);
  private cache  = inject(CacheService);
  private cdr    = inject(ChangeDetectorRef);

  anneeScolaire = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  // ── Filtres ────────────────────────────────────────────────────────
  // getClasses() retourne déjà les classes filtrées par section active
  // On ajoute un filtre cycle local pour affiner dans la section
  filtreCycle = signal('Tous');
  setCycle(v: string) { this.filtreCycle.set(v); }

  optsCycle = computed<string[]>(() => {
    const cycles = new Set(
      (this.data.getClasses() ?? []).map(c => c.cycle).filter(Boolean)
    );
    return ['Tous', ...cycles];
  });

  // getClasses() lit _classesEnrichies qui est déjà filtrée par _section
  classes  = computed(() => this.data.getClasses() ?? []);

  filtered = computed(() => {
    const cycle = this.filtreCycle();
    return cycle === 'Tous'
      ? this.classes()
      : this.classes().filter(c => c.cycle === cycle);
  });

  // ── Stats ──────────────────────────────────────────────────────────

  totalEleves  = computed(() =>
    this.filtered().reduce((s, c) => s + this.effectif(c.id_classe), 0)
  );
  nbPlein      = computed(() =>
    this.filtered().filter(c => this.effectif(c.id_classe) >= c.effectif_max).length
  );
  nbDisponible = computed(() =>
    this.filtered().filter(c =>
      this.tauxPct(c.id_classe, c.effectif_max) < 80
    ).length
  );

  // ── Modal ──────────────────────────────────────────────────────────

  ouvrirModal(classe: Classe | null): void {
    this.dialog.open(ClasseModalComponent, {
      data:     { classe: classe ?? undefined } satisfies ClasseModalData,
      width:    '480px',
      maxWidth: '96vw',
    }).afterClosed().subscribe((r?: { success: boolean; classe: Classe }) => {
      if (!r?.success) return;
      // Le cache est déjà mis à jour par ClasseModalComponent.sauvegarder()
      // via cache.upsertClasse() — juste redétecter les changements ici
      this.cdr.markForCheck();
    });
  }

  // ── Helpers effectif ──────────────────────────────────────────────

  effectif(id: string): number {
    return (this.data.getEleves() ?? [])
      .filter(e => e.id_classe === id && e.statut === 'actif').length;
  }
  tauxPct(id: string, max: number): number {
    if (!max) return 0;
    return Math.min(100, Math.round((this.effectif(id) / max) * 100));
  }

  effectifCls(id: string, max: number): string {
    const t = this.tauxPct(id, max);
    if (t >= 100) return 'bl-mention bl-mention--bad';
    if (t >= 80)  return 'bl-mention bl-mention--warn';
    return 'bl-mention bl-mention--ok';
  }
  progCls(id: string, max: number): string {
    const t = this.tauxPct(id, max);
    if (t >= 100) return 'bl-prog-fill bl-prog--bad';
    if (t >= 80)  return 'bl-prog-fill bl-prog--warn';
    return 'bl-prog-fill bl-prog--ok';
  }
  sectionCls(cycle: string): string {
    return cycle === 'primaire'
      ? 'bl-mention bl-mention--pri'
      : 'bl-mention bl-mention--sec';
  }

  // ── Avatar ────────────────────────────────────────────────────────

  abrev(nom: string): string {
    const words = nom.trim().split(/\s+/);
    return words.length === 1
      ? words[0].slice(0, 3).toUpperCase()
      : words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  private readonly _palette = [
    { bg: '#E3F2FD', txt: '#1565C0' }, { bg: '#E8F5E9', txt: '#2E7D32' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#FCE4EC', txt: '#C62828' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];
  private _hashIdx(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this._palette.length;
  }
  avBg(id: string):  string { return this._palette[this._hashIdx(id)].bg; }
  avTxt(id: string): string { return this._palette[this._hashIdx(id)].txt; }
}