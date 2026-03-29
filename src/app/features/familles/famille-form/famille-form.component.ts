// famille-form.component.ts — formulaire création/modification d'une famille
// Inclut un sélecteur de localisation OpenStreetMap (Leaflet)
import {
  Component, inject, signal, OnInit, OnDestroy, AfterViewInit
} from '@angular/core';
import {
  FormGroup, FormControl, ReactiveFormsModule, Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Famille } from '../../../core/models';

// Leaflet est chargé via angular.json scripts
declare const L: any;

@Component({
  selector: 'app-famille-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="container-fluid px-0" style="max-width:700px">

      <!-- Titre -->
      <div class="d-flex align-items-center gap-2 mb-4">
        <a routerLink="/familles" mat-icon-button>
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h5 class="fw-bold text-primary mb-0">
          {{ isEdit ? 'Modifier la famille' : 'Nouvelle famille' }}
        </h5>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">

        <!-- Infos de base -->
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white fw-semibold">Informations</div>
          <div class="card-body row g-3">

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Nom de la famille *</mat-label>
                <input matInput formControlName="nom_famille">
                @if (form.controls.nom_famille.invalid && form.controls.nom_famille.touched) {
                  <mat-error>Champ requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Téléphone père *</mat-label>
                <input matInput formControlName="tel_pere" type="tel">
                <mat-icon matSuffix>phone</mat-icon>
                @if (form.controls.tel_pere.invalid && form.controls.tel_pere.touched) {
                  <mat-error>Champ requis</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Téléphone mère</mat-label>
                <input matInput formControlName="tel_mere" type="tel">
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Autre téléphone</mat-label>
                <input matInput formControlName="tel_autre" type="tel">
              </mat-form-field>
            </div>

            <div class="col-12">
              <mat-form-field class="w-100" appearance="outline">
                <mat-label>Adresse descriptive</mat-label>
                <textarea matInput formControlName="adresse_texte" rows="2"></textarea>
              </mat-form-field>
            </div>

          </div>
        </div>

        <!-- Localisation OpenStreetMap -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white d-flex align-items-center justify-content-between">
            <span class="fw-semibold">Localisation (optionnel)</span>
            @if (lat() && lng()) {
              <span class="badge bg-success-subtle text-success small">
                {{ lat()?.toFixed(5) }}, {{ lng()?.toFixed(5) }}
              </span>
            }
          </div>
          <div class="card-body p-0">
            <!-- Carte Leaflet — cliquer pour placer le marqueur -->
            <div id="famille-map" style="height:280px;border-radius:0 0 8px 8px"></div>
            <div class="p-2 bg-light text-muted small text-center">
              Cliquez sur la carte pour définir la position de la maison
            </div>
          </div>
        </div>

        <!-- Boutons -->
        <div class="d-flex gap-2 justify-content-end">
          <a routerLink="/familles" mat-stroked-button>Annuler</a>
          <button mat-raised-button color="primary"
                  type="submit" [disabled]="form.invalid || saving()">
            <mat-icon>save</mat-icon>
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>

      </form>
    </div>
  `
})
export class FamilleFormComponent implements OnInit, AfterViewInit, OnDestroy {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private cache   = inject(CacheService);
  private data    = inject(DataService);
  private snack   = inject(MatSnackBar);

  isEdit  = false;
  saving  = signal(false);
  lat     = signal<number | null>(null);
  lng     = signal<number | null>(null);

  private map: any;
  private marker: any;
  private familleId: string | null = null;

  // Formulaire réactif
  form = new FormGroup({
    nom_famille:   new FormControl('', Validators.required),
    tel_pere:      new FormControl('', Validators.required),
    tel_mere:      new FormControl(''),
    tel_autre:     new FormControl(''),
    adresse_texte: new FormControl(''),
  });

  ngOnInit(): void {
    // Mode édition : charger les données existantes
    this.familleId = this.route.snapshot.paramMap.get('id');
    if (this.familleId) {
      this.isEdit = true;
      const f = (this.cache.getFamilles() ?? [])
        .find(x => x.id_famille === this.familleId);
      if (f) {
        this.form.patchValue(f);
        this.lat.set(f.latitude ?? null);
        this.lng.set(f.longitude ?? null);
      }
    }
  }

  ngAfterViewInit(): void {
    // Initialisation de la carte Leaflet après le rendu du DOM
    setTimeout(() => this.initMap(), 100);
  }

  private initMap(): void {
    // Centre par défaut : Yaoundé, Cameroun
    const defaultLat = this.lat() ?? 3.848;
    const defaultLng = this.lng() ?? 11.502;

    this.map = L.map('famille-map').setView([defaultLat, defaultLng], 13);

    // Tuiles OpenStreetMap (gratuit, pas de clé API)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    // Si position existante, afficher le marqueur
    if (this.lat() && this.lng()) {
      this.placeMarker(this.lat()!, this.lng()!);
    }

    // Clic sur la carte = placement du marqueur
    this.map.on('click', (e: any) => {
      this.lat.set(e.latlng.lat);
      this.lng.set(e.latlng.lng);
      this.placeMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  private placeMarker(lat: number, lng: number): void {
    if (this.marker) this.map.removeLayer(this.marker);
    this.marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl:    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize:   [25, 41],
        iconAnchor: [12, 41],
      })
    }).addTo(this.map).bindPopup('Position de la maison').openPopup();
  }

  ngOnDestroy(): void {
    // Nettoie la carte pour éviter les fuites mémoire
    if (this.map) this.map.remove();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);

    const famille: Famille = {
      id_famille:    this.familleId ?? `FAM-${Date.now()}`,
      nom_famille:   this.form.value.nom_famille!,
      tel_pere:      this.form.value.tel_pere!,
      tel_mere:      this.form.value.tel_mere ?? '',
      tel_autre:     this.form.value.tel_autre ?? '',
      adresse_texte: this.form.value.adresse_texte ?? '',
      latitude:      this.lat() ?? undefined,
      longitude:     this.lng() ?? undefined,
    };

    if (this.isEdit) {
      // rowIndex inconnu ici — en prod : stocker l'index dans le cache
      await this.data.updateFamille(famille);
    } else {
      await this.data.addFamille(famille);
    }

    this.saving.set(false);
    this.snack.open('Famille enregistrée', 'OK', { duration: 3000 });
    this.router.navigate(['/familles']);
  }
}
