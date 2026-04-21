// map-search.component.ts — Recherche d'adresse Nominatim (OSM)
// ─────────────────────────────────────────────────────────────────
// Composant standalone réutilisable dans tout formulaire avec carte.
//
// USAGE dans un template parent :
//   <app-map-search (resultatChoisi)="onAdresse($event)"/>
//
// L'événement retourne un NominatimResult complet :
//   onAdresse(r: NominatimResult): void {
//     this.lat.set(parseFloat(r.lat));
//     this.lng.set(parseFloat(r.lon));
//     this.ms.centrer(this.ref!, [+r.lat, +r.lon], DEFAULT_ZOOM_RESULT);
//     this.ms.deplacerMarqueur(this.marker, [+r.lat, +r.lon]);
//   }
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, output,
  ChangeDetectionStrategy, ChangeDetectorRef,
  ElementRef, ViewChild, HostListener,
} from '@angular/core';
import { FormsModule }     from '@angular/forms';
import { MapService, NominatimResult } from './map.service';

@Component({
  selector: 'app-map-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  styles: [`
    :host { display:block; position:relative; }

    .search-wrap {
      display: flex;
      align-items: center;
      background: white;
      border: 1.5px solid #D1D9E6;
      border-radius: 10px;
      padding: 0 12px;
      gap: 8px;
      transition: border-color .15s;
    }
    .search-wrap:focus-within { border-color: #185FA5; }
    .search-wrap--loading { border-color: #B5D4F4; }

    .search-icon {
      color: #9CA3AF;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .search-input {
      flex: 1;
      height: 42px;
      border: none;
      outline: none;
      font-size: 14px;
      color: #111;
      background: transparent;
      min-width: 0;
    }
    .search-input::placeholder { color: #C4CDD6; }

    .clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #9CA3AF;
      padding: 2px;
      display: flex;
      align-items: center;
      border-radius: 4px;
    }
    .clear-btn:hover { color: #555; background: #F0F4F8; }

    /* Spinner de chargement */
    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #E5E7EB;
      border-top-color: #185FA5;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Dropdown résultats */
    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      z-index: 2000;
      overflow: hidden;
      max-height: 280px;
      overflow-y: auto;
    }

    .result-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 0.5px solid #F0F4F8;
      transition: background .1s;
    }
    .result-item:last-child { border-bottom: none; }
    .result-item:hover,
    .result-item--focused { background: #EBF3FC; }

    .result-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .result-text { flex: 1; min-width: 0; }
    .result-name {
      font-size: 13px;
      font-weight: 500;
      color: #111;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .result-detail {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Aucun résultat */
    .no-result {
      padding: 16px 14px;
      font-size: 13px;
      color: #9CA3AF;
      text-align: center;
    }

    /* Aide min. caractères */
    .hint-min {
      padding: 10px 14px;
      font-size: 11px;
      color: #B0BAC9;
      text-align: center;
    }
  `],
  template: `
<div #host>
  <!-- Champ de saisie -->
  <div class="search-wrap" [class.search-wrap--loading]="chargement()">
    <div class="search-icon">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"
              stroke-linecap="round"/>
      </svg>
    </div>

    <input #inputEl
           class="search-input"
           type="text"
           [(ngModel)]="query"
           (ngModelChange)="onInput($event)"
           (keydown)="onKeydown($event)"
           placeholder="Rechercher une adresse ou un quartier…"
           autocomplete="off"
           autocorrect="off"
           spellcheck="false">

    @if (chargement()) {
      <div class="spinner"></div>
    } @else if (query) {
      <button class="clear-btn" (click)="vider()" type="button" title="Effacer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor"
                stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    }
  </div>

  <!-- Dropdown résultats -->
  @if (ouvert() && (resultats().length > 0 || chargement() || messageFin())) {
    <div class="dropdown" role="listbox">

      @if (query.length < MIN_CHARS && !chargement()) {
        <div class="hint-min">Tapez au moins {{ MIN_CHARS }} caractères…</div>
      }

      @if (messageFin() && !chargement() && resultats().length === 0) {
        <div class="no-result">
          <div>🔍 Aucun résultat pour « {{ query }} »</div>
          <div style="font-size:11px;margin-top:4px;color:#C4CDD6">
            Essayez avec un quartier ou une ville
          </div>
        </div>
      }

      @for (r of resultats(); track r.place_id; let i = $index) {
        <div class="result-item"
             [class.result-item--focused]="indexFocus() === i"
             role="option"
             (click)="choisir(r)"
             (mouseenter)="indexFocus.set(i)">
          <div class="result-icon">{{ iconeType(r.type) }}</div>
          <div class="result-text">
            <div class="result-name">{{ ms.formaterResultat(r) }}</div>
            <div class="result-detail">{{ detailSecondaire(r) }}</div>
          </div>
        </div>
      }

    </div>
  }
</div>
  `
})
export class MapSearchComponent {

  readonly ms  = inject(MapService);
  private  cdr = inject(ChangeDetectorRef);

  // ── Output — émis quand l'utilisateur choisit un résultat ─────
  readonly resultatChoisi = output<NominatimResult>();

  // ── State ─────────────────────────────────────────────────────
  query        = '';
  resultats    = signal<NominatimResult[]>([]);
  chargement   = signal(false);
  ouvert       = signal(false);
  messageFin   = signal(false);   // "aucun résultat" affiché
  indexFocus   = signal(-1);      // navigation clavier

  readonly MIN_CHARS = 3;

  // Debounce manuel — évite de surcharger Nominatim
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 350;

  // ── Saisie ────────────────────────────────────────────────────

  onInput(val: string): void {
    this.query = val;
    this.indexFocus.set(-1);
    this.messageFin.set(false);

    if (!val || val.trim().length < this.MIN_CHARS) {
      this.resultats.set([]);
      this.ouvert.set(val.length > 0);
      this._annulerDebounce();
      this.chargement.set(false);
      return;
    }

    this.ouvert.set(true);
    this._annulerDebounce();
    this.chargement.set(true);

    this._debounceTimer = setTimeout(async () => {
      const res = await this.ms.rechercherAdresse(val);
      this.resultats.set(res);
      this.chargement.set(false);
      this.messageFin.set(res.length === 0);
      this.indexFocus.set(res.length ? 0 : -1);
      this.cdr.markForCheck();
    }, this.DEBOUNCE_MS);
  }

  // ── Navigation clavier ────────────────────────────────────────

  onKeydown(e: KeyboardEvent): void {
    const nb = this.resultats().length;
    if (!nb) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.indexFocus.update(i => Math.min(i + 1, nb - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.indexFocus.update(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && this.indexFocus() >= 0) {
      e.preventDefault();
      this.choisir(this.resultats()[this.indexFocus()]);
    } else if (e.key === 'Escape') {
      this.fermer();
    }
  }

  // ── Sélection d'un résultat ───────────────────────────────────

  choisir(r: NominatimResult): void {
    this.query = this.ms.formaterResultat(r);  // met à jour le champ
    this.resultats.set([]);
    this.ouvert.set(false);
    this.messageFin.set(false);
    this.indexFocus.set(-1);
    this.resultatChoisi.emit(r);               // notifie le parent
    this.cdr.markForCheck();
  }

  vider(): void {
    this.query = '';
    this.resultats.set([]);
    this.ouvert.set(false);
    this.messageFin.set(false);
    this._annulerDebounce();
    this.chargement.set(false);
  }

  fermer(): void {
    this.ouvert.set(false);
    this.resultats.set([]);
  }

  // ── Fermeture au clic à l'extérieur ──────────────────────────

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: HTMLElement): void {
    // Ferme si le clic est hors du composant
    if (this.ouvert() && !document.querySelector('app-map-search')?.contains(target)) {
      this.fermer();
    }
  }

  // ── Helpers affichage ─────────────────────────────────────────

  iconeType(type: string): string {
    const map: Record<string, string> = {
      house:       '🏠', residential:  '🏘️', road:        '🛣️',
      street:      '🛤️', suburb:       '🏙️', city:        '🏙️',
      town:        '🏘️', village:      '🏡', county:      '📍',
      school:      '🎓', university:   '🎓', hospital:    '🏥',
      church:      '⛪', mosque:       '🕌', market:      '🛒',
      supermarket: '🛒', restaurant:   '🍽️', hotel:       '🏨',
      station:     '🚉', bus_stop:     '🚌', park:        '🌳',
      forest:      '🌲', water:        '💧', administrative: '🏛️',
    };
    return map[type] ?? '📍';
  }

  detailSecondaire(r: NominatimResult): string {
    const a = r.address;
    if (!a) return '';
    const parts: string[] = [];
    const ville = a.city ?? a.town ?? a.village;
    if (a.county && a.county !== ville) parts.push(a.county);
    if (ville) parts.push(ville);
    if (a.state && a.state !== ville)   parts.push(a.state);
    return parts.join(', ');
  }

  private _annulerDebounce(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }
}