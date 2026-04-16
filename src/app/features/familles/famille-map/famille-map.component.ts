// ─────────────────────────────────────────────────────────────────
// famille-map.component.ts
// Carte globale familles — template bulletins (bl-*)
// ─────────────────────────────────────────────────────────────────
import {
  Component, OnInit, OnDestroy, inject, signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar }        from '@angular/material/snack-bar';
import { CacheService }       from '../../../core/services/cache.service';
import { Famille }            from '../../../core/models';

declare const L: any;

const TILES: Record<string, { url: string; attr: string; maxZ: number }> = {
  'OSM Standard': {
    url:  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© OpenStreetMap contributors', maxZ: 19,
  },
  'Satellite': {
    url:  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '© Esri — DigitalGlobe', maxZ: 19,
  },
  'Topographique': {
    url:  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '© OpenTopoMap (CC-BY-SA)', maxZ: 17,
  },
  'Sombre': {
    url:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '© OpenStreetMap contributors © CARTO', maxZ: 19,
  },
};

@Component({
  selector: 'app-famille-map',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    /* ── Reprend exactement bl-host / bl-bar / bl-btn de bulletins ── */
    .bl-host { display:flex; flex-direction:column; gap:12px;
               font-size:13px; height:calc(100vh - 100px); }
    .bl-bar  { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
               padding-bottom:12px;
               border-bottom:0.5px solid rgba(0,0,0,.09);
               flex-shrink:0; }
    .bl-sep  { width:0.5px; height:20px; background:rgba(0,0,0,.1); }

    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px;
              font-size:13px; cursor:pointer;
              display:inline-flex; align-items:center; gap:5px;
              text-decoration:none; white-space:nowrap;
              transition:opacity .1s; }
    .bl-btn--outline { background:white; color:#333;
                       border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    /* Chips tuile / filtre — identiques à bl-chip dans familles-list */
    .bl-chip { height:26px; padding:0 10px; border-radius:6px;
               font-size:11px; cursor:pointer;
               border:0.5px solid rgba(0,0,0,.18);
               background:white; color:#555; transition:all .12s; }
    .bl-chip.on { background:#EBF3FC; color:#185FA5;
                  border-color:#B5D4F4; font-weight:500; }
    .bl-chip.warn.on { background:#FAEEDA; color:#633806;
                       border-color:#F5C4B3; }

    /* Barre chips — identique à bl-chips-bar */
    .bl-chips-bar { display:flex; align-items:center;
                    flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06);
                    flex-shrink:0; }
    .bl-chips-lbl { font-size:11px; color:#aaa; }

    /* Pied — identique à bl-foot */
    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px;
                    flex-shrink:0; }
    .bl-foot-info { font-size:11px; color:#aaa;
                    display:flex; align-items:center; gap:6px; }

    /* Carte */
    #familles-map { flex:1; border-radius:8px; overflow:hidden;
                    border:0.5px solid rgba(0,0,0,.09); }
  `],
  template: `
<div class="bl-host">

  <!-- ══ BARRE PRINCIPALE ══ -->
  <div class="bl-bar">

    <!-- Retour + titre + badge compteur -->
    <a routerLink="/familles" class="bl-btn bl-btn--outline" style="padding:0 10px">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>

    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Carte des familles</span>
      <span class="bl-cfg-seqs">
        {{ nbAffiches() }} géolocalisées / {{ total() }} au total
      </span>
    </div>

    <span class="bl-sep"></span>

    <!-- Bouton Ma position -->
    <button class="bl-btn bl-btn--outline" (click)="centrerMaPosition()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M8 1v3M8 12v3M1 8h3M12 8h3"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Ma position
    </button>

    <!-- Bouton Tout voir -->
    <button class="bl-btn bl-btn--outline" (click)="toutVoir()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Tout voir
    </button>

    <span class="bl-sep"></span>

    <!-- Compteur familles sans GPS -->
    @if (total() - nbAffiches() > 0) {
      <span style="font-size:11px;background:#FCEBEB;color:#791F1F;
                   padding:2px 8px;border-radius:99px">
        {{ total() - nbAffiches() }} sans GPS
      </span>
    }
  </div>

  <!-- ══ BARRE CHIPS : tuiles + filtres ══ -->
  <div class="bl-chips-bar">

    <span class="bl-chips-lbl">Fond</span>
    @for (k of tileKeys; track k) {
      <button class="bl-chip" [class.on]="tuileActive() === k"
              (click)="changerTuile(k)">{{ k }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Filtre</span>
    <button class="bl-chip warn" [class.on]="filtreSolde()"
            (click)="toggleFiltreSolde()">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
           style="vertical-align:middle;margin-right:3px">
        <path d="M8 2l1.5 4h4l-3 2.5 1 4L8 10l-3.5 2.5 1-4L2.5 6h4z"
              stroke="currentColor" stroke-width="1.2"
              fill="none" stroke-linejoin="round"/>
      </svg>
      Solde dû seulement
    </button>
  </div>

  <!-- ══ CARTE LEAFLET ══ -->
  <div id="familles-map"></div>

  <!-- ══ LÉGENDE — style bl-foot ══ -->
  <div class="bl-foot">
    <div class="bl-foot-info">
      <span style="width:10px;height:10px;background:#185FA5;border-radius:50%;
                   border:2px solid white;
                   box-shadow:0 0 0 2px rgba(24,95,165,.3);
                   display:inline-block"></span>
      Ma position
      <span style="width:10px;height:10px;background:#0F6E56;
                   border-radius:50%;display:inline-block;margin-left:8px"></span>
      À jour
      <span style="width:10px;height:10px;background:#993C1D;
                   border-radius:50%;display:inline-block;margin-left:8px"></span>
      Solde dû
    </div>
    <span class="bl-foot-info">
      {{ nbAffiches() }} marqueur(s) affiché(s)
    </span>
  </div>
</div>
  `
})
export class FamilleMapComponent implements OnInit, OnDestroy {

  private cache  = inject(CacheService);
  private router = inject(Router);
  private snack  = inject(MatSnackBar);

  nbAffiches  = signal(0);
  total       = signal(0);
  tuileActive = signal('OSM Standard');
  filtreSolde = signal(false);
  tileKeys    = Object.keys(TILES);

  private map:        any;
  private tileLayer:  any;
  private layerTous:  any;
  private layerSolde: any;
  private userMarker: any;
  private allBounds:  [number, number][] = [];

  ngOnInit(): void { setTimeout(() => this.initMap(), 120); }

  private initMap(): void {
    const familles = this.cache.getFamilles() ?? [];
    this.total.set(familles.length);

    this.map = L.map('familles-map', { zoomControl: true })
                .setView([3.848, 11.502], 13);

    const cfg = TILES['OSM Standard'];
    this.tileLayer = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZ })
                      .addTo(this.map);

    this.layerTous  = L.layerGroup();
    this.layerSolde = L.layerGroup();

    let count = 0;
    familles.forEach((f: Famille) => {
      if (!f.latitude || !f.longitude) return;
      count++;
      this.allBounds.push([f.latitude, f.longitude]);

      const paiements  = this.cache.getPaiements?.() ?? [];
      const totalVerse = paiements
        .filter(p => p.id_famille === f.id_famille)
        .reduce((s, p) => s + p.montant_verse, 0);
      const attendu = (f?.montant_total_attendu ?? 0)
                    - (f?.montant_reduction ?? 0);
      const aDette  = attendu > 0 && totalVerse < attendu;

      // Couleur marqueur : vert (#0F6E56) si à jour, orange-rouge (#993C1D) si dette
      const marker = L.marker([f.latitude, f.longitude], {
        icon: this.creerIcone(aDette ? '#993C1D' : '#0F6E56')
      }).bindPopup(this.buildPopup(f, totalVerse, attendu), { maxWidth: 210 });

      marker.on('popupopen', () => {
        setTimeout(() => {
          document.getElementById(`btn-fiche-${f.id_famille}`)
            ?.addEventListener('click', () => {
              this.map.closePopup();
              this.router.navigate(['/familles'],
                { queryParams: { selected: f.id_famille } });
            });
        }, 60);
      });

      this.layerTous.addLayer(marker);
      if (aDette) this.layerSolde.addLayer(marker);
    });

    this.nbAffiches.set(count);
    this.layerTous.addTo(this.map);
    if (this.allBounds.length > 0) {
      this.map.fitBounds(this.allBounds, { padding: [40, 40] });
    }
    this.centrerMaPosition(false);
  }

  changerTuile(key: string): void {
    this.tuileActive.set(key);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    const cfg = TILES[key];
    this.tileLayer = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: cfg.maxZ })
                      .addTo(this.map);
  }

  toggleFiltreSolde(): void {
    this.filtreSolde.update(v => !v);
    if (this.filtreSolde()) {
      this.map.removeLayer(this.layerTous);
      this.layerSolde.addTo(this.map);
    } else {
      this.map.removeLayer(this.layerSolde);
      this.layerTous.addTo(this.map);
    }
  }

  centrerMaPosition(notifierEchec = true): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.map.setView([lat, lng], 15);
        if (this.userMarker) this.map.removeLayer(this.userMarker);
        // Marqueur bleu style bulletins (#185FA5)
        this.userMarker = L.circleMarker([lat, lng], {
          radius: 9, fillColor: '#185FA5',
          color: '#fff', weight: 2.5, fillOpacity: 1,
        }).addTo(this.map).bindPopup('Ma position');
      },
      () => {
        if (notifierEchec)
          this.snack.open('Impossible d\'obtenir la position GPS', 'OK', { duration: 3000 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  toutVoir(): void {
    if (this.allBounds.length > 0)
      this.map.fitBounds(this.allBounds, { padding: [40, 40] });
  }

  // Icône SVG inline — couleurs cohérentes avec bl-ok / bl-bad
  private creerIcone(color: string): any {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 10 13 25 13 25S26 23 26 13C26 5.8 20.2 0 13 0z"
            fill="${color}" stroke="#fff" stroke-width="1.8"/>
      <circle cx="13" cy="13" r="5.5" fill="#fff" fill-opacity=".85"/>
    </svg>`;
    return L.divIcon({
      html: svg, iconSize: [26, 38], iconAnchor: [13, 38],
      popupAnchor: [0, -38], className: '',
    });
  }

  private buildPopup(f: Famille, totalVerse: number, attendu: number): string {
    const reste  = Math.max(0, attendu - totalVerse);
    const fmt    = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
    // Couleurs reprises de bl-mention--ok / bl-mention--bad
    const statut = reste > 0
      ? `<span style="background:#FCEBEB;color:#791F1F;
                      font-size:11px;padding:2px 7px;border-radius:99px;
                      font-weight:500">${fmt(reste)} FCFA restants</span>`
      : `<span style="background:#EAF3DE;color:#27500A;
                      font-size:11px;padding:2px 7px;border-radius:99px;
                      font-weight:500">À jour ✓</span>`;

    return `
      <div style="min-width:185px;font-family:sans-serif;font-size:12px">
        <div style="font-weight:600;font-size:13px;margin-bottom:5px;color:#111">
          ${f.nom_famille}
        </div>
        <div style="color:#666;line-height:1.7;font-size:11px">
          Père : ${f.tel_pere || '—'}<br>
          Mère : ${f.tel_mere || '—'}
          ${f.adresse_texte ? `<br><span style="color:#aaa">${f.adresse_texte}</span>` : ''}
        </div>
        <div style="margin:7px 0 6px">${statut}</div>
        <button id="btn-fiche-${f.id_famille}"
          style="width:100%;padding:5px 0;background:#185FA5;color:#fff;
                 border:none;border-radius:6px;font-size:11px;
                 cursor:pointer;font-weight:600">
          Voir fiche →
        </button>
      </div>`;
  }

  ngOnDestroy(): void { if (this.map) this.map.remove(); }
}