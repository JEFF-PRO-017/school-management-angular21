import {
  Component, OnInit, OnDestroy, inject, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { MapSearchComponent } from '../../../core/services/map/map-search.component';
import { MapService, TILE_KEYS, MapRef, MapMode, COLOR_BAD, COLOR_OK, NominatimResult, DEFAULT_CENTER } from '../../../core/services/map/map.service';
import { FamilleEnrichi, FamilleService } from '../../../core/models/family';

@Component({
  selector: 'app-famille-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MapSearchComponent],
  styles: [`
    :host { display:flex; flex-direction:column; height:calc(100vh - 100px); }
    #familles-map { flex:1; border-radius:8px; overflow:hidden; }
  `],
  template: `
<div class="d-flex flex-column gap-2 h-100">
  <!-- Barre principale -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <a routerLink="/familles" class="btn btn-sm btn-outline-secondary px-2">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>

    <div class="lh-1">
      <div class="fw-semibold small">Carte des familles</div>
      <div class="text-primary" style="font-size:10px">
        {{ nbAffiches() }} géolocalisées / {{ total() }} au total
      </div>
    </div>

    <div class="vr"></div>

    <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            (click)="centrerMaPosition()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M8 1v3M8 12v3M1 8h3M12 8h3"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Ma position
    </button>

    <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            (click)="toutVoir()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Tout voir
    </button>

    @if (total() - nbAffiches() > 0) {
      <span class="badge text-bg-danger rounded-pill">
        {{ total() - nbAffiches() }} sans GPS
      </span>
    }
  </div>

  <!-- Chips : fonds de carte + filtre -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">

    <span class="text-muted" style="font-size:11px">Fond</span>
    <div class="btn-group btn-group-sm">
      @for (k of tileKeys; track k) {
        <button class="btn"
                [class.btn-primary]="tuileActive() === k"
                [class.btn-outline-secondary]="tuileActive() !== k"
                (click)="changerTuile(k)">{{ k }}</button>
      }
    </div>

    <div class="vr"></div>

    <span class="text-muted" style="font-size:11px">Filtre</span>
    <button class="btn btn-sm d-flex align-items-center gap-1"
            [class.btn-warning]="filtreSolde()"
            [class.btn-outline-secondary]="!filtreSolde()"
            (click)="toggleFiltreSolde()">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M8 2l1.5 4h4l-3 2.5 1 4L8 10l-3.5 2.5 1-4L2.5 6h4z"
              stroke="currentColor" stroke-width="1.2"
              fill="none" stroke-linejoin="round"/>
      </svg>
      Solde dû seulement
    </button>
  </div>

  <!-- Recherche Nominatim -->
  <app-map-search (resultatChoisi)="onAdresseChoisie($event)" />

  <!-- Carte -->
  <div id="familles-map"></div>

  <!-- Légende -->
  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1">
    <div class="d-flex align-items-center gap-2 small text-muted">
      <span class="rounded-circle d-inline-block"
            style="width:10px;height:10px;background:#185FA5;
                   border:2px solid white;box-shadow:0 0 0 2px rgba(24,95,165,.3)"></span>
      Ma position
      <span class="rounded-circle d-inline-block ms-2"
            style="width:10px;height:10px;background:#0F6E56"></span>
      À jour
      <span class="rounded-circle d-inline-block ms-2"
            style="width:10px;height:10px;background:#993C1D"></span>
      Solde dû
    </div>
    <span class="small text-muted">{{ nbAffiches() }} marqueur(s) affiché(s)</span>
  </div>

</div>
  `
})
export class FamilleMapComponent implements OnInit, OnDestroy {

  private cache = inject(CacheService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private ms = inject(MapService);
  private fas = inject(FamilleService)


  nbAffiches = signal(0);
  total = signal(0);
  tuileActive = signal('OSM');
  filtreSolde = signal(false);
  tileKeys = TILE_KEYS;

  private ref: MapRef | null = null;
  private layerTous: any;
  private layerSolde: any;
  private userMarker: any = null;
  private allBounds: [number, number][] = [];

  ngOnInit(): void { setTimeout(() => this.initMap(), 120); }
  ngOnDestroy(): void { this.ms.detruire(this.ref); }

  private initMap(): void {
    const familles = this.cache.getFamilles() ?? [];
    this.total.set(familles.length);

    this.ref = this.ms.creerCarte('familles-map', MapMode.INTERACTIVE, DEFAULT_CENTER, 15, 'OSM');
    this.layerTous = this.ms.creerLayerGroup(this.ref, true);
    this.layerSolde = this.ms.creerLayerGroup(this.ref, true);

    familles.forEach((f: FamilleEnrichi) => {
      if (!f.latitude || !f.longitude) return;

      const lat = this.toNum(f.latitude);
      const lng = this.toNum(f.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

       const latLng: [number, number] = [lat, lng];
      console.log('latLng', latLng)
      this.allBounds.push(latLng);

      const totalVerse = this.fas.verse(f.paiements ?? [])
      const anneesvc = this.fas.anneeSvcEncours(f.annee_scolaires);
      const attendu = this.fas.attentu(anneesvc)
      const aDette = attendu > 0 && totalVerse < attendu;

      const popup = this.ms.buildPopupFamille(f, totalVerse, attendu);
      const marker = this.ms.creerMarqueurFamille(
        this.ref!, latLng, aDette ? COLOR_BAD : COLOR_OK, popup
      );
      console.log('marker', marker)
      marker.on('popupopen', () => {
        this.ms.attacherBoutonPopup(f.id_famille, () => {
          this.ref!.map.closePopup();
          this.router.navigate([`/familles/${f.id_famille }`]);
        });
      });

      this.layerTous.addLayer(marker);
      if (aDette) this.layerSolde.addLayer(marker);
    });

    this.nbAffiches.set(this.allBounds.length);
    this.layerTous.addTo(this.ref.map);
    this.ms.voirTout(this.ref, this.allBounds);
    this.centrerMaPosition(false);
  }
  private toNum(v: any): number {
    return parseFloat(String(v).replace(',', '.'));
  }

  changerTuile(key: string): void {
    if (!this.ref) return;
    this.tuileActive.set(key);
    this.ms.changerTuile(this.ref, key);
  }

  toggleFiltreSolde(): void {
    if (!this.ref) return;
    this.filtreSolde.update(v => !v);
    this.ms.basculerGroupe(
      this.ref,
      this.filtreSolde() ? this.layerSolde : this.layerTous,
      this.filtreSolde() ? this.layerTous : this.layerSolde,
    );
  }

  centrerMaPosition(notifierEchec = true): void {
    if (!this.ref) return;
    this.ms.obtenirPosition().then(([lat, lng]) => {
      if (this.userMarker) this.ms.supprimerMarqueur(this.ref!, this.userMarker);
      this.userMarker = this.ms.creerMarqueurPosition(this.ref!, [lat, lng]);
      this.ms.centrer(this.ref!, [lat, lng], 15);
    }).catch(() => {
      if (notifierEchec) this.snack.open('Position GPS indisponible', 'OK', { duration: 3000 });
    });
  }

  toutVoir(): void { this.ms.voirTout(this.ref!, this.allBounds); }

  onAdresseChoisie(r: NominatimResult): void {
    if (!this.ref) return;
    this.ms.centrer(this.ref, [parseFloat(r.lat), parseFloat(r.lon)], 16);
  }
}