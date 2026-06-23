// ─────────────────────────────────────────────────────────────────
// famille-detail.component.ts
// Vue détail d'une famille — template bulletins (bl-*)
//
// Route : /familles/:id
// Charge la famille depuis le cache (ou DataService en fallback).
// Sections :
//   - Barre (retour, titre, actions)
//   - Stats pension + RDV
//   - Contacts + mini-carte Leaflet
//   - Tableau enfants
//   - Historique paiements
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, signal, computed,
  OnInit, AfterViewInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog }   from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService }  from '../../../core/services/cache.service';
import { DataService }   from '../../../core/services/data.service';
import { Famille, Eleve, Paiement } from '../../../core/models';
import { MapService, MapRef, DEFAULT_CENTER, MapMode, DEFAULT_ZOOM_MINI, COLOR_CSB } from '../../../core/services/map/map.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData } from '../../eleves/modal/eleve-modal.component';
import { PaiementModalComponent, PaiementModalData } from '../../paiements/modal/paiement-modal.component';
import { FamilleModalComponent, FamilleModalData } from '../famille-form';


@Component({
  selector: 'app-famille-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
@if (famille()) {
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <a routerLink="/familles" class="bl-btn" style="padding:0 10px">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>

    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ famille()!.nom_famille }}</span>
      <span class="bl-cfg-seqs">{{ resumeEnfants() }}</span>
    </div>

    <span class="bl-sep"></span>

    <button class="bl-btn bl-btn--ok" (click)="ouvrirPaiement()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="1.5"
              stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 7h14" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="5" cy="10" r="1" fill="currentColor"/>
      </svg>
      Payer pension
    </button>

    <button class="bl-btn" (click)="ouvrirModification()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
              stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Modifier
    </button>

    <button class="bl-btn" (click)="ouvrirAjoutEleve()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
        <path d="M1 13c0-2.5 2.5-4 6-4M13 10v4M11 12h4"
              stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      + Élève
    </button>

    <span class="bl-sep"></span>

    <span class="bl-foot-info">
      ID : {{ famille()!.id_famille }}
    </span>
  </div>

  <!-- ══ SECTION 1 : STATS + CONTACTS ══ -->
  <div class="bl-grid2">

    <!-- Stats pension -->
    <div class="bl-card">
      <div class="bl-card-head">
        <span class="bl-card-title">Pension scolaire — {{ anneeScolaire }}</span>
        <span [class]="progMentionCls()">{{ progression() }}% réglé</span>
      </div>
      <div class="bl-card-body">

        <div class="bl-stat-grid3">
          <div class="bl-stat">
            <div class="bl-stat-v">{{ fmt(montantAttendu()) }}</div>
            <div class="bl-stat-l">Attendu (FCFA)</div>
          </div>
          <div class="bl-stat">
            <div class="bl-stat-v bl-ok">{{ fmt(totalVerse()) }}</div>
            <div class="bl-stat-l">Versé</div>
          </div>
          <div class="bl-stat">
            <div class="bl-stat-v" [class]="restant() > 0 ? 'bl-bad' : 'bl-ok'">
              {{ fmt(restant()) }}
            </div>
            <div class="bl-stat-l">Restant</div>
          </div>
        </div>

        <div class="bl-prog-track">
          <div class="bl-prog-fill"
               [style.width.%]="progression()"
               [style.background]="restant() > 0 ? '#BA7517' : '#0F6E56'">
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;
                    font-size:9px;color:#aaa;margin-bottom:10px">
          <span>{{ fmt(totalVerse()) }} versés</span>
          <span>{{ fmt(montantAttendu()) }} attendus</span>
        </div>

        <!-- Prochain RDV -->
        @if (prochainRdv()) {
          <div class="bl-rdv">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="11" rx="2"
                    stroke="currentColor" stroke-width="1.3"/>
              <path d="M5 1v3M11 1v3M2 7h12"
                    stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Prochain RDV :
            <strong style="font-weight:500">{{ prochainRdv() }}</strong>
            <button class="bl-btn" style="margin-left:auto;height:24px;
                            font-size:10px;padding:0 8px"
                    (click)="ouvrirPaiement()">
              Modifier
            </button>
          </div>
        }

      </div>
    </div>

    <!-- Contacts + mini-carte -->
    <div class="bl-card">
      <div class="bl-card-head">
        <span class="bl-card-title">Contacts</span>
        <div style="display:flex;align-items:center;gap:6px">
          @if (famille()!.latitude && famille()!.longitude) {
            <span class="bl-mention bl-mention--ok" style="font-size:10px">GPS ✓</span>
          }
          <button class="bl-icon-btn" title="Voir sur la carte"
                  (click)="voirSurCarte()">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
                    stroke="currentColor" stroke-width="1.3"/>
              <circle cx="8" cy="6" r="1.5"
                      stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="bl-card-body">

        <div class="bl-contact-row">
          <span class="bl-label">Père</span>
          <div style="display:flex;align-items:center;gap:6px">
            <span>{{ famille()!.tel_pere || '—' }}</span>
            @if (famille()!.tel_pere) {
              <button class="bl-icon-btn" title="Copier"
                      (click)="copier(famille()!.tel_pere)">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5"
                        stroke="currentColor" stroke-width="1.3"/>
                  <path d="M3 11V3h8" stroke="currentColor"
                        stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            }
          </div>
        </div>

        <div class="bl-contact-row">
          <span class="bl-label">Mère</span>
          <div style="display:flex;align-items:center;gap:6px">
            <span>{{ famille()!.tel_mere || '—' }}</span>
            @if (famille()!.tel_mere) {
              <button class="bl-icon-btn" title="Copier"
                      (click)="copier(famille()!.tel_mere)">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5"
                        stroke="currentColor" stroke-width="1.3"/>
                  <path d="M3 11V3h8" stroke="currentColor"
                        stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            }
          </div>
        </div>

        @if (famille()!.tel_autre) {
          <div class="bl-contact-row">
            <span class="bl-label">Autre</span>
            <span>{{ famille()!.tel_autre }}</span>
          </div>
        }

        @if (famille()!.adresse_texte) {
          <div class="bl-contact-row" style="border-bottom:none">
            <span class="bl-label">Adresse</span>
            <span style="text-align:right;max-width:60%;color:#555">
              {{ famille()!.adresse_texte }}
            </span>
          </div>
        }

        <!-- Mini-carte Leaflet -->
        <div id="detail-map"
             style="margin-top:10px;height:100px;border-radius:6px;overflow:hidden;
                    border:0.5px solid rgba(0,0,0,.09)">
        </div>
        @if (!famille()!.latitude || !famille()!.longitude) {
          <div style="font-size:10px;color:#aaa;text-align:center;margin-top:4px">
            Position GPS non définie —
            <span style="color:#185FA5;cursor:pointer"
                  (click)="ouvrirModification()">
              ajouter
            </span>
          </div>
        }

      </div>
    </div>

  </div>

  <!-- ══ SECTION 2 : ENFANTS ══ -->
  <div class="bl-card">
    <div class="bl-card-head">
      <span class="bl-card-title">
        Enfants ({{ enfants().length }})
      </span>
      <button class="bl-btn bl-btn--primary"
              style="height:26px;font-size:11px;padding:0 10px"
              (click)="ouvrirAjoutEleve()">
        + Ajouter
      </button>
    </div>

    @if (enfants().length === 0) {
      <div class="bl-empty">Aucun enfant enregistré</div>
    } @else {
      <div style="overflow-x:auto">
        <table class="bl-table">
          <thead>
            <tr>
              <th class="bl-th" style="text-align:left">Élève</th>
              <th class="bl-th">Classe</th>
              <th class="bl-th">Sexe</th>
              <th class="bl-th">Date naiss.</th>
              <th class="bl-th">Statut</th>
              <th class="bl-th bl-th--trim">Solde pension</th>
              <th class="bl-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (e of enfants(); track e.id_eleve) {
              <tr class="bl-tr">

                <!-- Nom + avatar -->
                <td class="bl-td bl-td--name">
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="bl-av-sm"
                         [style.background]="avBg(e.id_eleve)"
                         [style.color]="avTxt(e.id_eleve)">
                      {{ initiales(e.nom, e.prenom) }}
                    </div>
                    <div>
                      <div>{{ e.nom }} {{ e.prenom }}</div>
                      <div style="font-size:10px;color:#aaa">{{ e.id_eleve }}</div>
                    </div>
                  </div>
                </td>

                <!-- Classe -->
                <td class="bl-td bl-td--center">
                  <span class="bl-mention bl-mention--info">
                    {{ nomClasse(e.id_classe) }}
                  </span>
                </td>

                <!-- Sexe -->
                <td class="bl-td bl-td--center" style="color:#888">
                  {{ e.sexe || '—' }}
                </td>

                <!-- Date naissance -->
                <td class="bl-td bl-td--center" style="font-size:11px;color:#888">
                  {{ fmtDate(e.date_naissance??'') }}
                </td>

                <!-- Statut -->
                <td class="bl-td bl-td--center">
                  <span [class]="statutCls(e.statut)">{{ e.statut }}</span>
                </td>

                <!-- Solde — colonne accentuée -->
                <td class="bl-td bl-td--center bl-td--trim">
                  <span [class]="soldeCls(e.id_eleve)">
                    {{ soldeLabel(e.id_eleve) }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="bl-td bl-td--center">
                  <div style="display:flex;gap:3px;justify-content:center">
                    <button class="bl-icon-btn" title="Modifier"
                            (click)="ouvrirModifEleve(e)">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                              stroke-width="1.3" stroke-linecap="round"
                              stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <button class="bl-icon-btn bl-icon-btn--del" title="Archiver"
                            (click)="archiverEleve(e)">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="3" width="14" height="3" rx="1"
                              stroke="currentColor" stroke-width="1.3"/>
                        <path d="M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"
                              stroke="currentColor" stroke-width="1.3"/>
                        <path d="M6 9h4" stroke="currentColor"
                              stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <!-- ══ SECTION 3 : HISTORIQUE PAIEMENTS ══ -->
  <div class="bl-card">
    <div class="bl-card-head">
      <span class="bl-card-title">Historique paiements</span>
      <span class="bl-foot-info">
        {{ paiements().length }} versement(s) · {{ fmt(totalVerse()) }} FCFA
      </span>
    </div>

    @if (paiements().length === 0) {
      <div class="bl-empty">Aucun paiement enregistré</div>
    } @else {
      <div style="overflow-x:auto">
        <table class="bl-table">
          <thead>
            <tr>
              <th class="bl-th" style="text-align:left">Date · période</th>
              <th class="bl-th">Montant</th>
              <th class="bl-th">Mode</th>
              <th class="bl-th">Prochain RDV</th>
              <th class="bl-th">Reçu</th>
              <th class="bl-th">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paiements(); track p.id_paiement) {
              <tr class="bl-tr">
                <td class="bl-td">
                  <div style="font-weight:500">{{ fmtDate(p.date_paiement) }}</div>
                  <div style="font-size:10px;color:#aaa">{{ p.periode_concernee || '—' }}</div>
                </td>
                <td class="bl-td bl-td--center">
                  <span class="bl-mention bl-mention--ok">{{ fmt(p.montant_verse) }}</span>
                </td>
                <td class="bl-td bl-td--center">
                  <span class="bl-mention bl-mention--neu">
                    {{ p.mode_paiement === 'mobile' ? 'Mobile' : 'Cash' }}
                  </span>
                </td>
                <td class="bl-td bl-td--center">
                  @if (p.date_prochain_rdv) {
                    <span class="bl-mention bl-mention--warn">
                      {{ fmtDate(p.date_prochain_rdv) }}
                    </span>
                  } @else {
                    <span style="color:#bbb;font-size:11px">—</span>
                  }
                </td>
                <td class="bl-td bl-td--center">
                  <span style="font-size:11px;color:#185FA5;cursor:pointer"
                        (click)="imprimerRecu(p)">
                    PDF
                  </span>
                </td>
                <td class="bl-td bl-td--center">
                  <span [class]="whatsappCls(p.statut_alerte_whatsapp)">
                    {{ whatsappLabel(p.statut_alerte_whatsapp) }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <!-- Pied -->
  <div class="bl-foot">
    <span class="bl-foot-info">
      Famille · {{ famille()!.nom_famille }}
    </span>
    <span class="bl-foot-info">{{ famille()!.id_famille }}</span>
  </div>

</div>
} @else {
  <div class="bl-empty">Famille introuvable</div>
}
  `,
  styles: [`
    .bl-host  { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar   { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                padding-bottom:12px;
                border-bottom:0.5px solid rgba(0,0,0,.09); }

    .bl-sep { width:0.5px; height:20px; background:rgba(0,0,0,.1); }

    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:13px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              text-decoration:none; white-space:nowrap;
              border:0.5px solid rgba(0,0,0,.18);
              background:white; color:#333; transition:opacity .1s; }
    .bl-btn:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }
    .bl-btn--ok { background:#0F6E56; color:#fff; border:none; }
    .bl-btn--ok:hover { opacity:.88; }

    .bl-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    .bl-card { background:white; border:0.5px solid rgba(0,0,0,.09);
               border-radius:8px; overflow:hidden; }
    .bl-card-head { padding:10px 14px; border-bottom:0.5px solid rgba(0,0,0,.07);
                    display:flex; align-items:center; justify-content:space-between;
                    background:#f8f8f8; }
    .bl-card-title { font-size:12px; font-weight:500; color:#555; }
    .bl-card-body  { padding:12px 14px; }

    .bl-stat-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr;
                     gap:8px; margin-bottom:12px; }
    .bl-stat   { background:#f8f8f8; border-radius:6px; padding:8px 10px; }
    .bl-stat-v { font-size:15px; font-weight:500; color:#333; }
    .bl-stat-l { font-size:9px; color:#aaa; margin-top:1px; }

    .bl-prog-track { height:5px; border-radius:3px;
                     background:#f0f0f0; overflow:hidden; }
    .bl-prog-fill  { height:100%; border-radius:3px; transition:width .3s; }

    .bl-rdv { display:flex; align-items:center; gap:8px;
              background:#FAEEDA; border-radius:6px;
              padding:7px 11px; font-size:11px; color:#633806; }

    .bl-contact-row { display:flex; justify-content:space-between;
                      align-items:center; padding:5px 0; font-size:12px;
                      border-bottom:0.5px solid rgba(0,0,0,.04); }
    .bl-label { color:#888; }

    .bl-av-sm { width:30px; height:30px; border-radius:50%; flex-shrink:0;
                display:flex; align-items:center; justify-content:center;
                font-size:10px; font-weight:600; }

    .bl-table { border-collapse:collapse; font-size:12px; width:100%; }
    .bl-th    { padding:6px 10px; font-weight:500; font-size:10px;
                background:#f8f8f8; color:#888;
                border-bottom:0.5px solid rgba(0,0,0,.07);
                text-align:center; white-space:nowrap; }
    .bl-th--trim { background:#EBF3FC; color:#0C447C; }
    .bl-td       { padding:6px 10px;
                   border-bottom:0.5px solid rgba(0,0,0,.04);
                   vertical-align:middle; }
    .bl-td--name   { font-weight:500; }
    .bl-td--center { text-align:center; }
    .bl-td--trim   { background:#f0f8ff; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover   .bl-td    { background:rgba(0,0,0,.012); }

    .bl-ok  { color:#0F6E56; font-weight:500; }
    .bl-bad { color:#993C1D; font-weight:500; }

    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; display:inline-block; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--neu  { background:#f5f5f5; color:#555; }

    .bl-icon-btn { width:26px; height:26px; padding:0;
                   border:0.5px solid rgba(0,0,0,.12);
                   background:white; cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555;
                   transition:background .1s; }
    .bl-icon-btn:hover       { background:#EBF3FC; color:#185FA5;
                                border-color:#B5D4F4; }
    .bl-icon-btn--del:hover  { background:#FCEBEB; color:#A32D2D;
                                border-color:#F09595; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:30px; color:#ccc; font-size:13px; }
  `],
})
export class FamilleDetailComponent implements OnInit, AfterViewInit, OnDestroy {

  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private cache  = inject(CacheService);
  private data   = inject(DataService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private ms     = inject(MapService);    // ← service centralisé
  private cdr    = inject(ChangeDetectorRef);

  famille  = signal<Famille | null>(null);
  loading  = signal(false);

  anneeScolaire = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  // Référence carte — gérée par MapService
  private ref:    MapRef | null = null;
  private marker: any = null;             // marqueur position famille

  private palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' },
    { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' },
    { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#E0F2F1', txt: '#00695C' },
  ];

  // ── Données dérivées ──

  enfants = computed<Eleve[]>(() =>
    this.famille()?.eleves ?? []
  );

  paiements = computed<Paiement[]>(() =>
    (this.cache.getPaiements())
      .filter(p => p.id_famille === this.famille()?.id_famille)
      .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement))
  );

  montantAttendu = computed(() =>
    (this.famille()?.montant_total_attendu ?? 0)
    - (this.famille()?.montant_reduction ?? 0)
  );

  totalVerse = computed(() =>
    this.paiements().reduce((s, p) => s + +p.montant_verse, 0)
  );

  restant = computed(() =>
    Math.max(0, this.montantAttendu() - this.totalVerse())
  );

  progression = computed(() => {
    if (this.montantAttendu() <= 0) return 100;
    return Math.min(100, Math.round((this.totalVerse() / this.montantAttendu()) * 100));
  });

  resumeEnfants = computed(() => {
    const nb  = this.enfants().length;
    const cls = this.enfants()
      .map(e => this.nomClasse(e.id_classe))
      .filter(Boolean)
      .join(', ');
    return `${nb} enfant${nb > 1 ? 's' : ''}${cls ? ' · ' + cls : ''}`;
  });

  prochainRdv = computed<string | null>(() => {
    const rdv = this.paiements()
      .find(p => p.date_prochain_rdv)?.date_prochain_rdv;
    return rdv ? this.fmtDate(rdv) : null;
  });

  // ── Init ──

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/familles']); return; }
    this.chargerFamille(id);
  }

  ngAfterViewInit(): void {
    // La carte est initialisée après que famille() soit chargée (dans chargerFamille)
  }

  private chargerFamille(id: string): void {
    // Cherche d'abord dans le cache
    const cached = this.cache.getFamilles().find(f => f.id_famille === id);
    if (cached) {
      this.famille.set(cached);
      this.cdr.markForCheck();
      setTimeout(() => this.initMap(), 150);
      // Charge les paiements en arrière-plan si le cache est vide
      if (!this.cache.getPaiements().length) {
        this.data.getPaiementsEleve(id).then(() => this.cdr.markForCheck());
      }
      return;
    }
    // Fallback : recharge toutes les familles
    this.loading.set(true);
    this.data.initAppData().then(() => {
      const f = this.cache.getFamilles().find(x => x.id_famille === id);
      this.famille.set(f ?? null);
      this.loading.set(false);
      this.cdr.markForCheck();
      if (f) setTimeout(() => this.initMap(), 150);
    });
  }

  // ── Mini-carte Leaflet (mode MINI = lecture seule) ─────────────

  private initMap(): void {
    if (this.ref) return;                       // évite la double init
    const f   = this.famille();
    const lat = f?.latitude  ?? DEFAULT_CENTER[0];
    const lng = f?.longitude ?? DEFAULT_CENTER[1];

    // Mode MINI : interactions désactivées, carte compacte
    this.ref = this.ms.creerCarte('detail-map', MapMode.MINI,
      [lat, lng], DEFAULT_ZOOM_MINI);

    // Marqueur épingle bleue CSB avec popup nom famille
    if (f?.latitude && f?.longitude) {
      this.marker = this.ms.creerMarqueurFamille(
        this.ref, [f.latitude, f.longitude],
        COLOR_CSB,
        `<div style="font-weight:600;font-size:12px;padding:2px">${f.nom_famille}</div>`,
      );
    }
  }

  ngOnDestroy(): void { this.ms.detruire(this.ref); }

  // ── Actions ──

  ouvrirPaiement(): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(PaiementModalComponent, {
      data: {
        famille: f,
        totalVerse:     this.totalVerse(),
        montantAttendu: this.montantAttendu(),
      } satisfies PaiementModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) this.cdr.markForCheck();
    });
  }

  ouvrirModification(): void {
    const f = this.famille();
    if (!f) return;
    // this.dialog.open(FamilleModalComponent, {
    //   data: { famille: f } satisfies FamilleModalData,
    //   width: '520px', maxWidth: '96vw',
    // }).afterClosed().subscribe(r => {
    //   if (r?.success) {
    //     this.famille.set(r.famille);
    //     this.cdr.markForCheck();
    //   }
    // });
  }

  ouvrirAjoutEleve(): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(EleveModalComponent, {
      data: { famille: f } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) this.cdr.markForCheck();
    });
  }

  ouvrirModifEleve(e: Eleve): void {
    const f = this.famille();
    if (!f) return;
    this.dialog.open(EleveModalComponent, {
      data: { famille: f, eleve: e } satisfies EleveModalData,
      width: '460px', maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) this.cdr.markForCheck();
    });
  }

  archiverEleve(e: Eleve): void {
    const label = e.statut === 'actif' ? 'archiver' : 'réactiver';
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:   `${label.charAt(0).toUpperCase() + label.slice(1)} l'élève`,
        message: `${label.charAt(0).toUpperCase() + label.slice(1)} ${e.nom} ${e.prenom} ?`,
        confirm: label.charAt(0).toUpperCase() + label.slice(1),
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      const nouveau = e.statut === 'actif' ? 'archive' : 'actif';
      this.data.updateEleve({ ...e, statut: nouveau }).then(() => {
        this.snack.open(`Élève ${nouveau === 'actif' ? 'réactivé' : 'archivé'}`, 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      });
    });
  }

  imprimerRecu(p: Paiement): void {
    const f = this.famille();
    if (!f) return;
    // Calcule le total versé jusqu'à et incluant ce paiement
    // (les paiements sont triés du plus récent au plus ancien)
    const paiements = this.paiements();
    const idx = paiements.findIndex(x => x.id_paiement === p.id_paiement);
    // Total = somme des paiements à partir de ce paiement jusqu'au plus ancien
    const totalApres = paiements
      .slice(idx)
      .reduce((s, x) => s + +x.montant_verse, 0);

    // this.dialog.open(RecuPrintModalComponent, {
    //   data: {
    //     paiement:       p,
    //     famille:        f,
    //     totalApres,
    //     montantAttendu: this.montantAttendu(),
    //   } satisfies RecuPrintData,
    //   width:    '440px',
    //   maxWidth: '96vw',
    // });
  }

  voirSurCarte(): void {
    const f = this.famille();
    if (!f) return;
    this.router.navigate(['/familles/carte'], {
      queryParams: { selected: f.id_famille }
    });
  }

  copier(texte: string | undefined): void {
    if (!texte) return;
    navigator.clipboard.writeText(texte).then(() =>
      this.snack.open('Copié !', '', { duration: 1500 })
    );
  }

  // ── Helpers ──

  nomClasse(id: string): string {
    return this.cache.classesMap().get(id)?.nom_classe ?? '';
  }

  getSolde(idEleve: string) {
    return this.cache.getSoldes().find(s => s.id_eleve === idEleve);
  }

  soldeLabel(idEleve: string): string {
    const s = this.getSolde(idEleve);
    if (!s) return '—';
    const r = +s.reste_a_payer;
    if (r <= 0) return 'Soldé ✓';
    return `${this.fmt(r)} FCFA`;
  }

  soldeCls(idEleve: string): string {
    const s = this.getSolde(idEleve);
    if (!s) return '';
    const r = +s.reste_a_payer;
    if (r <= 0)               return 'bl-mention bl-mention--ok';
    if (s.statut_insolvable)  return 'bl-mention bl-mention--bad';
    return 'bl-mention bl-mention--warn';
  }

  statutCls(statut: string): string {
    return statut === 'actif'
      ? 'bl-mention bl-mention--ok'
      : 'bl-mention bl-mention--neu';
  }

  progMentionCls(): string {
    const p = this.progression();
    if (p >= 100) return 'bl-mention bl-mention--ok';
    if (p >= 50)  return 'bl-mention bl-mention--warn';
    return 'bl-mention bl-mention--bad';
  }

  whatsappLabel(statut: string): string {
    if (statut === 'ENVOYE')    return 'Envoyé';
    if (statut === 'ECHEC')     return 'Échec';
    return 'En attente';
  }

  whatsappCls(statut: string): string {
    if (statut === 'ENVOYE')    return 'bl-mention bl-mention--ok';
    if (statut === 'ECHEC')     return 'bl-mention bl-mention--bad';
    return 'bl-mention bl-mention--neu';
  }

  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }

  private hashIdx(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }

  avBg(id: string):  string { return this.palette[this.hashIdx(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hashIdx(id)].txt; }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(+n));
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return iso; }
  }
}