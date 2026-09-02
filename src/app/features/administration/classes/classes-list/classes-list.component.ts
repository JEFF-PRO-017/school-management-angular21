import {
  Component, inject, computed, signal,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ClasseModalComponent, ClasseModalData } from '../classe-form/classe-form.component';
import { Classe } from '../../../../core/models/academic';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GetServices } from '../../../../core/services/@data';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, PaginationComponent],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <div class="d-flex flex-column" style="gap:1px">
      <span class="fw-medium" style="font-size:12px">{{ filtered().length }} classe(s)</span>
      <span class="text-primary" style="font-size:10px">
        {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
    </div>

    <div class="vr mx-1"></div>

    <!-- Chips cycle -->
    @for (opt of optsCycle(); track opt) {
      <button
        class="btn btn-sm"
        [class.btn-outline-secondary]="filtreCycle() !== opt"
        [class.btn-primary]="filtreCycle() === opt"
        style="font-size:11px; padding:2px 10px"
        (click)="setCycle(opt)">
        {{ opt }}
      </button>
    }

    <div class="vr mx-1"></div>

    <button class="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
            (click)="ouvrirModal(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvelle classe
    </button>
  </div>

  <!-- ══ TABLEAU ══ -->
  @if (page().length > 0) {
    <div class="table-responsive border rounded">
      <table class="table table-sm table-hover mb-0" style="font-size:12px">
        <thead class="table-light">
          <tr>
            <th class="text-start">Classe</th>
            <th class="text-center">Section · niveau</th>
            <th class="text-center table-primary">Effectif</th>
            <th class="text-center">Remplissage</th>
            <th class="text-center">Prix</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (c of page(); track c.id_classe) {
            <tr>
              <!-- Nom + avatar -->
              <td class="fw-medium align-middle">
                <div class="d-flex align-items-center gap-2">
                  <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                       style="width:28px;height:28px;font-size:10px;font-weight:600"
                       [style.background]="avBg(c.id_classe)"
                       [style.color]="avTxt(c.id_classe)">
                    {{ abrev(c.nom_classe) }}
                  </div>
                  {{ c.nom_classe }}
                </div>
              </td>

              <!-- Cycle badge -->
              <td class="text-center align-middle">
                <span [class]="sectionCls(c.cycle)"
                      style="font-size:11px">{{ c.cycle }}</span>
              </td>

              <!-- Effectif -->
              <td class="text-center align-middle table-primary">
                <span [class]="effectifCls(c.id_classe, c.effectif_max)">
                  {{ effectif(c.id_classe) }} / {{ c.effectif_max }}
                </span>
              </td>

              <!-- Barre de remplissage -->
              <td class="text-center align-middle" style="min-width:110px">
                <div class="progress" style="height:5px">
                  <div class="progress-bar"
                       [class]="progCls(c.id_classe, c.effectif_max)"
                       [style.width.%]="tauxPct(c.id_classe, c.effectif_max)">
                  </div>
                </div>
                <div class="text-muted mt-1" style="font-size:10px">
                  {{ tauxPct(c.id_classe, c.effectif_max) }}%
                </div>
              </td>

              <!-- Prix -->
              <td class="text-center align-middle text-muted" style="font-size:11px">
                {{ c?.prix | number }}
              </td>

              <!-- Actions -->
              <td class="text-center align-middle">
                 <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center"
                        style="width:28px;height:28px;padding:0"
                        title="Modifier"
                        (click)="ouvrirModal(c)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z"
                          stroke="currentColor" stroke-width="1.3"
                          stroke-linecap="round" stroke-linejoin="round"/>
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

    <!-- Pied -->
    <div class="d-flex justify-content-between flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">
        {{ filtered().length }} classe(s) · {{ totalEleves() }} élève(s)
      </span>
      <span class="text-muted" style="font-size:11px">
        {{ nbPlein() }} complète(s) · {{ nbDisponible() }} disponible(s)
      </span>
    </div>

  } @else {
    <div class="text-center text-muted py-5" style="font-size:13px">
      Aucune classe —
      <span class="text-primary" style="cursor:pointer" (click)="ouvrirModal(null)">
        créer la première
      </span>
    </div>
  }

</div>
  `,
  // Plus aucun style local — tout est Bootstrap
})
export class ClassesListComponent {

  private dialog = inject(MatDialog);
  private get   = inject(GetServices);
  private cdr    = inject(ChangeDetectorRef);

  anneeScolaire = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
  //TODO a corrige, CENTRALISER CETTE VARIABLE DANS UN SERVICE
  pageSize      = 10;
  

  // ── Filtres ──────────────────────────────────────────────────────
  filtreCycle = signal('Tous');
  setCycle(v: string) { this.filtreCycle.set(v); }

  optsCycle = computed<string[]>(() => {
    const cycles = new Set(
      (this.get.getClasses() ?? []).map(c => c.cycle).filter(Boolean)
    );
    return ['Tous', ...cycles];
  });

  classes  = computed(() => this.get.getClasses() as Classe[] ?? []);
  filtered = computed(() => {
    const cycle = this.filtreCycle();
    return cycle === 'Tous'
      ? this.classes()
      : this.classes().filter(c => c.cycle === cycle);
  });

  // ── Pagination ───────────────────────────────────────────────────
  private _debut = signal(0);
  private _fin   = signal(this.pageSize);

  page = computed(() => this.filtered().slice(this._debut(), this._fin()));

  onPage(e: { debut: number; fin: number }): void {
    this._debut.set(e.debut);
    this._fin.set(e.fin);
  }

  // ── Stats ─────────────────────────────────────────────────────────
  totalEleves  = computed(() =>
    this.filtered().reduce((s, c) => s + this.effectif(c.id_classe), 0)
  );
  nbPlein      = computed(() =>
    this.filtered().filter(c => this.effectif(c.id_classe) >= c.effectif_max).length
  );
  nbDisponible = computed(() =>
    this.filtered().filter(c => this.tauxPct(c.id_classe, c.effectif_max) < 80).length
  );

  // ── Modal ─────────────────────────────────────────────────────────
  ouvrirModal(classe: Classe | null): void {
    this.dialog.open(ClasseModalComponent, {
      data:     { classe: classe ?? undefined } satisfies ClasseModalData,
      width:    '480px',
      maxWidth: '96vw',
    }).afterClosed().subscribe((r?: { success: boolean; classe: Classe }) => {
      if (!r?.success) return;
      this.cdr.markForCheck();
    });
  }

  // ── Helpers effectif ──────────────────────────────────────────────
  effectif(id: string): number {
    return (this.get.getEleves() ?? [])
      .filter(e => e.id_classe === id 
        // TODO: A REMMETTRE
        // && e.statut === 'ACTIF'   
        ).length;
  }
  tauxPct(id: string, max: number): number {
    if (!max) return 0;
    return Math.min(100, Math.round((this.effectif(id) / max) * 100));
  }

  // Badge effectif → classes Bootstrap utilitaires
  effectifCls(id: string, max: number): string {
    const t = this.tauxPct(id, max);
    if (t >= 100) return 'badge text-bg-danger';
    if (t >= 80)  return 'badge text-bg-warning';
    return 'badge text-bg-success';
  }

  // Barre de progression → couleur Bootstrap
  progCls(id: string, max: number): string {
    const t = this.tauxPct(id, max);
    if (t >= 100) return 'bg-danger';
    if (t >= 80)  return 'bg-warning';
    return 'bg-success';
  }

  // Badge cycle
  sectionCls(cycle: string): string {
    return cycle === 'primaire'
      ? 'badge text-bg-success'
      : 'badge text-bg-primary';
  }

  // ── Avatar ────────────────────────────────────────────────────────
  abrev(nom: string): string {
    const w = nom.trim().split(/\s+/);
    return w.length === 1
      ? w[0].slice(0, 3).toUpperCase()
      : w.slice(0, 2).map(x => x[0]).join('').toUpperCase();
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