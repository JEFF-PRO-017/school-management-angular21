// matieres-list.component.ts — liste + modal création/modification
import {
  Component, inject, computed, signal,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatiereModalComponent, MatiereModalData } from '../matieres-modal/matiere-modal.component';
import { MatiereConfig } from '../../../core/models';
import { CellDefDirective, TableColumn, TableComponent } from '../../../shared/components/table/table.component';
import { GetServices } from '../../../core/services/@data';

@Component({
  selector: 'app-matieres-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableComponent, CellDefDirective],
  template: `
<div class="d-flex flex-column gap-3 small">

  <!-- ══ BARRE ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-3 border-bottom">
    <div class="d-flex flex-column">
      <span class="fw-medium">{{ filtered().length }} matière(s)</span>
      <span class="small text-primary">{{ totalClasses() }} classe(s) concernée(s)</span>
    </div>

    <div class="vr mx-1"></div>

    @for (opt of optsClasse(); track opt.val) {
      <button type="button"
              class="btn btn-sm rounded-pill"
              [class.btn-primary]="filtreClasse() === opt.val"
              [class.btn-outline-secondary]="filtreClasse() !== opt.val"
              (click)="setClasse(opt.val)">
        {{ opt.label }}
      </button>
    }

    <div class="vr mx-1"></div>

    <button type="button" class="btn btn-primary btn-sm ms-auto d-inline-flex align-items-center gap-1"
            (click)="ouvrirModal(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvelle matière
    </button>
  </div>

  <!-- ══ TABLEAU RÉUTILISABLE ══ -->
  <app-table
    [columns]="columns"
    [data]="filtered()"
    [isGlobalFilter]="true"
    searchPlaceholder="Rechercher une matière..."
    [isExport]="true"
    exportFilename="matieres"
    [pageSize]="10"
    [trackByFn]="trackByMatiere"
    emptyMessage="Aucune matière">

    <ng-template cellDef="nom" let-m>
      <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-semibold"
             style="width:28px;height:28px;font-size:10px"
             [style.background]="avBg(m.id_matiere)"
             [style.color]="avTxt(m.id_matiere)">
          {{ abrev(m.nom_matiere) }}
        </div>
        <div>
          {{ m.nom_matiere }}
          @if (m.note_eliminatoire) {
            <div class="text-muted" style="font-size:10px">Élim. &lt; {{ m.note_eliminatoire }}</div>
          }
        </div>
      </div>
    </ng-template>

    <ng-template cellDef="coef" let-m>
      <span class="fw-bold text-primary">× {{ m.coefficient }}</span>
    </ng-template>

    <ng-template cellDef="groupe" let-m>
      @if (m.groupe) {
        <span >{{ m.groupe }}</span>
      } @else {
        <span class="text-muted">—</span>
      }
    </ng-template>

    <ng-template cellDef="niveau" let-m>
      @if (m.niveau) {
        <span >{{ m.niveau }}</span>
      } @else {
        <span class="text-muted">—</span>
      }
    </ng-template>

    <ng-template cellDef="actions" let-m>
      <button type="button" class="btn btn-sm btn-outline-secondary" title="Modifier" (click)="ouvrirModal(m)">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.3"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </ng-template>

  </app-table>

  <div class="d-flex justify-content-between flex-wrap gap-2 small text-muted">
    <span>{{ filtered().length }} matière(s)</span>
    <span>{{ nbSansEnseignant() }} sans enseignant assigné</span>
  </div>

</div>
  `,
})
export class MatieresListComponent {

  private dialog = inject(MatDialog);
  private get = inject(GetServices);
  private cdr = inject(ChangeDetectorRef);

  // ── Colonnes du tableau ──────────────────────────────────────
  columns: TableColumn<MatiereConfig>[] = [
    { id: 'nom',       header: 'Matière',    accessor: m => m.nom_matiere, sortable: true, filterable: true },
    { id: 'classe',    header: 'Classe',     accessor: m => this.nomClasse(m.id_classe), sortable: true, align: 'center' },
    { id: 'enseignant',header: 'Enseignant', accessor: m => this.nomEnseignant(m.id_enseignant), sortable: true, align: 'center' },
    { id: 'coef',      header: 'Coef.',      accessor: m => m.coefficient, sortable: true, align: 'center' },
    { id: 'groupe',    header: 'Groupe',     accessor: m => m.groupe ?? '-', align: 'center' },
    { id: 'niveau',    header: 'Niveau',     accessor: m => m.niveau ?? '-', align: 'center' },
    { id: 'actions',   header: 'Actions',    exportable: false, align: 'center' },
  ];

  // ── Filtres ────────────────────────────────────────────────────
  filtreClasse = signal('Tous');
  setClasse(v: string) { this.filtreClasse.set(v); }

  optsClasse = computed<{ val: string; label: string }[]>(() => {
    const classes = this.get.getClasses() ?? [];
    const ids = new Set(
      (this.get.getMatieres() ?? []).map(m => m.id_classe).filter(Boolean)
    );
    const opts = [...ids].map(id => ({
      val: id,
      label: classes.find(c => c.id_classe === id)?.nom_classe ?? id,
    }));
    return [{ val: 'Tous', label: 'Toutes' }, ...opts];
  });

  matieres = computed<any[]>(() => this.get.getMatieres() ?? []);

  filtered = computed<any[]>(() => {
    const cls = this.filtreClasse();
    const matieres = this.matieres();
    return cls === 'Tous'
      ? matieres
      : matieres.filter(m => m.id_classe === cls);
  });

  // ── Stats ──────────────────────────────────────────────────────
  totalClasses = computed(() => new Set(this.filtered().map(m => m.id_classe)).size);
  nbSansEnseignant = computed(() => this.filtered().filter(m => !m.id_enseignant).length);

  // ── Helpers affichage ──────────────────────────────────────────
  nomClasse(id: string): string {
    return this.get.getClasses()?.find(c => c.id_classe === id)?.nom_classe ?? id;
  }
  nomEnseignant(id: string): string {
    if (!id) return '—';
    const e = this.get.getUsers()?.find(x => x.id === id);
    return e ? `${e.nom} ${e.prenom}` : '—';
  }

  trackByMatiere = (m: MatiereConfig) => m.id_matiere;

  // ── Modal ──────────────────────────────────────────────────────
  ouvrirModal(matiere: MatiereConfig | any): void {
    this.dialog.open(MatiereModalComponent, {
      data: { matiere: matiere ?? undefined } satisfies MatiereModalData,
      width: '480px',
      maxWidth: '96vw',
    }).afterClosed().subscribe((r?: { success: boolean; matiere: MatiereConfig }) => {
      if (!r?.success) return;
      this.cdr.markForCheck();
    });
  }

  // ── Avatar ─────────────────────────────────────────────────────
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
  avBg(id: string): string { return this._palette[this._hashIdx(id)].bg; }
  avTxt(id: string): string { return this._palette[this._hashIdx(id)].txt; }
}