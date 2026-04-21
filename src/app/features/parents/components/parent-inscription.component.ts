// parent-inscription.component.ts — v2
// Wizard 4 étapes : téléphones → famille + carte Leaflet OSM → enfants → validation
// Leaflet, recherche Nominatim, cache wizard localStorage
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormGroup, FormControl, FormArray,
  ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WizardState } from '../../../core/models/parent.models';
import { MapSearchComponent } from '../../../core/services/map/map-search.component';
import { MapService, MapRef, MapMode, NominatimResult } from '../../../core/services/map/map.service';
import { ParentService } from '../../../core/services/parent.service';


const WIZARD_CACHE_KEY = 'inscription_wizard_cache';
// Yaoundé centre — [lat, lng] (ordre Leaflet)
const DEFAULT_LAT  =  3.848;
const DEFAULT_LNG  = 11.502;
const DEFAULT_ZOOM = 14;

@Component({
  selector: 'app-parent-inscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MapSearchComponent],
  styles: [`
    :host { display:block; min-height:100dvh; background:#F0F4F8; }
    .header { background:#185FA5; color:white; padding:16px 20px;
              display:flex; align-items:center; gap:12px; }
    .btn-back { background:none; border:none; color:white; cursor:pointer;
                padding:4px; display:flex; align-items:center; }
    .header-titre { font-size:16px; font-weight:600; flex:1; }
    .btn-vider-cache { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3);
                        color:white; border-radius:8px; padding:5px 10px;
                        font-size:11px; cursor:pointer; }
    .stepper-wrap { background:white; padding:14px 20px 10px;
                    border-bottom:0.5px solid rgba(0,0,0,.08); }
    .stepper { display:flex; align-items:center; }
    .step-dot { width:26px; height:26px; border-radius:50%; flex-shrink:0;
                display:flex; align-items:center; justify-content:center;
                font-size:11px; font-weight:700; transition:all .2s; }
    .step-dot--done   { background:#059669; color:white; }
    .step-dot--active { background:#185FA5; color:white; }
    .step-dot--todo   { background:#E5E7EB; color:#9CA3AF; }
    .step-line { flex:1; height:2px; background:#E5E7EB; margin:0 3px; }
    .step-line--done { background:#059669; }
    .step-labels { display:flex; margin-top:5px; }
    .step-lbl { flex:1; text-align:center; font-size:10px; color:#9CA3AF; }
    .step-lbl--active { color:#185FA5; font-weight:600; }
    .cache-badge { margin:10px 16px 0; background:#EBF3FC;
                   border:1px solid #B5D4F4; border-radius:10px;
                   padding:10px 14px; font-size:12px; color:#0C447C;
                   display:flex; align-items:center; gap:8px; }
    .card { background:white; margin:12px 16px; border-radius:16px; padding:22px;
             box-shadow:0 1px 6px rgba(0,0,0,.07); }
    .card-titre { font-size:16px; font-weight:700; color:#111; margin-bottom:4px; }
    .card-sous  { font-size:13px; color:#9CA3AF; margin-bottom:18px; }
    .field { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
    .row2  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    label  { font-size:12px; font-weight:600; color:#555;
             text-transform:uppercase; letter-spacing:.04em; }
    .fi    { height:46px; padding:0 14px; font-size:14px; width:100%;
             border:1.5px solid #D1D9E6; border-radius:10px; background:white;
             outline:none; color:#111; box-sizing:border-box;
             transition:border-color .15s; }
    .fi:focus { border-color:#185FA5; }
    .fi.err   { border-color:#EF4444; }
    select.fi { cursor:pointer; }
    .err-msg  { font-size:11px; color:#DC2626; }
    .enfant-card { border:1.5px solid #E5E7EB; border-radius:12px;
                   padding:14px; margin-bottom:12px; position:relative; }
    .enfant-num  { font-size:11px; font-weight:700; color:#185FA5;
                   text-transform:uppercase; margin-bottom:10px; }
    .btn-sup-enfant { position:absolute; top:10px; right:10px; width:26px; height:26px;
                       border-radius:50%; background:#FEE2E2; color:#DC2626;
                       border:none; cursor:pointer; font-size:14px;
                       display:flex; align-items:center; justify-content:center; }
    .btn-add-enfant { width:100%; height:42px; border:1.5px dashed #B5D4F4;
                       border-radius:10px; background:#F8FBFF; color:#185FA5;
                       font-size:13px; cursor:pointer; margin-top:4px; }
    .map-wrap { border-radius:12px; overflow:hidden; margin-bottom:8px;
                border:1.5px solid #D1D9E6; position:relative; }
    #inscription-map { height:280px; width:100%; }
    .btn-ma-position { position:absolute; bottom:10px; right:10px; z-index:1000;
                        width:36px; height:36px; background:white; border:none;
                        border-radius:8px; cursor:pointer; font-size:18px;
                        box-shadow:0 2px 8px rgba(0,0,0,.15);
                        display:flex; align-items:center; justify-content:center; }
    .map-coords { background:#F0F4F8; border-radius:8px; padding:8px 12px;
                   font-size:12px; color:#555; display:flex; gap:16px;
                   margin-bottom:6px; }
    .map-coords span { color:#185FA5; font-weight:600; }
    .map-hint { font-size:11px; color:#9CA3AF; display:flex; align-items:center; gap:4px; }
    .nav { display:flex; gap:10px; margin-top:20px; }
    .btn-suiv { flex:1; height:50px; background:#185FA5; color:white; border:none;
                border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; }
    .btn-prec { flex:0 0 auto; width:50px; height:50px; background:white; color:#555;
                border:1.5px solid #D1D9E6; border-radius:12px; cursor:pointer;
                display:flex; align-items:center; justify-content:center; }
    .btn-suiv:disabled { opacity:.45; cursor:default; }
    .recap-row { display:flex; justify-content:space-between; padding:9px 0;
                 border-bottom:0.5px solid #F0F4F8; font-size:13px; }
    .recap-lbl { color:#555; }
    .recap-val { font-weight:600; color:#111; max-width:60%; text-align:right; }
    .recap-section { font-size:10px; font-weight:700; color:#9CA3AF;
                     text-transform:uppercase; letter-spacing:.05em; margin:14px 0 6px; }
    .success { text-align:center; padding:28px 16px; }
    .success-icon  { font-size:52px; margin-bottom:14px; }
    .success-titre { font-size:20px; font-weight:700; color:#059669; margin-bottom:8px; }
    .success-corps { font-size:13px; color:#555; line-height:1.6; }
    .btn-home { margin-top:20px; width:100%; height:50px; background:#185FA5;
                color:white; border:none; border-radius:12px;
                font-size:15px; font-weight:600; cursor:pointer; }
    .sp { display:inline-block; width:14px; height:14px; border-radius:50%;
           border:2px solid rgba(255,255,255,.3); border-top-color:white;
           animation:sp .7s linear infinite; margin-right:6px; }
    @keyframes sp { to { transform:rotate(360deg); } }
  `],
  template: `
<div>
  <div class="header">
    <button class="btn-back" (click)="retour()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="white"/>
      </svg>
    </button>
    <span class="header-titre">{{ soumis() ? 'Demande envoyée' : 'Inscription' }}</span>
    @if (!soumis() && cacheExiste()) {
      <button class="btn-vider-cache" (click)="viderCache()">🗑 Vider brouillon</button>
    }
  </div>

  @if (!soumis()) {

    <div class="stepper-wrap">
      <div class="stepper">
        @for (s of etapes; track s.n; let i = $index) {
          <div class="step-dot"
               [class.step-dot--done]="etape() > s.n"
               [class.step-dot--active]="etape() === s.n"
               [class.step-dot--todo]="etape() < s.n">
            @if (etape() > s.n) { ✓ } @else { {{ s.n }} }
          </div>
          @if (i < etapes.length - 1) {
            <div class="step-line" [class.step-line--done]="etape() > s.n"></div>
          }
        }
      </div>
      <div class="step-labels">
        @for (s of etapes; track s.n) {
          <div class="step-lbl" [class.step-lbl--active]="etape() === s.n">{{ s.lbl }}</div>
        }
      </div>
    </div>

    @if (cacheExiste() && !cacheNotifDismiss()) {
      <div class="cache-badge">
        🕐 Brouillon récupéré — vous pouvez continuer votre inscription.
        <button style="background:none;border:none;color:#185FA5;cursor:pointer;
                        font-size:16px;padding:0;margin-left:auto"
                (click)="cacheNotifDismiss.set(true)">✕</button>
      </div>
    }

    <!-- ═ ÉTAPE 1 ═ -->
    @if (etape() === 1) {
      <div class="card">
        <div class="card-titre">📞 Coordonnées</div>
        <div class="card-sous">Numéros de téléphone de la famille</div>
        <form [formGroup]="fContact">
          <div class="field">
            <label>Téléphone père *</label>
            <input class="fi" [class.err]="fc.tel_pere.invalid && fc.tel_pere.touched"
                   formControlName="tel_pere" type="tel" inputmode="numeric"
                   placeholder="6XX XXX XXX">
            @if (fc.tel_pere.invalid && fc.tel_pere.touched) {
              <div class="err-msg">9 chiffres requis</div>
            }
          </div>
          <div class="field">
            <label>Téléphone mère</label>
            <input class="fi" formControlName="tel_mere" type="tel"
                   inputmode="numeric" placeholder="6XX XXX XXX (optionnel)">
          </div>
          <div class="field">
            <label>Téléphone autre</label>
            <input class="fi" formControlName="tel_autre" type="tel"
                   inputmode="numeric" placeholder="Optionnel">
          </div>
        </form>
        <div class="nav">
          <button class="btn-suiv" (click)="allerEtape(2)" [disabled]="fContact.invalid">
            Suivant →
          </button>
        </div>
      </div>
    }

    <!-- ═ ÉTAPE 2 ═ -->
    @if (etape() === 2) {
      <div class="card">
        <div class="card-titre">🏠 Famille & localisation</div>
        <div class="card-sous">Nom, adresse et position sur la carte</div>
        <form [formGroup]="fFamille">
          <div class="field">
            <label>Nom de la famille *</label>
            <input class="fi" [class.err]="ff.nom_famille.invalid && ff.nom_famille.touched"
                   formControlName="nom_famille" placeholder="ex: MBELLA">
            @if (ff.nom_famille.invalid && ff.nom_famille.touched) {
              <div class="err-msg">Requis</div>
            }
          </div>
          <div class="field">
            <label>Adresse / quartier</label>
            <input class="fi" formControlName="adresse_texte" placeholder="ex: Bastos, Yaoundé">
          </div>
          <div class="row2">
            <div class="field">
              <label>Année scolaire *</label>
              <select class="fi" formControlName="annee_scolaire">
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
          </div>
        </form>

        <div class="field">
          <label>Position sur la carte (optionnel)</label>

          <!-- Recherche Nominatim — autocomplete adresse OSM -->
          <app-map-search
            style="margin-bottom:8px;display:block"
            (resultatChoisi)="onAdresseChoisie($event)">
          </app-map-search>

          <div style="font-size:11px;color:#9CA3AF;margin-bottom:6px">
            Ou cliquez sur la carte / glissez le marqueur 📍
          </div>
          <div class="map-wrap">
            <div id="inscription-map"></div>
            <button class="btn-ma-position" type="button" (click)="centrerSurMoi()"
                    title="Utiliser ma position GPS">📍</button>
          </div>
          @if (lat() !== null) {
            <div class="map-coords">
              Lat : <span>{{ lat()!.toFixed(5) }}</span>
              Lng : <span>{{ lng()!.toFixed(5) }}</span>
            </div>
          }
          <div class="map-hint">ℹ️ La position aide l'école à vous localiser en cas de besoin.</div>
        </div>

        <div class="nav">
          <button class="btn-prec" (click)="allerEtape(1)">←</button>
          <button class="btn-suiv" (click)="allerEtape(3)" [disabled]="fFamille.invalid">
            Suivant →
          </button>
        </div>
      </div>
    }

    <!-- ═ ÉTAPE 3 ═ -->
    @if (etape() === 3) {
      <div class="card">
        <div class="card-titre">👶 Enfants à inscrire</div>
        <div class="card-sous">Renseignez au moins un enfant avec sa classe</div>

        @for (ctrl of enfantsArray.controls; track $index; let i = $index) {
          <div class="enfant-card" [formGroup]="asGroup(ctrl)">
            <div class="enfant-num">Enfant {{ i + 1 }}</div>
            @if (enfantsArray.length > 1) {
              <button class="btn-sup-enfant" type="button"
                      (click)="supprimerEnfant(i)">✕</button>
            }
            <div class="row2">
              <div class="field">
                <label>Nom *</label>
                <input class="fi"
                       [class.err]="ctrl.get('nom')!.invalid && ctrl.get('nom')!.touched"
                       formControlName="nom" placeholder="Nom">
              </div>
              <div class="field">
                <label>Prénom *</label>
                <input class="fi"
                       [class.err]="ctrl.get('prenom')!.invalid && ctrl.get('prenom')!.touched"
                       formControlName="prenom" placeholder="Prénom">
              </div>
            </div>
            <div class="row2">
              <div class="field">
                <label>Date de naissance</label>
                <input class="fi" type="date" formControlName="date_naissance">
              </div>
              <div class="field">
                <label>Sexe</label>
                <select class="fi" formControlName="sexe">
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Classe souhaitée *</label>
              <select class="fi"
                      [class.err]="ctrl.get('id_classe')!.invalid && ctrl.get('id_classe')!.touched"
                      formControlName="id_classe">
                <option value="">— Sélectionner une classe —</option>
                @for (g of classesParCycle(); track g.cycle) {
                  <optgroup [label]="g.cycle">
                    @for (c of g.classes; track c.id_classe) {
                      <option [value]="c.id_classe">{{ c.nom_classe }}</option>
                    }
                  </optgroup>
                }
              </select>
              @if (ctrl.get('id_classe')!.invalid && ctrl.get('id_classe')!.touched) {
                <div class="err-msg">Veuillez choisir une classe</div>
              }
            </div>
          </div>
        }

        <button class="btn-add-enfant" type="button" (click)="ajouterEnfant()">
          + Ajouter un autre enfant
        </button>
        <div class="nav">
          <button class="btn-prec" (click)="allerEtape(2)">←</button>
          <button class="btn-suiv" (click)="allerEtape(4)" [disabled]="enfantsArray.invalid">
            Suivant →
          </button>
        </div>
      </div>
    }

    <!-- ═ ÉTAPE 4 ═ -->
    @if (etape() === 4) {
      <div class="card">
        <div class="card-titre">✅ Récapitulatif</div>
        <div class="card-sous">Vérifiez vos informations avant de soumettre</div>

        <div class="recap-section">Coordonnées</div>
        <div class="recap-row">
          <span class="recap-lbl">Tél. père</span>
          <span class="recap-val">{{ fContact.value.tel_pere }}</span>
        </div>
        @if (fContact.value.tel_mere) {
          <div class="recap-row">
            <span class="recap-lbl">Tél. mère</span>
            <span class="recap-val">{{ fContact.value.tel_mere }}</span>
          </div>
        }
        <div class="recap-section">Famille</div>
        <div class="recap-row">
          <span class="recap-lbl">Nom</span>
          <span class="recap-val">{{ fFamille.value.nom_famille }}</span>
        </div>
        @if (fFamille.value.adresse_texte) {
          <div class="recap-row">
            <span class="recap-lbl">Adresse</span>
            <span class="recap-val">{{ fFamille.value.adresse_texte }}</span>
          </div>
        }
        @if (lat() !== null) {
          <div class="recap-row">
            <span class="recap-lbl">GPS</span>
            <span class="recap-val">{{ lat()!.toFixed(4) }}, {{ lng()!.toFixed(4) }}</span>
          </div>
        }
        <div class="recap-section">Enfants ({{ enfantsArray.length }})</div>
        @for (ctrl of enfantsArray.controls; track $index) {
          <div class="recap-row" style="flex-direction:column;gap:2px;align-items:flex-start">
            <span style="font-weight:600;font-size:13px">
              {{ ctrl.value.nom }} {{ ctrl.value.prenom }}
            </span>
            <span style="font-size:11px;color:#9CA3AF">
              {{ nomClasse(ctrl.value.id_classe) }}
              @if (ctrl.value.sexe) {
                · {{ ctrl.value.sexe === 'M' ? 'Masculin' : 'Féminin' }}
              }
            </span>
          </div>
        }
        <div class="nav">
          <button class="btn-prec" (click)="allerEtape(3)">←</button>
          <button class="btn-suiv" (click)="soumettre()" [disabled]="envoi()">
            @if (envoi()) { <span class="sp"></span> Envoi en cours… }
            @else { Confirmer l'inscription }
          </button>
        </div>
      </div>
    }

  } @else {
    <div class="card">
      <div class="success">
        <div class="success-icon">🎉</div>
        <div class="success-titre">Demande envoyée !</div>
        <div class="success-corps">
          Votre inscription a bien été reçue.<br>
          Un administrateur validera vos informations sous
          <strong>24 à 48 heures</strong>.
        </div>
        <button class="btn-home" (click)="retour()">Retour à l'accueil</button>
      </div>
    </div>
  }
</div>
  `
})
export class ParentInscriptionComponent implements OnInit, AfterViewInit, OnDestroy {

  private svc = inject(ParentService);
  private ms  = inject(MapService);    // ← service centralisé Leaflet
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  etape  = signal<1|2|3|4>(1);
  soumis = signal(false);
  envoi  = signal(false);
  lat    = signal<number|null>(null);
  lng    = signal<number|null>(null);
  cacheExiste       = signal(false);
  cacheNotifDismiss = signal(false);

  etapes = [
    {n:1, lbl:'Tél.'},
    {n:2, lbl:'Famille'},
    {n:3, lbl:'Enfants'},
    {n:4, lbl:'Valider'},
  ];

  // ── Formulaires ────────────────────────────────────────────────
  fContact = new FormGroup({
    tel_pere:  new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]),
    tel_mere:  new FormControl(''),
    tel_autre: new FormControl(''),
  });
  fFamille = new FormGroup({
    nom_famille:    new FormControl('', Validators.required),
    adresse_texte:  new FormControl(''),
    annee_scolaire: new FormControl('2025-2026', Validators.required),
  });
  enfantsArray = new FormArray<FormGroup>([this.creerGroupeEnfant()]);

  get fc() { return this.fContact.controls; }
  get ff() { return this.fFamille.controls; }
  asGroup(ctrl: any): FormGroup { return ctrl as FormGroup; }

  // ── Classes ────────────────────────────────────────────────────
  private _classes = signal<{id_classe:string; nom_classe:string; cycle:string}[]>([]);

  classesParCycle = computed(() => {
    const map = new Map<string,{id_classe:string;nom_classe:string;cycle:string}[]>();
    this._classes().forEach(c => {
      if (!map.has(c.cycle)) map.set(c.cycle, []);
      map.get(c.cycle)!.push(c);
    });
    return [...map.entries()].map(([cycle, classes]) => ({cycle, classes}));
  });

  nomClasse(id: string): string {
    return this._classes().find(c => c.id_classe === id)?.nom_classe ?? id ?? '—';
  }

  // ── Références carte — gérées par MapService ─────────────────
  // Référence carte — gérée par MapService
  private ref:    MapRef | null = null;
  private marker: any = null;           // marqueur formulaire draggable

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit(): void {
    this.chargerClasses();
    this.restaurerCache();
  }

  ngAfterViewInit(): void {
    if (this.etape() === 2) setTimeout(() => this.initMap(), 150);
  }

  ngOnDestroy(): void { this.ms.detruire(this.ref); }

  // ── Classes (chargement depuis Sheets) ─────────────────────────
  private async chargerClasses(): Promise<void> {
    try {
      const raw = await this.svc.sheets.fetchRaw('F3_CLASSES');
      if (!raw?.length) return;
      this._classes.set(
        raw.slice(1).filter(r => r[0]).map(r => ({
          id_classe:  String(r[0] ?? ''),
          nom_classe: String(r[1] ?? ''),
          cycle:      String(r[3] ?? 'secondaire'),
        }))
      );
      this.cdr.markForCheck();
    } catch { /* hors ligne */ }
  }

  // ── Cache wizard ───────────────────────────────────────────────
  private sauvegarderCache(): void {
    const data = {
      etape:   this.etape(),
      contact: this.fContact.value,
      famille: this.fFamille.value,
      enfants: this.enfantsArray.value,
      lat:     this.lat(),
      lng:     this.lng(),
    };
    localStorage.setItem(WIZARD_CACHE_KEY, JSON.stringify(data));
    this.cacheExiste.set(true);
  }

  private restaurerCache(): void {
    try {
      const raw = localStorage.getItem(WIZARD_CACHE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.cacheExiste.set(true);
      if (s.contact) this.fContact.patchValue(s.contact);
      if (s.famille) this.fFamille.patchValue(s.famille);
      if (s.lat != null) this.lat.set(s.lat);
      if (s.lng != null) this.lng.set(s.lng);
      if (Array.isArray(s.enfants) && s.enfants.length) {
        while (this.enfantsArray.length < s.enfants.length) {
          this.enfantsArray.push(this.creerGroupeEnfant());
        }
        s.enfants.forEach((e: any, i: number) => this.enfantsArray.at(i).patchValue(e));
      }
      if (s.etape >= 1 && s.etape <= 4) this.etape.set(s.etape);
    } catch { localStorage.removeItem(WIZARD_CACHE_KEY); }
  }

  viderCache(): void {
    if (!confirm('Effacer le brouillon et recommencer depuis le début ?')) return;
    localStorage.removeItem(WIZARD_CACHE_KEY);
    this.cacheExiste.set(false);
    this.cacheNotifDismiss.set(false);
    this.fContact.reset();
    this.fFamille.patchValue({annee_scolaire: '2025-2026'});
    this.enfantsArray.clear();
    this.enfantsArray.push(this.creerGroupeEnfant());
    this.lat.set(null);
    this.lng.set(null);
    this.etape.set(1);
  }

  // ── Navigation ─────────────────────────────────────────────────
  allerEtape(n: 1|2|3|4): void {
    this.etape.set(n);
    this.sauvegarderCache();
    if (n === 2) setTimeout(() => this.initMap(), 150);
    window.scrollTo({top:0, behavior:'smooth'});
    this.cdr.markForCheck();
  }

  retour(): void { this.router.navigate(['/espace-parent/login']); }

  // ── Enfants ────────────────────────────────────────────────────
  private creerGroupeEnfant(): FormGroup {
    return new FormGroup({
      nom:            new FormControl('', Validators.required),
      prenom:         new FormControl('', Validators.required),
      date_naissance: new FormControl(''),
      sexe:           new FormControl(''),
      id_classe:      new FormControl('', Validators.required),
    });
  }

  ajouterEnfant(): void {
    this.enfantsArray.push(this.creerGroupeEnfant());
    this.sauvegarderCache();
  }

  supprimerEnfant(i: number): void {
    this.enfantsArray.removeAt(i);
    this.sauvegarderCache();
  }

  // ── Carte Leaflet (mode FORM) — délégué à MapService ─────────
  private initMap(): void {
    // Si la carte existe déjà (retour à l'étape 2), force un resize
    if (this.ref) { setTimeout(() => this.ms.invaliderTaille(this.ref!), 100); return; }

    const lat0 = this.lat() ?? DEFAULT_LAT;
    const lng0 = this.lng() ?? DEFAULT_LNG;

    // Mode FORM : zoom actif, scroll désactivé (mobile dans un formulaire)
    this.ref = this.ms.creerCarte(
      'inscription-map', MapMode.FORM, [lat0, lng0], DEFAULT_ZOOM,
    );

    // Marqueur formulaire draggable + clic carte → met à jour les coordonnées
    this.marker = this.ms.creerMarqueurFormulaire(
      this.ref,
      [lat0, lng0],
      (lat, lng) => {
        this.lat.set(lat);
        this.lng.set(lng);
        this.sauvegarderCache();
        this.cdr.markForCheck();
      },
    );

    // Coordonnées initiales si pas encore de valeur
    if (this.lat() === null) {
      this.lat.set(+lat0.toFixed(6));
      this.lng.set(+lng0.toFixed(6));
    }
  }

  // ── Géolocalisation GPS — délégué au service ─────────────────
  centrerSurMoi(): void {
    this.ms.obtenirPosition(6000).then(([lat, lng]) => {
      this.lat.set(lat);
      this.lng.set(lng);
      this.ms.centrer(this.ref!, [lat, lng], 16);
      this.ms.deplacerMarqueur(this.marker, [lat, lng]);
      this.sauvegarderCache();
      this.cdr.markForCheck();
    }).catch(() => {
      // Permission refusée ou timeout — silencieux
    });
  }

  // ── Recherche Nominatim — centre la carte sur le résultat ─────
  onAdresseChoisie(r: NominatimResult): void {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    this.lat.set(lat);
    this.lng.set(lng);
    if (this.ref) {
      this.ms.centrer(this.ref, [lat, lng], 16);
      this.ms.deplacerMarqueur(this.marker, [lat, lng]);
    }
    // Pré-remplit l'adresse textuelle si encore vide
    if (!this.fFamille.value.adresse_texte) {
      this.fFamille.patchValue({ adresse_texte: this.ms.formaterResultat(r) });
    }
    this.sauvegarderCache();
    this.cdr.markForCheck();
  }

  // ── Soumission ─────────────────────────────────────────────────
  async soumettre(): Promise<void> {
    this.envoi.set(true);
    const idFamille = `FAM-TMP-${Date.now()}`;

    const wizard: WizardState = {
      etape: 4,
      famille: {
        id_famille:           idFamille,
        nom_famille:          this.fFamille.value.nom_famille ?? '',
        tel_pere:             this.fContact.value.tel_pere ?? '',
        tel_mere:             this.fContact.value.tel_mere ?? '',
        tel_autre:            this.fContact.value.tel_autre ?? '',
        adresse_texte:        this.fFamille.value.adresse_texte ?? '',
        annee_scolaire:       this.fFamille.value.annee_scolaire ?? '',
        latitude:             this.lat() ?? undefined,
        longitude:            this.lng() ?? undefined,
        date_enregistrement:  new Date().toISOString(),
        statut_validation:    'en_attente',
      },
      eleves: this.enfantsArray.value.map((e:any, i:number) => ({
        id_eleve:            `ELV-TMP-${Date.now()}-${i}`,
        id_famille:          idFamille,
        id_classe:           e.id_classe ?? '',
        nom:                 e.nom ?? '',
        prenom:              e.prenom ?? '',
        date_naissance:      e.date_naissance ?? '',
        sexe:                e.sexe ?? '',
        statut:              'actif' as const,
        date_enregistrement: new Date().toISOString(),
        statut_validation:   'en_attente' as const,
      })),
      pension: {
        id:                    `PEN-TMP-${Date.now()}`,
        id_famille:            idFamille,
        annee_scolaire:        this.fFamille.value.annee_scolaire ?? '',
        montant_total_attendu: 0,
        montant_reduction:     0,
        commentaire:           '',
        date_enregistrement:   new Date().toISOString(),
        statut_validation:     'en_attente',
      },
    };

    const ok = await this.svc.soumettreInscription(wizard);
    this.envoi.set(false);

    if (ok) {
      // Vidage automatique du cache après envoi réussi
      localStorage.removeItem(WIZARD_CACHE_KEY);
      this.cacheExiste.set(false);
      this.soumis.set(true);
    }
  }
}