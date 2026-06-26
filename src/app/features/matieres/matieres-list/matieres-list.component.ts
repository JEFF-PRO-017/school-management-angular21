// matieres-list.component.ts — liste + modal création/modification
import {
  Component, inject, computed, signal,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { MatDialog }    from '@angular/material/dialog';
import { DataService }  from '../../../core/services/data.service';
import { CacheService } from '../../../core/services/cache.service';
import { MatiereConfig } from '../../../core/models/last_index';
import { MatiereModalComponent, MatiereModalData } from '../matieres-modal/matiere-modal.component';

@Component({
  selector: 'app-matieres-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ filtered().length }} matière(s)</span>
      <span class="bl-cfg-seqs">{{ totalClasses() }} classe(s) concernée(s)</span>
    </div>

    <span class="bl-sep"></span>

    <!-- Filtre par classe -->
    @for (opt of optsClasse(); track opt.val) {
      <button class="bl-chip"
              [class.bl-chip--on]="filtreClasse() === opt.val"
              (click)="setClasse(opt.val)">
        {{ opt.label }}
      </button>
    }

    <span class="bl-sep"></span>

    <button class="bl-btn bl-btn--primary" (click)="ouvrirModal(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvelle matière
    </button>
  </div>

  <!-- ══ TABLEAU ══ -->
  @if (filtered().length > 0) {
    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="text-align:left">Matière</th>
            <th class="bl-th">Classe</th>
            <th class="bl-th">Enseignant</th>
            <th class="bl-th bl-th--trim">Coef.</th>
            <th class="bl-th">Groupe</th>
            <th class="bl-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (m of filtered(); track m.id_matiere) {
            <tr class="bl-tr">

              <!-- Nom + avatar -->
              <td class="bl-td bl-td--name">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="bl-av"
                       [style.background]="avBg(m.id_matiere)"
                       [style.color]="avTxt(m.id_matiere)">
                    {{ abrev(m.nom_matiere) }}
                  </div>
                  <div>
                    {{ m.nom_matiere }}
                    @if (m.note_eliminatoire) {
                      <div style="font-size:10px;color:#aaa">
                        Élim. &lt; {{ m.note_eliminatoire }}
                      </div>
                    }
                  </div>
                </div>
              </td>

              <!-- Classe -->
              <td class="bl-td bl-td--center" style="font-size:11px">
                {{ nomClasse(m.id_classe) }}
              </td>

              <!-- Enseignant -->
              <td class="bl-td bl-td--center" style="font-size:11px;color:#555">
                {{ nomEnseignant(m.id_enseignant) }}
              </td>

              <!-- Coefficient -->
              <td class="bl-td bl-td--center bl-td--trim">
                <span class="bl-badge">× {{ m.coefficient }}</span>
              </td>

              <!-- Groupe -->
              <td class="bl-td bl-td--center" style="font-size:11px">
                @if (m.groupe) {
                  <span class="bl-mention bl-mention--sec">{{ m.groupe }}</span>
                } @else {
                  <span style="color:#ccc">—</span>
                }
              </td>

              <!-- Actions -->
              <td class="bl-td bl-td--center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <button class="bl-icon-btn" title="Modifier"
                          (click)="ouvrirModal(m)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </td>

            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="bl-foot">
      <span class="bl-foot-info">{{ filtered().length }} matière(s)</span>
      <span class="bl-foot-info">{{ nbSansEnseignant() }} sans enseignant assigné</span>
    </div>

  } @else {
    <div class="bl-empty">
      Aucune matière —
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
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    .bl-chip     { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                   cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                   background:white; color:#555; transition:all .12s; }
    .bl-chip--on { background:#EBF3FC; color:#185FA5;
                   border-color:#B5D4F4; font-weight:500; }

    .bl-av { width:28px; height:28px; border-radius:50%; flex-shrink:0;
             display:flex; align-items:center; justify-content:center;
             font-size:10px; font-weight:600; }

    .bl-badge { font-size:12px; font-weight:600; color:#185FA5; }

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

    .bl-mention     { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--sec { background:#EBF3FC; color:#185FA5; }

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
export class MatieresListComponent {

  private dialog = inject(MatDialog);
  private data   = inject(DataService);
  private cdr    = inject(ChangeDetectorRef);

  // ── Filtres ────────────────────────────────────────────────────
  filtreClasse = signal('Tous');
  setClasse(v: string) { this.filtreClasse.set(v); }

  optsClasse = computed<{ val: string; label: string }[]>(() => {
    const classes = this.data.getClasses() ?? [];
    const ids = new Set(
      (this.data.getMatieres() ?? []).map(m => m.id_classe).filter(Boolean)
    );
    const opts = [...ids].map(id => ({
      val:   id,
      label: classes.find(c => c.id_classe === id)?.nom_classe ?? id,
    }));
    return [{ val: 'Tous', label: 'Toutes' }, ...opts];
  });

  matieres = computed(() => this.data.getMatieres() ?? []);

  filtered = computed(() => {
    const cls = this.filtreClasse();
    return cls === 'Tous'
      ? this.matieres()
      : this.matieres().filter(m => m.id_classe === cls);
  });

  // ── Stats ──────────────────────────────────────────────────────
  totalClasses = computed(() =>
    new Set(this.filtered().map(m => m.id_classe)).size
  );
  nbSansEnseignant = computed(() =>
    this.filtered().filter(m => !m.id_enseignant).length
  );

  // ── Helpers affichage ──────────────────────────────────────────
  nomClasse(id: string): string {
    return this.data.getClasses()?.find(c => c.id_classe === id)?.nom_classe ?? id;
  }
  nomEnseignant(id: string): string {
    if (!id) return '—';
    const e = this.data.getEnseignants()?.find(x => x.id_enseignant === id);
    return e ? `${e.nom} ${e.prenom}` : '—';
  }

  // ── Modal ──────────────────────────────────────────────────────
  ouvrirModal(matiere: MatiereConfig | null): void {
    this.dialog.open(MatiereModalComponent, {
      data:     { matiere: matiere ?? undefined } satisfies MatiereModalData,
      width:    '480px',
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
  avBg(id: string):  string { return this._palette[this._hashIdx(id)].bg; }
  avTxt(id: string): string { return this._palette[this._hashIdx(id)].txt; }
}