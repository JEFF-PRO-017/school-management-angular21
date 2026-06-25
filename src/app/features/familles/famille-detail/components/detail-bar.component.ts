// detail-bar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FamilleEnrichi } from '../../../../core/models/family';

@Component({
  selector: 'app-detail-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
<div class="d-flex align-items-center flex-wrap gap-2 pb-3 border-bottom">

  <a routerLink="/familles" class="btn btn-sm btn-outline-secondary px-2">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </a>

  <div class="lh-1">
    <div class="fw-semibold">{{ famille.nom_famille }}</div>
    <div class="text-primary" style="font-size:10px">{{ resumeEnfants }}</div>
  </div>

  <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
    <button class="btn btn-sm btn-success d-flex align-items-center gap-1"
            (click)="paiement.emit()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5"
              stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="5" cy="10" r="1" fill="currentColor"/>
      </svg>
      Payer pension
    </button>

    <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            (click)="modifier.emit()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
              stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Modifier
    </button>

    <button class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            (click)="ajouterEleve.emit()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 13c0-2.5 2.5-4 6-4M13 10v4M11 12h4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      + Élève
    </button>

    <span class="text-muted" style="font-size:10px">{{ famille.id_famille }}</span>
  </div>

</div>
  `
})
export class DetailBarComponent {
  @Input({ required: true }) famille!: FamilleEnrichi;
  @Input() resumeEnfants = '';
  @Output() paiement    = new EventEmitter<void>();
  @Output() modifier    = new EventEmitter<void>();
  @Output() ajouterEleve = new EventEmitter<void>();
}