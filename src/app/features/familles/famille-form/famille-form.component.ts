// famille-form.component.ts
// Champs identité de la famille + bouton GPS → ouvre overlay carte

import {
  Component, Input, Output, EventEmitter, signal
} from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FamilleMapOverlayComponent, PositionGPS } from './famille-map-overlay.component';

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
           placeholder="Famille Ateba Paul"
           [class.is-invalid]="fc['nom_famille'].invalid && fc['nom_famille'].touched">
    <div class="invalid-feedback">Champ requis</div>
  </div>

  <!-- Téléphones -->
  <div class="row g-2">
    <div class="col-6">
      <label class="form-label small mb-1">Tél. mère *</label>
      <input class="form-control form-control-sm"
             formControlName="tel_mere"
             type="tel" placeholder="699 …"
             [class.is-invalid]="fc['tel_pere'].invalid && fc['tel_pere'].touched">
      <div class="invalid-feedback">Requis</div>
    </div>
    <div class="col-6">
      <label class="form-label small mb-1">Tél. père</label>
      <input class="form-control form-control-sm"
             formControlName="tel_pere"
             type="tel" placeholder="677 …">
    </div>
    <div class="col-6">
      <label class="form-label small mb-1">Autre tél.</label>
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
        <span class="text-success">
          📍 {{ lat()!.toFixed(5) }}, {{ lng()!.toFixed(5) }}
        </span>
        <span class="text-danger ms-2" style="cursor:pointer"
              (click)="effacerGPS()">Effacer</span>
      } @else {
        <span>GPS non défini</span>
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