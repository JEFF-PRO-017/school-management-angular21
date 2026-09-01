// etape-famille.component.ts
// Étape 2 : nom de la famille + adresse + position GPS sur une carte Leaflet.
// Toute la logique de carte (init, marqueur, GPS, recherche) est isolée ici :
// le parent n'a plus besoin de connaître Leaflet.
import {
  Component, Input, Output, EventEmitter, inject,
  AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MapSearchComponent } from '../../../../core/services/map/map-search.component';
import { MapService, MapRef, MapMode, NominatimResult } from '../../../../core/services/map/map.service';

// Yaoundé centre — position par défaut si aucune coordonnée connue
const DEFAULT_LAT = 3.848;
const DEFAULT_LNG = 11.502;
const DEFAULT_ZOOM = 14;

@Component({
  selector: 'app-etape-famille',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MapSearchComponent],
  template: `
    <div class="card m-3 shadow-sm rounded-4 p-3">
      <h2 class="h6 fw-bold mb-0">🏠 Famille & localisation</h2>
      <p class="text-muted small mb-3">Nom, adresse et position sur la carte</p>

      <form [formGroup]="form">
        <div class="mb-3">
          <label class="form-label small fw-semibold text-uppercase">Nom de la famille *</label>
          <input class="form-control"
                 [class.is-invalid]="nom_famille.invalid && nom_famille.touched"
                 formControlName="nom_famille" placeholder="ex: MBELLA">
          @if (nom_famille.invalid && nom_famille.touched) {
            <div class="invalid-feedback">Requis</div>
          }
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold text-uppercase">Adresse / quartier</label>
          <input class="form-control" formControlName="adresse_texte" placeholder="ex: Bastos, Yaoundé">
        </div>
      </form>

      <div class="mb-2">
        <label class="form-label small fw-semibold text-uppercase">Position sur la carte (optionnel)</label>

        <!-- Recherche d'adresse (autocomplete OpenStreetMap) -->
        <app-map-search class="d-block mb-2" (resultatChoisi)="onAdresseChoisie($event)"></app-map-search>

        <div class="small text-muted mb-2">Ou cliquez sur la carte / glissez le marqueur 📍</div>

        <!-- La hauteur fixe est requise par Leaflet pour s'afficher correctement -->
        <div class="position-relative border rounded-3 overflow-hidden mb-2">
          <div id="inscription-map" style="height:280px"></div>
          <button type="button"
                  class="btn btn-light rounded-circle shadow-sm position-absolute bottom-0 end-0 m-2"
                  style="width:36px;height:36px"
                  title="Utiliser ma position GPS"
                  (click)="centrerSurMoi()">📍</button>
        </div>

        @if (lat !== null) {
          <div class="bg-light rounded-3 px-3 py-2 small text-secondary d-flex gap-4 mb-1">
            <span>Lat : <strong class="text-primary">{{ lat.toFixed(5) }}</strong></span>
            <span>Lng : <strong class="text-primary">{{ lng!.toFixed(5) }}</strong></span>
          </div>
        }
        <div class="small text-muted">ℹ️ La position aide l'école à vous localiser en cas de besoin.</div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary" style="width:50px" (click)="precedent.emit()">←</button>
        <button class="btn btn-primary flex-fill" (click)="suivant.emit()" [disabled]="form.invalid">
          Suivant →
        </button>
      </div>
    </div>
  `,
})
export class EtapeFamilleComponent implements AfterViewInit, OnDestroy {

  private ms = inject(MapService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) form!: FormGroup;
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;

  // Le parent est prévenu à chaque changement de position (pour la sauvegarde du cache)
  @Output() positionChange = new EventEmitter<{ lat: number; lng: number }>();
  @Output() precedent = new EventEmitter<void>();
  @Output() suivant = new EventEmitter<void>();

  private ref: MapRef | null = null;
  private marker: any = null;

  get nom_famille() { return this.form.controls['nom_famille']; }

  ngAfterViewInit(): void {
    // Léger délai pour laisser le DOM se stabiliser avant d'initialiser Leaflet
    setTimeout(() => this.initMap(), 150);
  }

  ngOnDestroy(): void {
    this.ms.detruire(this.ref);
  }

  private initMap(): void {
    const lat0 = this.lat ?? DEFAULT_LAT;
    const lng0 = this.lng ?? DEFAULT_LNG;

    // Mode FORM : zoom actif, scroll de page non capturé (utile en mobile)
    this.ref = this.ms.creerCarte('inscription-map', MapMode.FORM, [lat0, lng0], DEFAULT_ZOOM);

    this.marker = this.ms.creerMarqueurFormulaire(this.ref, [lat0, lng0], (lat, lng) => {
      this.positionChange.emit({ lat, lng });
    });

    // Si aucune coordonnée n'était connue, on renvoie la position par défaut au parent
    if (this.lat === null) {
      this.positionChange.emit({ lat: +lat0.toFixed(6), lng: +lng0.toFixed(6) });
    }
  }

  centrerSurMoi(): void {
    this.ms.obtenirPosition(6000).then(([lat, lng]) => {
      this.ms.centrer(this.ref!, [lat, lng], 16);
      this.ms.deplacerMarqueur(this.marker, [lat, lng]);
      this.positionChange.emit({ lat, lng });
      this.cdr.markForCheck();
    }).catch(() => { /* permission refusée ou timeout — on ignore silencieusement */ });
  }

  onAdresseChoisie(r: NominatimResult): void {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);

    if (this.ref) {
      this.ms.centrer(this.ref, [lat, lng], 16);
      this.ms.deplacerMarqueur(this.marker, [lat, lng]);
    }
    // Pré-remplit l'adresse texte seulement si elle est encore vide
    if (!this.form.value.adresse_texte) {
      this.form.patchValue({ adresse_texte: this.ms.formaterResultat(r) });
    }
    this.positionChange.emit({ lat, lng });
  }
}