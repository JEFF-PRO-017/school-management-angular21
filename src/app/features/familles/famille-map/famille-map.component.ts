// famille-map.component.ts — carte globale de toutes les familles
// Affiche un marqueur par famille avec popup (nom + téléphones)
import {
  Component, OnInit, OnDestroy, inject, signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CacheService } from '../../../core/services/cache.service';
import { Famille } from '../../../core/models';

declare const L: any;

@Component({
  selector: 'app-famille-map',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatBadgeModule],
  template: `
    <div class="container-fluid px-0 d-flex flex-column" style="height:calc(100vh - 120px)">

      <!-- Barre -->
      <div class="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
        <div class="d-flex align-items-center gap-2">
          <a routerLink="/familles" mat-icon-button>
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h5 class="fw-bold text-primary mb-0">Carte des familles</h5>
        </div>
        <span class="badge bg-primary">{{ nbAffiches() }} / {{ total() }} familles</span>
      </div>

      <!-- Carte plein écran -->
      <div id="familles-map" class="rounded shadow-sm flex-grow-1"></div>

      <!-- Légende -->
      <div class="mt-2 text-muted small text-center flex-shrink-0">
        <mat-icon class="text-success" style="font-size:14px;vertical-align:middle">
          location_on
        </mat-icon>
        Familles géolocalisées ·
        <mat-icon class="text-warning" style="font-size:14px;vertical-align:middle">
          location_off
        </mat-icon>
        Position non définie (non affichées)
      </div>

    </div>
  `
})
export class FamilleMapComponent implements OnInit, OnDestroy {

  private cache = inject(CacheService);
  private map: any;

  nbAffiches = signal(0);
  total      = signal(0);

  ngOnInit(): void {
    // Initialise la carte après le premier rendu
    setTimeout(() => this.initMap(), 100);
  }

  private initMap(): void {
    const familles = this.cache.getFamilles() ?? [];
    this.total.set(familles.length);

    // Centrage par défaut : Yaoundé
    this.map = L.map('familles-map').setView([3.848, 11.502], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 23,
    }).addTo(this.map);

    // Icône personnalisée verte
    const greenIcon = L.icon({
      iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      iconSize:   [25, 41],
      iconAnchor: [12, 41],
      popupAnchor:[1, -34],
    });

    let count = 0;
    const bounds: [number, number][] = [];

    familles.forEach((f: Famille) => {
      if (!f.latitude || !f.longitude) return;
      count++;
      bounds.push([f.latitude, f.longitude]);

      // Popup avec infos famille
      const popup = `
        <div style="min-width:180px">
          <div class="fw-bold">${f.nom_famille}</div>
          <div class="text-muted small">
            Père : ${f.tel_pere || '—'}<br>
            Mère : ${f.tel_mere || '—'}
          </div>
          ${f.adresse_texte ? `<div class="small mt-1">${f.adresse_texte}</div>` : ''}
        </div>
      `;

      L.marker([f.latitude, f.longitude], { icon: greenIcon })
        .addTo(this.map)
        .bindPopup(popup);
    });

    this.nbAffiches.set(count);

    // Ajuste le zoom pour voir tous les marqueurs
    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}
