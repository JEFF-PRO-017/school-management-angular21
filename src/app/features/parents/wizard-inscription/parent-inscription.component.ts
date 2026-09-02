// parent-inscription.component.ts — v3 (refactor Bootstrap + sous-composants)
// Wizard 4 étapes : téléphones → famille + carte → enfants → validation
// Ce fichier ne fait plus que de l'ORCHESTRATION :
//  - il détient les formulaires, l'état du wizard et le cache localStorage
//  - chaque étape visuelle est déléguée à son propre composant (dossier /steps)
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';


import { WizardStepperComponent, EtapeWizard } from './wizard-stepper.component';
import { EtapeContactComponent } from './steps/etape-contact.component';
import { EtapeFamilleComponent } from './steps/etape-famille.component';
import { EtapeEnfantsComponent, GroupeCycle } from './Leaflet/etape-enfants.component';
import { EtapeSuccesComponent } from './soumission/etape-succes.component';
import { EtapeRecapComponent, EnfantRecap } from './enfants/etape-recap.component';
import { Eleve, Famille } from '../../../core/models';
import { AddServices, H, SHEET, toRow } from '../../../core/services/@data';
import { GoogleSheetsService, RowConfig } from '../../../core/services/@google-sheets/google-sheets.service';

export interface WizardState {
  etape: 1 | 2 | 3 | 4;
  famille: Famille;
  eleves: Eleve[];
}
const WIZARD_CACHE_KEY = 'inscription_wizard_cache';

@Component({
  selector: 'app-parent-inscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WizardStepperComponent, EtapeContactComponent, EtapeFamilleComponent,
    EtapeEnfantsComponent, EtapeRecapComponent, EtapeSuccesComponent,
  ],
  template: `
    <div class="min-vh-100 bg-light-subtle">

      <!-- En-tête -->
      <div class="bg-primary text-white d-flex align-items-center gap-2 px-3 py-3">
        <button class="btn btn-link text-white p-0" (click)="retour()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="white"/>
          </svg>
        </button>
        <span class="fw-semibold flex-fill">{{ soumis() ? 'Demande envoyée' : 'Inscription' }}</span>
        @if (!soumis() && cacheExiste()) {
          <button class="btn btn-sm btn-outline-light" (click)="viderCache()">🗑 Vider brouillon</button>
        }
      </div>

      @if (!soumis()) {

        <!-- Barre de progression -->
        <app-wizard-stepper [etapes]="etapes" [etapeActuelle]="etape()" />

        <!-- Bandeau brouillon restauré -->
        @if (cacheExiste() && !cacheNotifDismiss()) {
          <div class="alert alert-info d-flex align-items-center gap-2 mx-3 mt-3 mb-0">
            🕐 Brouillon récupéré — vous pouvez continuer votre inscription.
            <button class="btn-close ms-auto" (click)="cacheNotifDismiss.set(true)"></button>
          </div>
        }

        <!-- Étape 1 : téléphones -->
        @if (etape() === 1) {
          <app-etape-contact [form]="fContact" (suivant)="allerEtape(2)" />
        }

        <!-- Étape 2 : famille + carte -->
        @if (etape() === 2) {
          <app-etape-famille
            [form]="fFamille" [lat]="lat()" [lng]="lng()"
            (positionChange)="onPositionChange($event)"
            (precedent)="allerEtape(1)"
            (suivant)="allerEtape(3)" />
        }

        <!-- Étape 3 : enfants -->
        @if (etape() === 3) {
          <app-etape-enfants
            [enfants]="enfantsArray" [classesParCycle]="classesParCycle()"
            (changed)="sauvegarderCache()"
            (precedent)="allerEtape(2)"
            (suivant)="allerEtape(4)" />
        }

        <!-- Étape 4 : récapitulatif -->
        @if (etape() === 4) {
          <app-etape-recap
            [telPere]="fContact.value.tel_pere ?? ''"
            [telMere]="fContact.value.tel_mere ?? ''"
            [nomFamille]="fFamille.value.nom_famille ?? ''"
            [adresseTexte]="fFamille.value.adresse_texte ?? ''"
            [lat]="lat()" [lng]="lng()"
            [enfants]="enfantsRecap()"
            [nomClasse]="nomClasse"
            [envoi]="envoi()"
            (precedent)="allerEtape(3)"
            (soumettre)="soumettre()" />
        }

      } @else {
        <!-- Écran de succès -->
        <app-etape-succes (retour)="retour()" />
      }
    </div>
  `,
})
export class ParentInscriptionComponent implements OnInit {

  private router = inject(Router);
  private add = inject(AddServices)
  private sheets = inject(GoogleSheetsService);

  // ── État global du wizard ──────────────────────────────────────
  etape = signal<1 | 2 | 3 | 4>(1);
  soumis = signal(false);
  envoi = signal(false);
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);
  cacheExiste = signal(false);
  cacheNotifDismiss = signal(false);

  etapes: EtapeWizard[] = [
    { n: 1, lbl: 'Tél.' },
    { n: 2, lbl: 'Famille' },
    { n: 3, lbl: 'Enfants' },
    { n: 4, lbl: 'Valider' },
  ];

  // ── Formulaires (détenus ici, transmis aux étapes en @Input) ───
  fContact = new FormGroup({
    tel_pere: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]),
    tel_mere: new FormControl(''),
    tel_autre: new FormControl(''),
  });
  fFamille = new FormGroup({
    nom_famille: new FormControl('', Validators.required),
    adresse_texte: new FormControl(''),
  });
  enfantsArray = new FormArray<FormGroup>([this.creerGroupeEnfant()]);

  // Valeurs des enfants formatées pour l'étape récap (recalculé à chaque lecture)
  enfantsRecap = computed<EnfantRecap[]>(() => this.enfantsArray.value as EnfantRecap[]);

  // ── Classes disponibles (chargées depuis Sheets) ────────────────
  private _classes = signal<{ id_classe: string; nom_classe: string; cycle: string }[]>([]);

  classesParCycle = computed<GroupeCycle[]>(() => {
    const map = new Map<string, GroupeCycle['classes']>();
    this._classes().forEach(c => {
      if (!map.has(c.cycle)) map.set(c.cycle, []);
      map.get(c.cycle)!.push(c);
    });
    return [...map.entries()].map(([cycle, classes]) => ({ cycle, classes }));
  });

  nomClasse = (id: string): string =>
    this._classes().find(c => c.id_classe === id)?.nom_classe ?? id ?? '—';

  // ── Cycle de vie ──────────────────────────────────────────────
  ngOnInit(): void {
    this.chargerClasses();
    this.restaurerCache();
  }

  private async chargerClasses(): Promise<void> {
    try {
      const raw = await this.sheets.fetchRaw('F3_CLASSES');
      if (!raw?.length) return;
      this._classes.set(
        raw.slice(1).filter(r => r[0]).map(r => ({
          id_classe: String(r[0] ?? ''),
          nom_classe: String(r[1] ?? ''),
          cycle: String(r[3] ?? 'secondaire'),
        }))
      );
    } catch { /* hors ligne : on continue sans liste de classes */ }
  }

  // ── Cache wizard (brouillon local) ──────────────────────────────
  sauvegarderCache(): void {
    const data = {
      etape: this.etape(),
      contact: this.fContact.value,
      famille: this.fFamille.value,
      enfants: this.enfantsArray.value,
      lat: this.lat(),
      lng: this.lng(),
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
    this.enfantsArray.clear();
    this.enfantsArray.push(this.creerGroupeEnfant());
    this.lat.set(null);
    this.lng.set(null);
    this.etape.set(1);
  }

  // ── Navigation entre étapes ──────────────────────────────────────
  allerEtape(n: 1 | 2 | 3 | 4): void {
    this.etape.set(n);
    this.sauvegarderCache();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retour(): void {
    this.router.navigate(['/espace-parent/login']);
  }

  // ── Enfants ────────────────────────────────────────────────────
  private creerGroupeEnfant(): FormGroup {
    return new FormGroup({
      nom: new FormControl('', Validators.required),
      prenom: new FormControl('', Validators.required),
      date_naissance: new FormControl(''),
      sexe: new FormControl(''),
      id_classe: new FormControl('', Validators.required),
    });
  }

  // ── Position GPS remontée par l'étape "famille" ─────────────────
  onPositionChange(pos: { lat: number; lng: number }): void {
    this.lat.set(pos.lat);
    this.lng.set(pos.lng);
    this.sauvegarderCache();
  }

  // ── Soumission finale ────────────────────────────────────────────
  async soumettre(): Promise<void> {
    try {
      
      this.envoi.set(true);
      const idFamille = `FAM-TMP-${Date.now()}`;
      const f: Famille = {
        id_famille: idFamille,
        nom_famille: this.fFamille.value.nom_famille ?? '',
        tel_pere: this.fContact.value.tel_pere ?? '',
        tel_mere: this.fContact.value.tel_mere ?? '',
        tel_autre: this.fContact.value.tel_autre ?? '',
        adresse_texte: this.fFamille.value.adresse_texte ?? '',
        latitude: this.lat() ?? undefined,
        longitude: this.lng() ?? undefined,
        status: 'NON-ACTIF'
      }
      const es: Eleve[] = this.enfantsArray.value.map((e: any, i: number) => ({
        id_eleve: `ELV-TMP-${Date.now()}-${i}`,
        id_famille: idFamille,
        id_classe: e.id_classe ?? '',
        nom: e.nom ?? '',
        prenom: e.prenom ?? '',
        date_naissance: e.date_naissance ?? '',
        lieu_naissance: '',
        date_inscription: new Date().toISOString(),
        sexe: e.sexe ?? '',
        statut: 'NON-ACTIF',
        matricule: '',
        verifie: false,
      }))

      const fconfig: RowConfig = {
        sheetName: SHEET.familles,
        rowData: toRow(f, H.familles)
      };
      await this.sheets.addRow(fconfig);

      for (const e of es) {
        const ec: RowConfig = {
          sheetName: SHEET.eleves,
          rowData: toRow(e, H.eleves)
        };
        await this.sheets.addRow(ec);
      }
      this.envoi.set(false);
      localStorage.removeItem(WIZARD_CACHE_KEY);
      this.cacheExiste.set(false);
      this.soumis.set(true);
    } catch (error) {
      console.error('Erreur lors de la soumission :', error);
      this.envoi.set(false);
      alert('Une erreur est survenue lors de la soumission. Veuillez réessayer.');
    }
  }
}