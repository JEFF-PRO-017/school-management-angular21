// ─────────────────────────────────────────────────────────────────
// familles-list.component.ts
// CORRECTIONS :
//  - Pas d'arrow functions dans le template (=> interdit)
//  - Pas d'expression complexe dans {{ }} (ternaires avec appels)
//  - showFiltres.update() → toggleFiltres() méthode simple
//  - filtreClasse.set() / filtreEtat.set() / filtreEnfants.set()
//    → méthodes setClasse() / setEtat() / setEnfants()
//  - Résumé config → computed() dans le TS, pas dans le template
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Famille, Paiement } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData } from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData } from '../famille-form/famille-modal.component';


type FiltreEtat = 'tous' | 'solde' | 'sans-gps';
type FiltreEnfants = 0 | 1 | 2 | 3;

@Component({
  selector: 'app-familles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ══ BARRE PRINCIPALE ══ -->
  <div class="bl-bar">

    <input [formControl]="search" placeholder="Nom, téléphone…" class="bl-input">

    <span class="bl-sep"></span>

    <!-- Résumé filtres actifs — calculé dans le TS via computed() -->
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ resumeTitre() }}</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <!-- Bouton Filtres — méthode simple sans arrow function -->
    <button class="bl-btn bl-btn--outline" (click)="toggleFiltres()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor"
              stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Filtres
    </button>

    <a routerLink="/familles/carte" class="bl-btn bl-btn--outline">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
              stroke="currentColor" stroke-width="1.3"/>
        <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      Carte
    </a>

    <span class="bl-sep"></span>

    <button class="bl-btn bl-btn--primary" (click)="ouvrirModalFamille(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvelle famille
    </button>
  </div>

  <!-- ══ BARRE CHIPS FILTRES ══ -->
  @if (showFiltres()) {
    <div class="bl-chips-bar">

      <span class="bl-chips-lbl">État</span>
      @for (opt of optsEtat; track opt.val) {
        <!-- setEtat() — méthode TS, pas de signal.set() dans template -->
        <button class="bl-chip" [class.bl-chip--on]="filtreEtat() === opt.val"
                (click)="setEtat(opt.val)">{{ opt.lbl }}</button>
      }

      <span class="bl-sep"></span>

      <span class="bl-chips-lbl">Classe</span>
      <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === ''"
              (click)="setClasse('')">Toutes</button>
      @for (c of classesDispos(); track c.id) {
        <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === c.id"
                (click)="setClasse(c.id)">{{ c.nom }}</button>
      }

      <span class="bl-sep"></span>

      <span class="bl-chips-lbl">Enfants</span>
      @for (opt of optsEnfants; track opt.val) {
        <button class="bl-chip" [class.bl-chip--on]="filtreEnfants() === opt.val"
                (click)="setEnfants(opt.val)">{{ opt.lbl }}</button>
      }
    </div>
  }

  <!-- ══ TABLEAU ══ -->
  @if (filtered().length > 0) {
    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="text-align:left">Famille</th>
            <th class="bl-th">Téléphones</th>
            <th class="bl-th">Enfants</th>
            <th class="bl-th">Pension</th>
            <th class="bl-th">Versé</th>
            <th class="bl-th bl-th--trim">Restant</th>
            <th class="bl-th">Prochain RDV</th>
            <th class="bl-th">GPS</th>
            <th class="bl-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (f of filtered(); track f.id_famille) {
            <tr class="bl-tr">

              <!-- Nom + avatar -->
              <td class="bl-td bl-td--name">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="bl-av"
                       [style.background]="avBg(f.id_famille)"
                       [style.color]="avTxt(f.id_famille)">
                    {{ initiales(f.nom_famille) }}
                  </div>
                  <span>{{ f.nom_famille }}</span>
                </div>
              </td>

              <!-- Téléphones -->
              <td class="bl-td bl-td--center" style="font-size:11px;color:#666">
                <div>{{ f.tel_pere || '—' }}</div>
                @if (f.tel_mere) {
                  <div style="color:#aaa">{{ f.tel_mere }}</div>
                }
              </td>

              <!-- Enfants + classes -->
              <td class="bl-td bl-td--center">
                <!-- nbEnfantsLabel() appelé avec objet pour éviter double appel -->
                <span class="bl-mention bl-mention--ok">
                  {{ nbEnfantsLabel(f) }}
                </span>
                @if (classesEnfants(f).length > 0) {
                  <div style="font-size:10px;color:#aaa;margin-top:2px">
                    {{ classesEnfants(f).join(', ') }}
                  </div>
                }
              </td>

              <!-- Pension attendue -->
              <td class="bl-td bl-td--center" style="font-size:12px;color:#555">
                {{ fmt(montantAttendu(f)) }}
              </td>

              <!-- Versé -->
              <td class="bl-td bl-td--center"
                  style="font-size:12px;font-weight:500"
                  [class.bl-ok]="isSolde(f)">
                {{ fmt(totalVerse(f)) }}
              </td>

              <!-- Restant — colonne accentuée -->
              <td class="bl-td bl-td--center bl-td--trim"
                  [class.bl-ok]="isOk(f)"
                  [class.bl-bad]="aDette(f)">
                @if (isOk(f)) {
                  <span class="bl-mention bl-mention--ok">Soldé ✓</span>
                } @else if (aDette(f)) {
                  <span class="bl-mention bl-mention--warn">{{ fmt(restant(f)) }}</span>
                } @else {
                  <span style="color:#bbb">—</span>
                }
              </td>

              <!-- Prochain RDV -->
              <td class="bl-td bl-td--center">
                @if (prochainRdv(f)) {
                  <span class="bl-mention bl-mention--warn"
                        style="cursor:pointer"
                        title="Enregistrer un paiement"
                        (click)="ouvrirModalPaiement(f)">
                    {{ prochainRdv(f) }}
                  </span>
                } @else {
                  <span style="color:#bbb;font-size:11px">—</span>
                }
              </td>

              <!-- GPS -->
              <td class="bl-td bl-td--center">
                @if (f.latitude && f.longitude) {
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
                          stroke="#0F6E56" stroke-width="1.3" fill="#9FE1CB"/>
                    <circle cx="8" cy="6" r="1.5"
                            stroke="#0F6E56" stroke-width="1.2"/>
                  </svg>
                } @else {
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
                          stroke="#ccc" stroke-width="1.3" fill="#f0f0f0"/>
                    <circle cx="8" cy="6" r="1.5"
                            stroke="#ccc" stroke-width="1.2"/>
                  </svg>
                }
              </td>

              <!-- Actions -->
              <td class="bl-td bl-td--center">
                <div style="display:flex;gap:4px;justify-content:center">
                   <!-- voir le detail de la famille? -->
                  <button [routerLink]="['/familles', f.id_famille]" class="bl-icon-btn" title="voir la famille">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                        <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                  </button>

                  <!-- Payer pension -->
                  <button class="bl-icon-btn" title="Payer pension"
                          [class.bl-icon-btn--warn]="aDette(f)"
                          (click)="ouvrirModalPaiement(f)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="4" width="14" height="9" rx="1.5"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
                      <circle cx="5" cy="10" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  <!-- Modifier famille -->
                  <button class="bl-icon-btn" title="Modifier"
                          (click)="ouvrirModalFamille(f)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>

                  <!-- Ajouter élève -->
                  <button class="bl-icon-btn" title="Ajouter un élève"
                          (click)="ouvrirModalEleve(f)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="6" r="3"
                              stroke="currentColor" stroke-width="1.3"/>
                      <path d="M1 13c0-2.5 2.5-4 6-4M13 10v4M11 12h4"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round"/>
                    </svg>
                  </button>

                  <!-- Supprimer -->
                  <button class="bl-icon-btn bl-icon-btn--del" title="Supprimer"
                          (click)="confirmerSuppression(f)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round"/>
                    </svg>
                  </button>

                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ══ PIED ══ -->
    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ filtered().length }} famille(s) · {{ totalEleves() }} élève(s) · {{ anneeScolaire }}
      </span>
      <span class="bl-foot-info">
        Attendu : {{ fmt(totalAttenduGlobal()) }} FCFA
        · Versé : {{ fmt(totalVerseGlobal()) }} FCFA
        · Restant :
        <span [class]="totalRestantGlobal() > 0 ? 'bl-bad' : 'bl-ok'"
              style="font-weight:500">
          {{ fmt(totalRestantGlobal()) }} FCFA
        </span>
      </span>
    </div>

  } @else if (hasFiltre()) {
    <div class="bl-empty">Aucune famille ne correspond à ces critères</div>
  } @else {
    <div class="bl-empty">
      Aucune famille enregistrée —
      <span style="color:#185FA5;cursor:pointer"
            (click)="ouvrirModalFamille(null)">
        créer la première
      </span>
    </div>
  }

</div>
  `,
  styles: [`
    .bl-host  { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar   { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                padding-bottom:12px;
                border-bottom:0.5px solid rgba(0,0,0,.09); }

    .bl-input { height:32px; padding:0 10px; font-size:13px;
                border:0.5px solid rgba(0,0,0,.18); border-radius:6px;
                background:white; outline:none; width:180px; }
    .bl-input:focus { border-color:#185FA5; }

    .bl-sep { width:0.5px; height:20px; background:rgba(0,0,0,.1); }

    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px;
              font-size:13px; cursor:pointer;
              display:inline-flex; align-items:center; gap:5px;
              transition:opacity .1s; text-decoration:none;
              white-space:nowrap; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn--outline { background:white; color:#333;
                       border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:not(:disabled):hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:not(:disabled):hover { opacity:.88; }

    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:26px; padding:0 10px; border-radius:6px;
                    font-size:11px; cursor:pointer;
                    border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }

    .bl-av { width:28px; height:28px; border-radius:50%; flex-shrink:0;
             display:flex; align-items:center; justify-content:center;
             font-size:10px; font-weight:600; }

    .bl-table-wrap { overflow-x:auto;
                     border:0.5px solid rgba(0,0,0,.09); border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th    { padding:7px 10px; font-weight:500; font-size:11px;
                background:#f8f8f8; color:#666;
                border-bottom:0.5px solid rgba(0,0,0,.08);
                text-align:center; white-space:nowrap; }
    .bl-th--trim { background:#EBF3FC; color:#0C447C; }
    .bl-td       { padding:7px 10px;
                   border-bottom:0.5px solid rgba(0,0,0,.05);
                   vertical-align:middle; }
    .bl-td--name   { font-weight:500; }
    .bl-td--center { text-align:center; }
    .bl-td--trim   { background:#EBF3FC; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td    { background:rgba(0,0,0,.015); }

    .bl-ok  { color:#0F6E56; font-weight:500; }
    .bl-bad { color:#993C1D; font-weight:500; }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }

    .bl-icon-btn { width:28px; height:28px; padding:0;
                   border:0.5px solid rgba(0,0,0,.12);
                   background:white; cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555;
                   transition:background .1s; }
    .bl-icon-btn:hover          { background:#EBF3FC; color:#185FA5;
                                   border-color:#B5D4F4; }
    .bl-icon-btn--warn          { border-color:#F5C4B3; color:#D85A30; }
    .bl-icon-btn--warn:hover    { background:#FAECE7; color:#D85A30;
                                   border-color:#F0997B; }
    .bl-icon-btn--del:hover     { background:#FCEBEB; color:#A32D2D;
                                   border-color:#F09595; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px;
                    color:#ccc; font-size:13px; }
  `],
})
export class FamillesListComponent implements OnInit {

  private cache = inject(CacheService);
  private data = inject(DataService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  search = new FormControl('');
  filtreEtat = signal<FiltreEtat>('tous');
  filtreClasse = signal('');
  filtreEnfants = signal<FiltreEnfants>(0);
  showFiltres = signal(true);

  anneeScolaire = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  optsEtat: { val: FiltreEtat; lbl: string }[] = [
    { val: 'tous', lbl: 'Toutes' },
    { val: 'solde', lbl: 'Solde dû' },
    { val: 'sans-gps', lbl: 'Sans GPS' },
  ];

  optsEnfants: { val: FiltreEnfants; lbl: string }[] = [
    { val: 0, lbl: 'Tous' },
    { val: 1, lbl: '1' },
    { val: 2, lbl: '2' },
    { val: 3, lbl: '3+' },
  ];

  private palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' },
    { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' },
    { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#E0F2F1', txt: '#00695C' },
  ];

  ngOnInit(): void {
    this.cache.getClasses();
    this.search.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  // ── Résumé filtres pour la barre — computed() dans le TS
  //    Interdit dans {{ }} du template : ternaires imbriqués + appels de méthodes
  resumeTitre = computed<string>(() => {
    const e = this.filtreEtat();
    if (e === 'solde') return 'Avec solde dû';
    if (e === 'sans-gps') return 'Sans GPS';
    return 'Toutes les familles';
  });

  resumeSous = computed<string>(() => {
    const c = this.filtreClasse();
    const nb = this.filtreEnfants();
    const cls = c ? this.nomClasse(c) : 'Toutes classes';
    // Recherche sans arrow function dans le template
    const enf = this.optsEnfants.find(o => o.val === nb)?.lbl ?? 'Tous';
    return `${cls} · ${enf}`;
  });

  // ── Vrai si un filtre autre que défaut est actif ──
  hasFiltre(): boolean {
    return !!(this.search.value)
      || this.filtreEtat() !== 'tous'
      || this.filtreClasse() !== ''
      || this.filtreEnfants() !== 0;
  }

  // ── Setters des filtres — méthodes simples, appelables depuis le template ──
  // (signal.set() et signal.update() avec lambda => sont INTERDITS dans template)
  toggleFiltres(): void { this.showFiltres.set(!this.showFiltres()); }
  setEtat(v: FiltreEtat): void { this.filtreEtat.set(v); }
  setClasse(v: string): void { this.filtreClasse.set(v); }
  setEnfants(v: FiltreEnfants): void { this.filtreEnfants.set(v); }

  // ── Classes disponibles pour les chips ──
  classesDispos = computed(() => {
    const cMap = this.cache.classesMap();
    const ids = new Set((this.cache.getEleves() ?? []).map(e => e.id_classe));
    return [...ids]
      .map(id => ({ id, nom: cMap.get(id)?.nom_classe ?? id }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  // ── Liste filtrée ──
  filtered = computed(() => {
    const q = (this.search.value ?? '').toLowerCase();
    const etat = this.filtreEtat();
    const classe = this.filtreClasse();
    const nbEnf = this.filtreEnfants();

    return (this.cache.getFamilles() ?? []).filter(f => {
      if (q && !f.nom_famille.toLowerCase().includes(q)
        && !f.tel_pere?.includes(q)
        && !f.tel_mere?.includes(q)) return false;
      if (etat === 'solde' && !this.aDette(f)) return false;
      if (etat === 'sans-gps' && !!(f.latitude && f.longitude)) return false;
      if (classe && !(f.eleves ?? []).some(e => e.id_classe === classe)) return false;
      const nb = this.nbEnfants(f);
      if (nbEnf === 1 && nb !== 1) return false;
      if (nbEnf === 2 && nb !== 2) return false;
      if (nbEnf === 3 && nb < 3) return false;
      return true;
    });
  });

  // ── Totaux pied ──
  totalEleves = computed(() => this.filtered().reduce((s, f) => s + this.nbEnfants(f), 0));
  totalAttenduGlobal = computed(() => this.filtered().reduce((s, f) => s + this.montantAttendu(f), 0));
  totalVerseGlobal = computed(() => this.filtered().reduce((s, f) => s + this.totalVerse(f), 0));
  totalRestantGlobal = computed(() => Math.max(0, this.totalAttenduGlobal() - this.totalVerseGlobal()));

  // ── Helpers données ──

  nbEnfants(f: Famille): number { return (f.eleves ?? []).length; }

  // Label complet ex: "2 élèves" — évite l'expression ternaire dans le template
  nbEnfantsLabel(f: Famille): string {
    const n = this.nbEnfants(f);
    return `${n} élève${n > 1 ? 's' : ''}`;
  }

  classesEnfants(f: Famille): string[] {
    const cMap = this.cache.classesMap();
    return [...new Set((f.eleves ?? []).map(e => cMap.get(e.id_classe)?.nom_classe ?? e.id_classe))];
  }

  nomClasse(id: string): string { return this.cache.classesMap().get(id)?.nom_classe ?? id; }

  paiementsDe(f: Famille): Paiement[] {
    return (f.paiements ?? [])
      .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement));
  }

  montantAttendu(f: Famille): number {
    return (f.montant_total_attendu ?? 0)
      - (f?.montant_reduction ?? 0);
  }

  totalVerse(f: Famille): number {
    return this.paiementsDe(f).reduce((s, p) => s + (+p.montant_verse), 0);
  }

  restant(f: Famille): number {
    return Math.max(0, this.montantAttendu(f) - this.totalVerse(f));
  }

  aDette(f: Famille): boolean { return this.restant(f) > 0 && this.montantAttendu(f) > 0; }

  // isOk / isSolde — méthodes nommées pour éviter les expressions complexes dans [class]
  isOk(f: Famille): boolean { return this.restant(f) === 0 && this.montantAttendu(f) > 0; }
  isSolde(f: Famille): boolean { return this.totalVerse(f) >= this.montantAttendu(f) && this.montantAttendu(f) > 0; }

  prochainRdv(f: Famille): string | null {
    // const rdvs = this.paiementsDe(f).find(p => {p.date_paiement,p.date_prochain_rdv})
    const rdv = this.paiementsDe(f).find(p => p.date_prochain_rdv)?.date_prochain_rdv;

    if (!rdv) return null;
    return new Date(rdv).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  parseDateFR(date: string): number {
    const [day, month, year] = date.split('/');
    return new Date(`${year}-${month}-${day}`).getTime();
  }

  // ── Avatar ──
  initiales(nom: string): string { return nom.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase(); }
  private hashIdx(id: string): number { return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length; }
  avBg(id: string): string { return this.palette[this.hashIdx(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hashIdx(id)].txt; }

  // ── Formatter ──
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(Math.round(n)); }

  // ── Actions ──

  ouvrirModalPaiement(f: Famille): void {
    this.dialog.open(PaiementModalComponent, {
      data: { famille: f, totalVerse: this.totalVerse(f), montantAttendu: this.montantAttendu(f) } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalFamille(f:any): void {
    this.dialog.open(FamilleModalComponent, {
      data: { famille: f } satisfies FamilleModalData,
      width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  ouvrirModalEleve(f: Famille): void {
    this.dialog.open(EleveModalComponent, {
      data: { famille: f } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => { if (r?.success) this.cdr.markForCheck(); });
  }

  confirmerSuppression(f: Famille): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer la famille',
        message: `Supprimer "${f.nom_famille}" ? Cette action est irréversible.`,
        confirm: 'Supprimer',
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.cache.removeFamille(f.id_famille);
      this.data.deleteFamille(f.id_famille);
      this.snack.open('Famille supprimée', 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    });
  }
}