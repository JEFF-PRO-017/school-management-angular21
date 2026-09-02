// detail-stats.component.ts
import { Component, inject, Input } from '@angular/core';
import { FamilleEnrichi, FamilleService } from '../../../../../core/models';

@Component({
  selector: 'app-detail-stats',
  standalone: true,
  template: `
<div class="card border-0 shadow-sm h-100">
  @if(f){
  <div class="card-header bg-light d-flex align-items-center justify-content-between py-2">
    <span class="small fw-semibold text-secondary">Pension — {{ annee }}</span>
    <span class="badge rounded-pill"
          [class.bg-success]="progression >= 100"
          [class.bg-warning]="progression >= 50 && progression < 100"
          [class.bg-danger]="progression < 50">
      {{ progression }}% réglé
    </span>
  </div>
  <div class="card-body pb-2">

    <!-- 3 stats -->
    <div class="row g-2 mb-3">
      <div class="col-4">
        <div class="bg-light rounded-2 p-2 text-center">
          <div class="fw-semibold">{{ fmt(attendu) }}</div>
          <div class="text-muted" style="font-size:9px">Attendu (FCFA)</div>
        </div>
      </div>
      <div class="col-4">
        <div class="bg-light rounded-2 p-2 text-center">
          <div class="fw-semibold text-success">{{ fmt(verse) }}</div>
          <div class="text-muted" style="font-size:9px">Versé</div>
        </div>
      </div>
      <div class="col-4">
        <div class="bg-light rounded-2 p-2 text-center">
          <div class="fw-semibold" [class.text-success]="restant === 0"
               [class.text-danger]="restant > 0">{{ fmt(restant) }}</div>
          <div class="text-muted" style="font-size:9px">Restant</div>
        </div>
      </div>
      <div class="col-4">
        <div class="bg-light rounded-2 p-2 text-center">
          <div class="fw-semibold">{{ fmt(reductionSpecial) }}</div>
          <div class="text-muted" style="font-size:9px">Réduction Spéciale</div>
        </div>
      </div>
      <div class="col-4">
        <div class="bg-light rounded-2 p-2 text-center">
          <div class="fw-semibold">{{ fmt(reductionPourcentage) }}%</div>
          <div class="text-muted" style="font-size:9px">Réduction %</div>
        </div>
      </div>
    </div>

    <!-- Barre progression -->
    <div class="progress mb-1" style="height:5px">
      <div class="progress-bar"
           [class.bg-success]="restant === 0"
           [class.bg-warning]="restant > 0"
           [style.width.%]="progression">
      </div>
    </div>
    <div class="d-flex justify-content-between text-muted mb-2" style="font-size:9px">
      <span>{{ fmt(verse) }} versés</span>
      <span>{{ fmt(attendu) }} attendus</span>
    </div>

    <!-- Prochain RDV -->
    @if (prochainRdv) {
      <div class="alert alert-warning d-flex align-items-center gap-2 py-1 px-2 mb-0 small">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="11" rx="2"
                stroke="currentColor" stroke-width="1.3"/>
          <path d="M5 1v3M11 1v3M2 7h12"
                stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        Prochain RDV : <strong>{{ prochainRdv }}</strong>
      </div>
    }

  </div>} @else {
    <div class="card-body text-center text-muted py-4 small">Famille introuvable</div>
  } 
</div>
  `
})
export class DetailStatsComponent {
  @Input() annee = '';
  @Input() f: FamilleEnrichi | null = null;

  private fas = inject(FamilleService);
  get prochainRdv(): string | null { return this.fas.dernierRdvFamille(this.f) }
  get attendu(): number { return this.fas.montantAttentu(this.f) }
  get verse(): number { return this.fas.montantVerse(this.f) }
  get restant(): number { return this.fas.montantRestant(this.attendu, this.verse) }
  get progression(): number {
    if (this.attendu <= 0) return 100;
    return Math.min(100, Math.round((this.verse / this.attendu) * 100));
  }
  get reductionSpecial(): number { return this.fas.anneeSvcEncours(this.f)?.montant_reduction_special ?? 0; }
  get reductionPourcentage(): number { return this.fas.anneeSvcEncours(this.f)?.montant_reduction ?? 0; }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(+n));
  }
}