// famille-map.component.ts — Carte globale familles (Leaflet OSM)
// ─────────────────────────────────────────────────────────────────
// Affiche toutes les familles géolocalisées sur une carte interactive.
// - Marqueurs verts (à jour) / rouges (en dette)
// - Popup avec solde + barre de progression + bouton "Voir fiche"
// - Filtre "Solde dû seulement" via layer-groups
// - 4 fonds de carte (OSM, Satellite, Sombre, Topo)
// - Géolocalisation GPS
// - Recherche Nominatim (barre de recherche flottante)
// Toute la logique Leaflet est déléguée à MapService.
// ─────────────────────────────────────────────────────────────────
import {
  Component, OnInit, OnDestroy, inject, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar }        from '@angular/material/snack-bar';
import { CacheService }       from '../../../core/services/cache.service';
import { Famille }            from '../../../core/models';
import { MapSearchComponent } from '../../../core/services/map/map-search.component';
import { MapService, TILE_KEYS, MapRef, MapMode, COLOR_BAD, COLOR_OK, NominatimResult } from '../../../core/services/map/map.service';


@Component({
  selector: 'app-famille-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MapSearchComponent],
  styles: [`
    /* Design system bl-* cohérent avec le reste de l'application */
    .bl-host { display:flex; flex-direction:column; gap:12px;
               font-size:13px; height:calc(100vh - 100px); }
    .bl-bar  { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
               padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09);
               flex-shrink:0; }
    .bl-sep  { width:0.5px; height:20px; background:rgba(0,0,0,.1); }

    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              text-decoration:none; white-space:nowrap; transition:opacity .1s; }
    .bl-btn--outline { background:white; color:#333;
                       border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    /* Barre chips */
    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px; border-bottom:0.5px solid rgba(0,0,0,.06);
                    flex-shrink:0; }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
               cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
               background:white; color:#555; transition:all .12s; }
    .bl-chip.on      { background:#EBF3FC; color:#185FA5;
                       border-color:#B5D4F4; font-weight:500; }
    .bl-chip.warn.on { background:#FAEEDA; color:#633806; border-color:#F5C4B3; }

    /* Pied */
    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; flex-shrink:0; }
    .bl-foot-info { font-size:11px; color:#aaa;
                    display:flex; align-items:center; gap:6px; }

    /* Carte pleine hauteur */
    #familles-map { flex:1; border-radius:8px; overflow:hidden;
                    border:0.5px solid rgba(0,0,0,.09); }

    /* Barre de recherche flottante superposée à la carte */
    .search-overlay { position:relative; flex-shrink:0; z-index:10; }
  `],
  template: `
<div class="bl-host">

  <!-- ══ BARRE PRINCIPALE ══ -->
  <div class="bl-bar">
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

    <button class="bl-btn bl-btn--outline" (click)="centrerMaPosition()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M8 1v3M8 12v3M1 8h3M12 8h3"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Ma position
    </button>

    <button class="bl-btn bl-btn--outline" (click)="toutVoir()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Tout voir
    </button>

    <span class="bl-sep"></span>

    @if (total() - nbAffiches() > 0) {
      <span style="font-size:11px;background:#FCEBEB;color:#791F1F;
                   padding:2px 8px;border-radius:99px">
        {{ total() - nbAffiches() }} sans GPS
      </span>
    }
  </div>

  <!-- ══ BARRE CHIPS : fonds de carte + filtre ══ -->
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

  <!-- ══ RECHERCHE NOMINATIM flottante ══ -->
  <div class="search-overlay">
    <app-map-search (resultatChoisi)="onAdresseChoisie($event)">
    </app-map-search>
  </div>

  <!-- ══ CARTE LEAFLET ══ -->
  <div id="familles-map"></div>

  <!-- ══ LÉGENDE ══ -->
  <div class="bl-foot">
    <div class="bl-foot-info">
      <span style="width:10px;height:10px;background:#185FA5;border-radius:50%;
                   border:2px solid white;box-shadow:0 0 0 2px rgba(24,95,165,.3);
                   display:inline-block"></span>
      Ma position
      <span style="width:10px;height:10px;background:#0F6E56;border-radius:50%;
                   display:inline-block;margin-left:8px"></span>
      À jour
      <span style="width:10px;height:10px;background:#993C1D;border-radius:50%;
                   display:inline-block;margin-left:8px"></span>
      Solde dû
    </div>
    <span class="bl-foot-info">{{ nbAffiches() }} marqueur(s) affiché(s)</span>
  </div>

</div>
  `
})
export class FamilleMapComponent implements OnInit, OnDestroy {

  private cache  = inject(CacheService);
  private router = inject(Router);
  private snack  = inject(MatSnackBar);
  private ms     = inject(MapService);   // ← SEULE dépendance Leaflet

  // ── État de l'UI ─────────────────────────────────────────────

  nbAffiches  = signal(0);
  total       = signal(0);
  tuileActive = signal('OSM');
  filtreSolde = signal(false);
  tileKeys    = TILE_KEYS;               // noms de fonds (OSM/Satellite/Sombre/Topo)

  // ── Références internes — gérées par MapService ───────────────

  private ref:         MapRef | null = null;
  private layerTous:   any;              // tous les marqueurs familles
  private layerSolde:  any;              // uniquement ceux avec dette
  private userMarker:  any = null;       // marqueur "Ma position"
  private allBounds:   [number, number][] = [];   // [lat, lng] pour fitBounds

  // ── Lifecycle ─────────────────────────────────────────────────

  ngOnInit(): void {
    // Leaflet a besoin que le DOM soit monté
    setTimeout(() => this.initMap(), 120);
  }

  ngOnDestroy(): void { this.ms.detruire(this.ref); }

  // ── Initialisation ────────────────────────────────────────────

  private initMap(): void {
    const familles = this.cache.getFamilles() ?? [];
    this.total.set(familles.length);

    // Carte interactive pleine hauteur, fond OSM par défaut
    this.ref = this.ms.creerCarte(
      'familles-map', MapMode.INTERACTIVE,
      [3.848, 11.502], 13, 'OSM',
    );

    // Deux layer-groups : tous les marqueurs / ceux avec dette uniquement
    this.layerTous  = this.ms.creerLayerGroup(this.ref, false);
    this.layerSolde = this.ms.creerLayerGroup(this.ref, false);

    familles.forEach((f: Famille) => {
      if (!f.latitude || !f.longitude) return;

      // Leaflet : [lat, lng]
      const latLng: [number, number] = [f.latitude, f.longitude];
      this.allBounds.push(latLng);

      // Solde famille → couleur du marqueur
      const totalVerse = this.cache.getPaiements()
        .filter(p => p.id_famille === f.id_famille)
        .reduce((s, p) => s + +(p.montant_verse ?? 0), 0);
      const attendu = +(f.montant_total_attendu ?? 0)
                    - +(f.montant_reduction ?? 0);
      const aDette  = attendu > 0 && totalVerse < attendu;

      // Popup enrichi : nom + contacts + solde + barre + bouton fiche
      const popup = this.ms.buildPopupFamille(f, totalVerse, attendu);

      // Marqueur coloré via MapService
      const marker = this.ms.creerMarqueurFamille(
        this.ref!, latLng,
        aDette ? COLOR_BAD : COLOR_OK,
        popup,
      );

      // Attache le bouton "Voir fiche" après rendu du popup dans le DOM
      marker.on('popupopen', () => {
        this.ms.attacherBoutonPopup(f.id_famille, () => {
          this.ref!.map.closePopup();
          this.router.navigate(['/familles'],
            { queryParams: { selected: f.id_famille } });
        });
      });

      // Ajoute aux deux groupes si nécessaire
      this.layerTous.addLayer(marker);
      if (aDette) this.layerSolde.addLayer(marker);
    });

    this.nbAffiches.set(this.allBounds.length);

    // Affiche tous les marqueurs par défaut
    this.layerTous.addTo(this.ref.map);

    // Zoom pour tout voir, puis tente la géolocalisation silencieuse
    this.ms.voirTout(this.ref, this.allBounds);
    this.centrerMaPosition(false);
  }

  // ── Fond de carte ─────────────────────────────────────────────

  changerTuile(key: string): void {
    if (!this.ref) return;
    this.tuileActive.set(key);
    this.ms.changerTuile(this.ref, key);
  }

  // ── Filtre solde — bascule entre les deux layer-groups ────────

  toggleFiltreSolde(): void {
    if (!this.ref) return;
    this.filtreSolde.update(v => !v);
    this.ms.basculerGroupe(
      this.ref,
      this.filtreSolde() ? this.layerSolde : this.layerTous,
      this.filtreSolde() ? this.layerTous  : this.layerSolde,
    );
  }

  // ── Géolocalisation GPS ───────────────────────────────────────

  centrerMaPosition(notifierEchec = true): void {
    if (!this.ref) return;
    this.ms.obtenirPosition().then(([lat, lng]) => {
      // Recrée le marqueur position (supprime l'ancien si présent)
      if (this.userMarker) this.ms.supprimerMarqueur(this.ref!, this.userMarker);
      this.userMarker = this.ms.creerMarqueurPosition(this.ref!, [lat, lng]);
      this.ms.centrer(this.ref!, [lat, lng], 15);
    }).catch(() => {
      if (notifierEchec)
        this.snack.open('Position GPS indisponible', 'OK', { duration: 3000 });
    });
  }

  // ── Voir tout ─────────────────────────────────────────────────

  toutVoir(): void {
    this.ms.voirTout(this.ref!, this.allBounds);
  }

  // ── Recherche Nominatim — reçu depuis app-map-search ─────────

  onAdresseChoisie(r: NominatimResult): void {
    if (!this.ref) return;
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    // Centre la carte sur le résultat avec un zoom rapproché
    this.ms.centrer(this.ref, [lat, lng], 16);
  }
}