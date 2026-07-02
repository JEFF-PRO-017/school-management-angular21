// famille-form.component.ts
// Champs identité de la famille + bouton GPS → ouvre overlay carte
// Validation gérée via Angular Validators + FormControl.hasError() (pas de HTML statique)

import {
  Component, Input, Output, EventEmitter, signal
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FamilleMapOverlayComponent, PositionGPS } from './famille-map-overlay.component';

/** Regex numéro camerounais : 9 chiffres commençant par 6 */
export const TEL_PATTERN = /^6\d{8}$/;

@Component({
  selector: 'app-famille-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FamilleMapOverlayComponent],
  template: `
<div [formGroup]="form" class="d-flex flex-column gap-3">

  <!-- Nom -->
  <div>
    <label class="form-label small mb-1">Nom de la famille *</label>
    <input class="form-control form-control-sm"
           formControlName="nom_famille"
           placeholder="Ex : Famille Ateba Paul"
           [class.is-invalid]="isInvalid('nom_famille')">
    @if (isInvalid('nom_famille')) {
      <div class="invalid-feedback">{{ getError('nom_famille') }}</div>
    }
  </div>

  <!-- Téléphones -->
  <div class="row g-2">
    <div class="col-6">
      <label class="form-label small mb-1">Tél. mère *</label>
      <input class="form-control form-control-sm"
             formControlName="tel_mere"
             type="tel" placeholder="6XX XX XX XX"
             [class.is-invalid]="isInvalid('tel_mere')">
      @if (isInvalid('tel_mere')) {
        <div class="invalid-feedback">{{ getError('tel_mere') }}</div>
      }
    </div>
    <div class="col-6">
      <label class="form-label small mb-1">Tél. père</label>
      <input class="form-control form-control-sm"
             formControlName="tel_pere"
             type="tel" placeholder="6XX XX XX XX"
             [class.is-invalid]="isInvalid('tel_pere')">
      @if (isInvalid('tel_pere')) {
        <div class="invalid-feedback">{{ getError('tel_pere') }}</div>
      }
    </div>
    <div class="col-6">
      <label class="form-label small mb-1">Tél. secondaire</label>
      <input class="form-control form-control-sm"
             formControlName="tel_autre"
             type="tel" placeholder="Optionnel">
    </div>
    <div class="col-6">
      <label class="form-label small mb-1">Adresse</label>
      <input class="form-control form-control-sm"
             formControlName="adresse_texte"
             placeholder="Quartier, rue…">
    </div>
  </div>

  <!-- GPS -->
  <div class="d-flex align-items-center justify-content-between">
    <span class="small text-muted">
      @if (lat() && lng()) {
        <span class="text-success" [title]="lat()!.toFixed(5) + ', ' + lng()!.toFixed(5)">
          📍 Position enregistrée
        </span>
        <span class="text-danger ms-2" style="cursor:pointer"
              (click)="effacerGPS()">Effacer</span>
      } @else {
        <span>Aucune position enregistrée</span>
      }
    </span>
    <button type="button" class="btn btn-sm btn-outline-primary"
            (click)="ouvrirCarte()">
      🗺 Localiser sur la carte
    </button>
  </div>

</div>

<!-- Overlay carte plein écran (monté dans le DOM courant, au-dessus du modal) -->
@if (carteOuverte()) {
  <app-famille-map-overlay
    [latInit]="lat() ?? undefined"
    [lngInit]="lng() ?? undefined"
    (positionChoisie)="onPositionChoisie($event)"
    (fermeture)="fermerCarte()">
  </app-famille-map-overlay>
}
  `
})
export class FamilleFormComponent {

  @Input({ required: true }) form!: FormGroup;

  // Signals GPS exposées au parent via Output
  @Output() gpsChange = new EventEmitter<{ lat: number | null; lng: number | null }>();

  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  carteOuverte = signal(false);

  get fc() { return this.form.controls; }

  /** Applique les validators requis sur ce sous-formulaire (appelé par le parent à l'init) */
  static buildValidators() {
    return {
      nom_famille: [Validators.required, Validators.minLength(2)],
      tel_mere: [Validators.required, Validators.pattern(TEL_PATTERN)],
      tel_pere: [Validators.pattern(TEL_PATTERN)],
    };
  }

  /** true si le contrôle est invalide ET a été touché/modifié — utilise l'état natif du FormControl */
  isInvalid(controlName: string): boolean {
    const control = this.fc[controlName as keyof typeof this.fc];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /** Message d'erreur dérivé directement des erreurs du FormControl (control.errors) */
  getError(controlName: string): string {
    const control = this.fc[controlName as keyof typeof this.fc];
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return controlName === 'nom_famille'
        ? 'Indiquez le nom de la famille'
        : 'Un numéro de contact est nécessaire';
    }
    if (control.errors['minlength']) {
      return 'Le nom est trop court';
    }
    if (control.errors['pattern']) {
      return 'Numéro invalide (ex : 6XX XX XX XX)';
    }
    return 'Champ invalide';
  }

  /** Initialise les coordonnées depuis le parent (mode édition) */
  setGPS(lat: number | null, lng: number | null): void {
    this.lat.set(lat);
    this.lng.set(lng);
  }

  ouvrirCarte(): void  { this.carteOuverte.set(true); }
  fermerCarte(): void  { this.carteOuverte.set(false); }

  onPositionChoisie(pos: PositionGPS): void {
    this.lat.set(pos.lat);
    this.lng.set(pos.lng);
    this.form.patchValue({ adresse_texte: this.form.value.adresse_texte || '' });
    this.carteOuverte.set(false);
    this.gpsChange.emit({ lat: pos.lat, lng: pos.lng });
  }

  effacerGPS(): void {
    this.lat.set(null);
    this.lng.set(null);
    this.gpsChange.emit({ lat: null, lng: null });
  }
}