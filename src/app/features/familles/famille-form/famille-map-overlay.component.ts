// famille-map-overlay.component.ts
// Carte Leaflet plein écran — s'ouvre depuis le modal famille
// Émet (positionChoisie) avec {lat, lng} ou ferme sans émettre

import {
  Component, Output, EventEmitter, inject,
  AfterViewInit, OnDestroy, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapSearchComponent } from '../../../core/services/map/map-search.component';
import { MapService, MapRef, TILE_KEYS, MapMode, NominatimResult } from '../../../core/services/map/map.service';


export interface PositionGPS { lat: number; lng: number; }

@Component({
  selector: 'app-famille-map-overlay',
  standalone: true,
  imports: [CommonModule, MapSearchComponent],
  template: `
<!-- Fond plein écran -->
<div class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex flex-column"
     style="z-index:1060">

  <!-- Barre supérieure -->
  <div class="d-flex align-items-center gap-2 px-3 py-2 bg-white shadow-sm">

    <!-- Bouton retour -->
    <button class="btn btn-sm btn-outline-secondary" (click)="fermer()">
      ← Retour
    </button>

    <!-- Recherche Nominatim -->
    <div class="flex-grow-1">
      <app-map-search (resultatChoisi)="onAdresseChoisie($event)" />
    </div>

    <!-- Sélecteur de tuiles -->
    <div class="btn-group btn-group-sm">
      @for (tk of tileKeys; track tk) {
        <button type="button"
                class="btn"
                [class.btn-primary]="tuileCourante === tk"
                [class.btn-outline-secondary]="tuileCourante !== tk"
                (click)="changerTuile(tk)">
          {{ tk }}
        </button>
      }
    </div>

    <!-- Valider -->
    <button class="btn btn-sm btn-success" [disabled]="!lat || !lng"
            (click)="valider()">
      ✔ Confirmer
    </button>
  </div>

  <!-- Carte -->
  <div id="overlay-map" class="flex-grow-1"></div>

  <!-- Coordonnées -->
  <div class="bg-white px-3 py-1 d-flex justify-content-between small">
    @if (lat && lng) {
      <span class="text-success">{{ lat.toFixed(5) }}, {{ lng.toFixed(5) }}</span>
      <span class="text-danger" style="cursor:pointer" (click)="effacer()">
        Effacer la position
      </span>
    } @else {
      <span class="text-muted">Cliquez sur la carte ou recherchez une adresse</span>
    }
  </div>

</div>
  `
})
export class FamilleMapOverlayComponent implements AfterViewInit, OnDestroy {

  @Input() latInit?: number;
  @Input() lngInit?: number;

  @Output() positionChoisie = new EventEmitter<PositionGPS>();
  @Output() fermeture       = new EventEmitter<void>();

  private ms = inject(MapService);
  private ref: MapRef | null = null;
  private marker: any = null;

  tileKeys      = TILE_KEYS;
  tuileCourante = 'OSM';
  lat: number | null = null;
  lng: number | null = null;

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  private initMap(): void {
    const lat0 = this.latInit ?? 3.848;
    const lng0 = this.lngInit ?? 11.502;

    this.ref = this.ms.creerCarte('overlay-map', MapMode.FORM,
      [lat0, lng0], 14, this.tuileCourante);

    this.marker = this.ms.creerMarqueurFormulaire(
      this.ref,
      [lat0, lng0],
      (lat, lng) => { this.lat = lat; this.lng = lng; }
    );

    if (!this.latInit) {
      this.ms.obtenirPosition(5000)
        .then(([lat, lng]) => {
          this.ms.centrer(this.ref!, [lat, lng], 15);
          this.ms.deplacerMarqueur(this.marker, [lat, lng]);
          this.lat = lat;
          this.lng = lng;
        })
        .catch(() => {});
    } else {
      this.lat = lat0;
      this.lng = lng0;
    }
  }

  changerTuile(key: string): void {
    this.tuileCourante = key;
    if (this.ref) this.ms.changerTuile(this.ref, key);
  }

  onAdresseChoisie(r: NominatimResult): void {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    this.lat = lat;
    this.lng = lng;
    if (this.ref) {
      this.ms.centrer(this.ref, [lat, lng], 16);
      this.ms.deplacerMarqueur(this.marker, [lat, lng]);
    }
  }

  effacer(): void {
    this.lat = null;
    this.lng = null;
    if (this.ref && this.marker) {
      this.ms.supprimerMarqueur(this.ref, this.marker);
      this.marker = null;
    }
  }

  valider(): void {
    if (this.lat && this.lng)
      this.positionChoisie.emit({ lat: this.lat, lng: this.lng });
  }

  fermer(): void {
    this.fermeture.emit();
  }

  ngOnDestroy(): void {
    this.ms.detruire(this.ref);
  }
}