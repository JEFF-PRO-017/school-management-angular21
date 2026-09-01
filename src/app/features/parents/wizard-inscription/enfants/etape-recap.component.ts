// etape-recap.component.ts
// Étape 4 : relecture des informations saisies avant envoi.
// Reçoit uniquement des valeurs déjà calculées (aucune logique carte/formulaire ici).
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

export interface EnfantRecap {
  nom: string;
  prenom: string;
  sexe: string;
  id_classe: string;
}

@Component({
  selector: 'app-etape-recap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card m-3 shadow-sm rounded-4 p-3">
      <h2 class="h6 fw-bold mb-0">✅ Récapitulatif</h2>
      <p class="text-muted small mb-3">Vérifiez vos informations avant de soumettre</p>

      <div class="small fw-bold text-muted text-uppercase mt-2 mb-1">Coordonnées</div>
      <div class="d-flex justify-content-between border-bottom py-2 small">
        <span class="text-secondary">Tél. père</span>
        <span class="fw-semibold">{{ telPere }}</span>
      </div>
      @if (telMere) {
        <div class="d-flex justify-content-between border-bottom py-2 small">
          <span class="text-secondary">Tél. mère</span>
          <span class="fw-semibold">{{ telMere }}</span>
        </div>
      }

      <div class="small fw-bold text-muted text-uppercase mt-3 mb-1">Famille</div>
      <div class="d-flex justify-content-between border-bottom py-2 small">
        <span class="text-secondary">Nom</span>
        <span class="fw-semibold">{{ nomFamille }}</span>
      </div>
      @if (adresseTexte) {
        <div class="d-flex justify-content-between border-bottom py-2 small">
          <span class="text-secondary">Adresse</span>
          <span class="fw-semibold">{{ adresseTexte }}</span>
        </div>
      }
      @if (lat !== null) {
        <div class="d-flex justify-content-between border-bottom py-2 small">
          <span class="text-secondary">GPS</span>
          <span class="fw-semibold">{{ lat.toFixed(4) }}, {{ lng!.toFixed(4) }}</span>
        </div>
      }

      <div class="small fw-bold text-muted text-uppercase mt-3 mb-1">Enfants ({{ enfants.length }})</div>
      @for (e of enfants; track $index) {
        <div class="border-bottom py-2 d-flex flex-column">
          <span class="fw-semibold small">{{ e.nom }} {{ e.prenom }}</span>
          <span class="text-muted" style="font-size:11px">
            {{ nomClasse(e.id_classe) }}
            @if (e.sexe) { · {{ e.sexe === 'M' ? 'Masculin' : 'Féminin' }} }
          </span>
        </div>
      }

      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary" style="width:50px" (click)="precedent.emit()">←</button>
        <button class="btn btn-primary flex-fill" (click)="soumettre.emit()" [disabled]="envoi">
          @if (envoi) {
            <span class="spinner-border spinner-border-sm me-2"></span> Envoi en cours…
          } @else {
            Confirmer l'inscription
          }
        </button>
      </div>
    </div>
  `,
})
export class EtapeRecapComponent {
  @Input() telPere = '';
  @Input() telMere = '';
  @Input() nomFamille = '';
  @Input() adresseTexte = '';
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() enfants: EnfantRecap[] = [];
  // Fonction fournie par le parent pour résoudre id_classe → nom lisible
  @Input() nomClasse: (id: string) => string = (id) => id;

  @Input() envoi = false;

  @Output() precedent = new EventEmitter<void>();
  @Output() soumettre = new EventEmitter<void>();
}