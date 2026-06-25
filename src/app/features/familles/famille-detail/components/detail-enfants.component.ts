// detail-enfants.component.ts
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Eleve } from '../../../../core/models/academic';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-detail-enfants',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
<div class="card border-0 shadow-sm">
  <div class="card-header bg-light d-flex align-items-center justify-content-between py-2">
    <span class="small fw-semibold text-secondary">Enfants ({{ enfants.length }})</span>
    <button class="btn btn-sm btn-primary" (click)="ajouter.emit()">+ Ajouter</button>
  </div>

  @if (enfants.length === 0) {
    <div class="text-center text-muted py-4 small">Aucun enfant enregistré</div>
  } @else {
    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Élève</th>
            <th class="text-center">Classe</th>
            <th class="text-center">Sexe</th>
            <th class="text-center">Naissance</th>
            <th class="text-center">Statut</th>
            <th class="text-center table-primary">Solde pension</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (e of page(); track e.id_eleve) {
            <tr>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="rounded-circle d-flex align-items-center
                               justify-content-center fw-semibold flex-shrink-0"
                       style="width:30px;height:30px;font-size:10px"
                       [style.background]="avBg(e.id_eleve)"
                       [style.color]="avTxt(e.id_eleve)">
                    {{ initiales(e.nom, e.prenom) }}
                  </div>
                  <div>
                    <div>{{ e.nom }} {{ e.prenom }}</div>
                    <div class="text-muted" style="font-size:10px">{{ e.id_eleve }}</div>
                  </div>
                </div>
              </td>
              <td class="text-center">
                <span class="badge text-bg-primary">{{ nomClasse(e.id_classe) }}</span>
              </td>
              <td class="text-center text-muted small">{{ e.sexe || '—' }}</td>
              <td class="text-center text-muted small">{{ fmtDate(e.date_naissance ?? '') }}</td>
              <td class="text-center">
                <span class="badge"
                      [class.text-bg-success]="e.statut === 'ACTIF'"
                      [class.text-bg-secondary]="e.statut !== 'ACTIF'">
                  {{ e.statut }}
                </span>
              </td>
              <td class="text-center table-primary">
                <span class="badge"
                      [class.text-bg-success]="solde(e.id_eleve) === 0"
                      [class.text-bg-warning]="solde(e.id_eleve) > 0">
                  {{ soldeLabel(e.id_eleve) }}
                </span>
              </td>
              <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                  <button class="btn btn-sm btn-outline-secondary p-0"
                          style="width:26px;height:26px" title="Modifier"
                          (click)="modifier.emit(e)">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                            stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="btn btn-sm btn-outline-danger p-0"
                          style="width:26px;height:26px" title="Archiver"
                          (click)="archiver.emit(e)">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="3" rx="1"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M6 9h4" stroke="currentColor"
                            stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="px-3 pb-2">
      <app-pagination
        [total]="enfants.length"
        [pageSize]="5"
        (pageChange)="onPage($event)">
      </app-pagination>
    </div>
  }
</div>
  `
})
export class DetailEnfantsComponent {
  @Input({ required: true }) enfants: Eleve[] = [];
  @Input() soldes: Map<string, number> = new Map();
  @Input() classesMap: Map<string, string> = new Map();

  @Output() ajouter  = new EventEmitter<void>();
  @Output() modifier = new EventEmitter<Eleve>();
  @Output() archiver = new EventEmitter<Eleve>();

  private debut = signal(0);
  private fin   = signal(5);

  page = computed(() => this.enfants.slice(this.debut(), this.fin()));

  onPage(e: { debut: number; fin: number }): void {
    this.debut.set(e.debut);
    this.fin.set(e.fin);
  }

  solde(id: string): number    { return this.soldes.get(id) ?? 0; }
  soldeLabel(id: string): string {
    const r = this.solde(id);
    return r <= 0 ? 'Soldé ✓' : `${new Intl.NumberFormat('fr-FR').format(r)} F`;
  }
  nomClasse(id: string): string { return this.classesMap.get(id) ?? id; }

  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }

  private palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' }, { bg: '#E0F2F1', txt: '#00695C' },
  ];
  private hash(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }
  avBg(id: string):  string { return this.palette[this.hash(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hash(id)].txt; }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }
}