// map.service.ts — Service centralisé Leaflet.js (OSM)
// ─────────────────────────────────────────────────────────────────
// VERSION FINALE — Leaflet uniquement (OpenStreetMap)
//
// RESPONSABILITÉS
//   • Vérifier la disponibilité de Leaflet (CDN index.html)
//   • Créer des cartes selon 3 modes (INTERACTIVE / MINI / FORM)
//   • Gérer les fonds de carte (4 tuiles OSM) et le changement à chaud
//   • Créer les marqueurs stylisés (épingle famille, formulaire, position)
//   • Gérer les layer-groups (filtres multi-couches)
//   • Navigation : centrer, voirTout, invaliderTaille
//   • Géolocalisation GPS du navigateur
//   • Recherche d'adresse fluide via Nominatim (OpenStreetMap, gratuit)
//   • Construire les popups HTML standardisés (design system bl-*)
//   • Nettoyer proprement (detruire)
//
// USAGE RAPIDE
//   private ms = inject(MapService);
//
//   // 1. Créer une carte
//   this.ref = this.ms.creerCarte('mon-div', MapMode.INTERACTIVE);
//
//   // 2. Ajouter un marqueur famille
//   this.ms.creerMarqueurFamille(this.ref, [3.848, 11.502], COLOR_OK, popup);
//
//   // 3. Recherche d'adresse (autocomplete)
//   this.ms.rechercherAdresse('Bastos Yaoundé').then(resultats => ...);
//
//   // 4. Détruire (ngOnDestroy)
//   this.ms.detruire(this.ref);
//
// PRÉREQUIS index.html
//   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
//   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// ─────────────────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { HttpClient }          from '@angular/common/http';
import { firstValueFrom }      from 'rxjs';
import { debounceTime, switchMap, Subject, of } from 'rxjs';

// ── Leaflet global — chargé via CDN ─────────────────────────────
declare const L: any;

// ═════════════════════════════════════════════════════════════════
// CONSTANTES PUBLIQUES — importables par les composants
// ═════════════════════════════════════════════════════════════════

/** Fonds de carte disponibles (OpenStreetMap uniquement) */
export interface TileConfig {
  url:   string;
  attr:  string;
  maxZ:  number;
  label: string;  // libellé affiché dans l'UI
}

export const TILE_CONFIGS: Record<string, TileConfig> = {
  OSM: {
    label: 'Carte',
    url:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr:  '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    maxZ:  19,
  },
  Satellite: {
    label: 'Satellite',
    url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr:  '© Esri, DigitalGlobe, GeoEye',
    maxZ:  19,
  },
  Sombre: {
    label: 'Sombre',
    url:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr:  '© <a href="https://carto.com/" target="_blank">CARTO</a>',
    maxZ:  19,
  },
  Topo: {
    label: 'Topo',
    url:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr:  '© <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)',
    maxZ:  17,
  },
};

/** Noms de tuiles — pour `@for (k of TILE_KEYS; track k)` dans les templates */
export const TILE_KEYS   = Object.keys(TILE_CONFIGS);
export const DEFAULT_TILE: string = 'OSM';

/** Coordonnées par défaut — Yaoundé centre */
export const DEFAULT_CENTER: [number, number] = [3.848, 11.502];
export const DEFAULT_ZOOM       = 14;
export const DEFAULT_ZOOM_MINI  = 15;
export const DEFAULT_ZOOM_RESULT = 16;  // zoom après sélection résultat recherche

/** Couleurs du design system bl-* */
export const COLOR_OK     = '#0F6E56';   // à jour
export const COLOR_BAD    = '#993C1D';   // en dette
export const COLOR_CSB    = '#185FA5';   // bleu CSB
export const COLOR_MARKER = '#185FA5';   // marqueur formulaire

// ─────────────────────────────────────────────────────────────────
// Mode de carte
// ─────────────────────────────────────────────────────────────────
export enum MapMode {
  /** Pleine carte — zoom, drag, scroll, popups actifs */
  INTERACTIVE = 'interactive',
  /** Compacte lecture seule — dans famille-detail */
  MINI        = 'mini',
  /** Dans un formulaire — marqueur draggable, scroll désactivé */
  FORM        = 'form',
}

// ─────────────────────────────────────────────────────────────────
// Référence opaque d'une carte (passée entre composant et service)
// ─────────────────────────────────────────────────────────────────
export interface MapRef {
  map:        any;      // instance L.Map
  tileLayer:  any;      // couche tuile active
  tileName:   string;   // nom du fond actif
  mode:       MapMode;
  _destroyed: boolean;  // flag de nettoyage
}

// ─────────────────────────────────────────────────────────────────
// Résultat de recherche Nominatim
// ─────────────────────────────────────────────────────────────────
export interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
  type:         string;
  importance:   number;
  address?: {
    city?:       string;
    town?:       string;
    village?:    string;
    county?:     string;
    state?:      string;
    country?:    string;
    road?:       string;
    suburb?:     string;
    postcode?:   string;
  };
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class MapService {

  private http = inject(HttpClient);

  // URL Nominatim — API publique gratuite OpenStreetMap
  private readonly NOMINATIM = 'https://nominatim.openstreetmap.org/search';

  // ── Vérification ──────────────────────────────────────────────

  /** true si Leaflet est disponible dans le scope global */
  get disponible(): boolean { return typeof L !== 'undefined'; }

  private assertLeaflet(): void {
    if (!this.disponible) throw new Error(
      '[MapService] Leaflet non chargé. ' +
      'Ajoutez dans index.html : ' +
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CRÉATION DE CARTE
  // ─────────────────────────────────────────────────────────────

  /**
   * Crée et configure une carte Leaflet dans l'élément DOM indiqué.
   *
   * @param divId   ID du conteneur HTML (sans #)
   * @param mode    INTERACTIVE | MINI | FORM
   * @param center  [lat, lng] initial  (défaut: Yaoundé)
   * @param zoom    Niveau de zoom       (défaut: 14)
   * @param tile    Fond de carte        (défaut: 'OSM')
   */
  creerCarte(
    divId:  string,
    mode:   MapMode = MapMode.INTERACTIVE,
    center: [number, number] = DEFAULT_CENTER,
    zoom:   number  = DEFAULT_ZOOM,
    tile:   string  = DEFAULT_TILE,
  ): MapRef {
    this.assertLeaflet();

    const map = L.map(divId, this._optionsMode(mode)).setView(center, zoom);

    const cfg       = TILE_CONFIGS[tile] ?? TILE_CONFIGS[DEFAULT_TILE];
    const tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attr,
      maxZoom:     cfg.maxZ,
    }).addTo(map);

    // Attribution compacte sur les petites cartes
    if (mode !== MapMode.INTERACTIVE) {
      map.attributionControl?.setPrefix('© OSM');
    }

    const ref: MapRef = { map, tileLayer, tileName: tile, mode, _destroyed: false };

    // Fix bug "grey tiles" Leaflet quand le conteneur était caché
    setTimeout(() => { if (!ref._destroyed) map.invalidateSize(); }, 200);

    return ref;
  }

  /** Options L.map selon le mode */
  private _optionsMode(mode: MapMode): object {
    if (mode === MapMode.MINI) return {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, boxZoom: false,
      keyboard: false, attributionControl: true,
    };
    if (mode === MapMode.FORM) return {
      zoomControl: true, dragging: true,
      scrollWheelZoom: false,   // évite conflits mobile dans un modal
      attributionControl: false,
    };
    // INTERACTIVE
    return {
      zoomControl: true, dragging: true,
      scrollWheelZoom: true, attributionControl: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // GESTION DES TUILES
  // ─────────────────────────────────────────────────────────────

  /**
   * Change le fond de carte à chaud sans recréer la carte.
   * L'ancienne couche est retirée avant d'ajouter la nouvelle.
   */
  changerTuile(ref: MapRef, tileName: string): void {
    if (ref._destroyed) return;
    const cfg = TILE_CONFIGS[tileName];
    if (!cfg) { console.warn(`[MapService] Tuile inconnue : "${tileName}"`); return; }
    ref.map.removeLayer(ref.tileLayer);
    ref.tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attr, maxZoom: cfg.maxZ,
    }).addTo(ref.map);
    ref.tileName = tileName;
  }

  // ─────────────────────────────────────────────────────────────
  // MARQUEURS
  // ─────────────────────────────────────────────────────────────

  /**
   * Marqueur épingle stylisé pour une famille.
   * COLOR_OK (vert) = à jour · COLOR_BAD (rouge) = en dette.
   *
   * @param popup  HTML du popup (construit avec buildPopupFamille)
   */
  creerMarqueurFamille(
    ref:    MapRef,
    latLng: [number, number],
    color:  string = COLOR_OK,
    popup?: string,
  ): any {
    if (ref._destroyed) return null;
    const m = L.marker(latLng, { icon: this._iconeEpingle(color) });
    if (popup) m.bindPopup(popup, { maxWidth: 240 });
    return m.addTo(ref.map);
  }

  /**
   * Marqueur formulaire — draggable + listener clic sur la carte.
   * Appelle `onMove(lat, lng)` après chaque déplacement.
   *
   * Créer UN SEUL marqueur formulaire par carte (clic carte est global).
   */
  creerMarqueurFormulaire(
    ref:    MapRef,
    latLng: [number, number],
    onMove: (lat: number, lng: number) => void,
  ): any {
    if (ref._destroyed) return null;
    const marker = L.marker(latLng, {
      draggable: true,
      icon: this._iconeFormulaire(),
    }).addTo(ref.map);

    // Drag — met à jour les coordonnées
    marker.on('dragend', (e: any) => {
      const p = e.target.getLatLng();
      onMove(+(p.lat.toFixed(6)), +(p.lng.toFixed(6)));
    });

    // Clic sur la carte — déplace le marqueur et met à jour
    ref.map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      onMove(+(e.latlng.lat.toFixed(6)), +(e.latlng.lng.toFixed(6)));
    });

    return marker;
  }

  /**
   * Marqueur rond « Ma position GPS » (style pulsé, bleu CSB).
   */
  creerMarqueurPosition(ref: MapRef, latLng: [number, number]): any {
    if (ref._destroyed) return null;
    return L.circleMarker(latLng, {
      radius: 9, fillColor: COLOR_CSB,
      color: '#fff', weight: 2.5, fillOpacity: 1,
    }).addTo(ref.map).bindPopup('📍 Ma position');
  }

  /** Déplace un marqueur existant sans le recréer. */
  deplacerMarqueur(marker: any, latLng: [number, number]): void {
    if (marker) marker.setLatLng(latLng);
  }

  /** Retire un marqueur de la carte (sans la détruire). */
  supprimerMarqueur(ref: MapRef, marker: any): void {
    if (!ref._destroyed && marker) ref.map.removeLayer(marker);
  }

  // ─────────────────────────────────────────────────────────────
  // LAYER-GROUPS (filtres multi-couches)
  // ─────────────────────────────────────────────────────────────

  /** Crée un groupe de couches — optionnellement ajouté à la carte. */
  creerLayerGroup(ref: MapRef, ajouter = true): any {
    if (ref._destroyed) return null;
    const g = L.layerGroup();
    if (ajouter) g.addTo(ref.map);
    return g;
  }

  /**
   * Bascule entre deux groupes (ex: tous / avec dette).
   * Retire `desactiver` et ajoute `activer` si pas déjà présent.
   */
  basculerGroupe(ref: MapRef, activer: any, desactiver: any): void {
    if (ref._destroyed) return;
    if (desactiver && ref.map.hasLayer(desactiver)) ref.map.removeLayer(desactiver);
    if (activer    && !ref.map.hasLayer(activer))   activer.addTo(ref.map);
  }

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────

  /** Centre la carte sur des coordonnées avec animation douce. */
  centrer(ref: MapRef, latLng: [number, number], zoom?: number): void {
    if (ref._destroyed) return;
    ref.map.setView(latLng, zoom ?? ref.map.getZoom(), { animate: true });
  }

  /**
   * Ajuste le zoom pour afficher tous les points (fitBounds).
   *
   * @param bounds  Tableau de [lat, lng]
   * @param padding Marge en pixels [haut+bas, gauche+droite] (défaut [40,40])
   */
  voirTout(ref: MapRef, bounds: [number, number][], padding: [number, number] = [40, 40]): void {
    if (ref._destroyed || !bounds.length) return;
    ref.map.fitBounds(bounds, { padding, animate: true });
  }

  /**
   * Force Leaflet à recalculer les dimensions du conteneur.
   * À appeler après un changement de visibilité CSS
   * (onglets, modaux, accordéons).
   */
  invaliderTaille(ref: MapRef): void {
    if (!ref._destroyed) ref.map.invalidateSize();
  }

  // ─────────────────────────────────────────────────────────────
  // GÉOLOCALISATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Obtient la position GPS du navigateur.
   *
   * @returns Promise<[lat, lng]>
   * @throws  string message d'erreur lisible (pour affichage UI)
   *
   * @example
   *   this.ms.obtenirPosition().then(([lat, lng]) => { ... })
   *                            .catch(msg => this.snack.open(msg));
   */
  obtenirPosition(timeout = 6000): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Géolocalisation non disponible sur cet appareil.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve([pos.coords.latitude, pos.coords.longitude]),
        err => {
          const msgs: Record<number, string> = {
            1: 'Permission refusée. Activez la localisation dans vos réglages.',
            2: 'Position introuvable. Vérifiez votre connexion.',
            3: 'Délai dépassé. Réessayez en extérieur.',
          };
          reject(msgs[err.code] ?? 'Erreur de géolocalisation inconnue.');
        },
        { enableHighAccuracy: true, timeout, maximumAge: 30_000 }
      );
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RECHERCHE D'ADRESSE — Nominatim (OpenStreetMap)
  // ─────────────────────────────────────────────────────────────
  //
  // Nominatim est l'API de géocodage officielle d'OpenStreetMap.
  // Gratuite, sans clé API, avec une limite de 1 req/s.
  // Termes d'utilisation : https://nominatim.org/release-docs/latest/api/Search/
  //
  // On biaise les résultats sur le Cameroun (countrycodes=cm)
  // et on ajoute "Yaoundé" comme contexte par défaut.

  /**
   * Recherche d'adresses via Nominatim avec biais Cameroun.
   *
   * @param query   Texte saisi par l'utilisateur (min 3 caractères)
   * @param limit   Nombre max de résultats (défaut: 5)
   * @returns       Tableau de résultats triés par pertinence
   *
   * @example
   *   const resultats = await this.ms.rechercherAdresse('Bastos Yao');
   *   // [{ display_name: "Bastos, Yaoundé, ...", lat: "3.88", lon: "11.51" }]
   */
  async rechercherAdresse(query: string, limit = 5): Promise<NominatimResult[]> {
    if (!query || query.trim().length < 3) return [];
    try {
      const params = new URLSearchParams({
        q:            query.trim(),
        format:       'jsonv2',
        addressdetails: '1',
        limit:        String(limit),
        countrycodes: 'cm',           // biais Cameroun
        'accept-language': 'fr',      // résultats en français
      });
      const url = `${this.NOMINATIM}?${params.toString()}`;
      const results = await firstValueFrom(
        this.http.get<NominatimResult[]>(url, {
          headers: {
            // Obligatoire selon les CGU Nominatim
            'User-Agent': 'CSB-Berceau-du-Savoir/1.0',
          },
        })
      );
      return (results ?? []).sort((a, b) => b.importance - a.importance);
    } catch (e) {
      console.warn('[MapService] Nominatim:', e);
      return [];
    }
  }

  /**
   * Géocode une adresse textuelle et retourne [lat, lng].
   * Retourne null si aucun résultat.
   */
  async geocoderAdresse(adresse: string): Promise<[number, number] | null> {
    const resultats = await this.rechercherAdresse(adresse, 1);
    if (!resultats.length) return null;
    return [parseFloat(resultats[0].lat), parseFloat(resultats[0].lon)];
  }

  /**
   * Formate un résultat Nominatim pour l'affichage.
   * Prioritise les noms locaux courts avant le display_name complet.
   *
   * @returns  ex: "Bastos, Yaoundé" au lieu du chemin complet
   */
  formaterResultat(r: NominatimResult): string {
    const a = r.address;
    if (!a) return r.display_name;

    const parts: string[] = [];
    if (a.road)    parts.push(a.road);
    if (a.suburb)  parts.push(a.suburb);
    const ville = a.city ?? a.town ?? a.village;
    if (ville)     parts.push(ville);
    if (a.county && !parts.includes(a.county))  parts.push(a.county);

    return parts.length ? parts.join(', ') : r.display_name;
  }

  // ─────────────────────────────────────────────────────────────
  // POPUPS
  // ─────────────────────────────────────────────────────────────

  /**
   * Construit le HTML d'un popup famille standardisé.
   * Styles cohérents avec le design system bl-*.
   *
   * @param famille        Données de la famille
   * @param totalVerse     Total déjà versé (FCFA)
   * @param montantAttendu Montant total attendu après réduction (FCFA)
   */
  buildPopupFamille(
    famille: {
      id_famille:    string;
      nom_famille:   string;
      tel_pere?:     string;
      tel_mere?:     string;
      adresse_texte?: string;
    },
    totalVerse:       number,
    montantAttendu:   number,
  ): string {
    const reste    = Math.max(0, montantAttendu - totalVerse);
    const fmt      = (n: number) =>
      new Intl.NumberFormat('fr-FR').format(Math.round(n));
    const pct      = montantAttendu > 0
      ? Math.min(100, Math.round((totalVerse / montantAttendu) * 100)) : 0;

    // Badge statut — bl-mention--ok / bl-mention--bad
    const [badgeBg, badgeTxt, badgeLabel] = reste > 0
      ? ['#FCEBEB', '#791F1F', `${fmt(reste)} FCFA restants`]
      : ['#EAF3DE', '#27500A', 'À jour ✓'];

    // Barre progression inline
    const barColor = pct >= 100 ? '#0F6E56' : pct >= 50 ? '#D97706' : '#DC2626';
    const bar = `
      <div style="height:4px;background:#E5E7EB;border-radius:99px;
                  overflow:hidden;margin:6px 0 4px">
        <div style="height:100%;width:${pct}%;background:${barColor};
                    border-radius:99px"></div>
      </div>`;

    return `
      <div style="min-width:200px;font-family:system-ui,sans-serif;font-size:12px">
        <div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#111">
          ${famille.nom_famille}
        </div>
        <div style="color:#666;font-size:11px;line-height:1.7">
          📞 Père : <strong>${famille.tel_pere || '—'}</strong><br>
          📞 Mère : <strong>${famille.tel_mere || '—'}</strong>
          ${famille.adresse_texte
            ? `<br>📍 <span style="color:#9CA3AF">${famille.adresse_texte}</span>`
            : ''}
        </div>
        <div style="margin:7px 0 2px">
          <span style="background:${badgeBg};color:${badgeTxt};
                       font-size:10px;padding:2px 8px;border-radius:99px;
                       font-weight:600;display:inline-block">
            ${badgeLabel}
          </span>
        </div>
        ${bar}
        <div style="font-size:10px;color:#9CA3AF;text-align:right;margin-bottom:7px">
          ${pct}% réglé
        </div>
        <button id="btn-popup-${famille.id_famille}"
                style="width:100%;padding:6px 0;background:#185FA5;color:#fff;
                       border:none;border-radius:7px;font-size:11px;
                       cursor:pointer;font-weight:600;letter-spacing:.02em">
          Voir fiche →
        </button>
      </div>`;
  }

  /**
   * Attache le listener du bouton "Voir fiche" après ouverture du popup.
   * À appeler dans l'événement `marker.on('popupopen', ...)`.
   *
   * @param idFamille  ID de la famille (correspond à btn-popup-{id})
   * @param callback   Fonction exécutée au clic
   */
  attacherBoutonPopup(idFamille: string, callback: () => void): void {
    // 60ms : laisse le DOM du popup se rendre avant d'attacher
    setTimeout(() => {
      document
        .getElementById(`btn-popup-${idFamille}`)
        ?.addEventListener('click', callback);
    }, 60);
  }

  // ─────────────────────────────────────────────────────────────
  // NETTOYAGE
  // ─────────────────────────────────────────────────────────────

  /**
   * Détruit proprement la carte et libère la mémoire.
   * TOUJOURS appeler dans ngOnDestroy() du composant hôte.
   *
   * @example
   *   ngOnDestroy(): void { this.ms.detruire(this.ref); }
   */
  detruire(ref: MapRef | null | undefined): void {
    if (!ref || ref._destroyed) return;
    try {
      ref.map.off();     // retire tous les événements
      ref.map.remove();  // détruit l'instance Leaflet et libère le DOM
    } catch { /* silencieux si DOM déjà détaché */ }
    ref._destroyed = true;
  }

  // ─────────────────────────────────────────────────────────────
  // ICÔNES PRIVÉES
  // ─────────────────────────────────────────────────────────────

  /**
   * Icône épingle SVG — utilisée pour les marqueurs familles.
   * Forme teardrop, couleur paramétrable, cercle blanc intérieur.
   */
  private _iconeEpingle(color: string): any {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 10 13 25 13 25S26 23 26 13C26 5.8 20.2 0 13 0z"
              fill="${color}" stroke="#fff" stroke-width="1.8"/>
        <circle cx="13" cy="13" r="5.5" fill="#fff" fill-opacity=".9"/>
      </svg>`;
    return L.divIcon({
      html:        svg,
      iconSize:    [26, 38],
      iconAnchor:  [13, 38],
      popupAnchor: [0, -40],
      className:   '',    // supprime la classe .leaflet-div-icon par défaut
    });
  }

  /**
   * Icône losange — utilisée pour le marqueur de formulaire.
   * Forme visuelle distincte des marqueurs familles.
   */
  private _iconeFormulaire(): any {
    return L.divIcon({
      html: `<div style="
        width:28px;height:28px;
        background:${COLOR_MARKER};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,.3)">
      </div>`,
      iconSize:    [28, 28],
      iconAnchor:  [14, 28],
      popupAnchor: [0, -32],
      className:   '',
    });
  }
}