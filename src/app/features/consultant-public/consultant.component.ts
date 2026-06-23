// consultant.component.ts — Interface consultant / administration
// Validation famille entière + élèves individuels + demandes paiement enrichies
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnInit, ChangeDetectorRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal }   from '@angular/core/rxjs-interop';
import { MatDialog }  from '@angular/material/dialog';
import { Famille, Eleve } from '../../core/models';
import { FamilleTampon, EleveTampon, PensionTampon, DemandePaiement, SHEET_TAMPON } from '../../core/models/parent.models';
import { GoogleSheetsService } from '../../core/services/@google-sheets/google-sheets.service';
import { CacheService } from '../../core/services/cache.service';
import { DataService } from '../../core/services/data.service';
import { EleveModalComponent, EleveModalData } from '../eleves/modal/eleve-modal.component';
import { FamilleModalComponent, FamilleModalData } from '../familles/famille-form';


// ── Types internes ────────────────────────────────────────────────

interface FamilleTamponEnrichie extends FamilleTampon {
  eleves:      EleveTampon[];
  pension:     PensionTampon | null;
  selectionne: boolean;
}

// Demande enrichie : nom famille + solde courant visible
interface DemandeEnrichie extends DemandePaiement {
  nom_famille:    string;
  montant_actuel: number;   // déjà payé dans les tables principales
  montant_attendu:number;   // attendu selon la pension
  reste_avant:    number;   // avant cette demande
  reste_apres:    number;   // si on valide
}

@Component({
  selector: 'app-consultant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  styles: [`
    :host { display:block; font-size:13px; }

    /* Barre filtre */
    .bar { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
           padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bar-titre { font-size:14px; font-weight:600; flex:1; min-width:160px; }
    .fi { height:32px; padding:0 10px; border:0.5px solid rgba(0,0,0,.18);
          border-radius:6px; background:white; font-size:12px; outline:none; }
    .fi:focus { border-color:#185FA5; }

    /* Onglets */
    .onglets { display:flex; gap:0; border-bottom:0.5px solid rgba(0,0,0,.09);
               margin-bottom:12px; }
    .onglet  { flex:1; height:38px; border:none; background:transparent;
               font-size:12px; font-weight:500; color:#9CA3AF; cursor:pointer;
               border-bottom:2.5px solid transparent; transition:all .15s; }
    .onglet--on { color:#185FA5; border-bottom-color:#185FA5; }
    .onglet .badge-nb { background:#185FA5; color:white; border-radius:99px;
                         padding:1px 6px; font-size:10px; margin-left:5px; }
    .onglet .badge-nb--warn { background:#D97706; }

    /* Stats chips */
    .stats-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
    .chip { padding:5px 12px; border-radius:99px; font-size:11px; font-weight:500; }
    .chip--blue  { background:#EBF3FC; color:#185FA5; }
    .chip--warn  { background:#FEF3C7; color:#78350F; }
    .chip--ok    { background:#DCFCE7; color:#064E3B; }
    .chip--red   { background:#FEE2E2; color:#7F1D1D; }

    /* Boutons */
    .btn { height:30px; padding:0 12px; border-radius:6px; font-size:12px;
           cursor:pointer; display:inline-flex; align-items:center; gap:4px;
           border:0.5px solid rgba(0,0,0,.18); background:white; color:#333;
           white-space:nowrap; }
    .btn:disabled  { opacity:.35; cursor:default; }
    .btn:not(:disabled):hover { background:#f5f5f5; }
    .btn--ok  { background:#059669; color:white; border:none; }
    .btn--ok:not(:disabled):hover  { opacity:.88; }
    .btn--del { background:#DC2626; color:white; border:none; }
    .btn--del:not(:disabled):hover { opacity:.88; }
    .btn--edit{ background:#185FA5; color:white; border:none; }
    .btn--edit:not(:disabled):hover{ opacity:.88; }

    /* Sélection globale */
    .sel-bar  { display:flex; align-items:center; gap:10px; padding:5px 0;
                font-size:12px; }
    .chk-wrap { display:flex; align-items:center; gap:6px; cursor:pointer; }
    .chk      { width:14px; height:14px; accent-color:#185FA5; cursor:pointer; }

    /* Carte famille */
    .fam-card { border:0.5px solid rgba(0,0,0,.09); border-radius:10px;
                margin-bottom:10px; overflow:hidden; }
    .fam-head { display:flex; align-items:center; gap:8px; padding:10px 14px;
                background:#f8f8f8; border-bottom:0.5px solid rgba(0,0,0,.07); }
    .fam-nom  { font-weight:600; font-size:13px; flex:1; }
    .fam-date { font-size:10px; color:#9CA3AF; }
    .badge    { font-size:10px; padding:2px 8px; border-radius:99px;
                font-weight:500; white-space:nowrap; }
    .badge--en_attente { background:#FEF3C7; color:#78350F; }
    .badge--valide     { background:#DCFCE7; color:#064E3B; }
    .badge--refuse     { background:#FEE2E2; color:#7F1D1D; }

    .fam-body { padding:12px 14px; }
    .sec-lbl  { font-size:10px; font-weight:700; color:#9CA3AF;
                text-transform:uppercase; letter-spacing:.05em;
                margin:10px 0 6px; }
    .info-row { display:flex; gap:8px; flex-wrap:wrap; font-size:11px;
                color:#555; margin-bottom:4px; }
    .info-row strong { color:#111; }

    /* Ligne élève */
    .eleve-row { display:flex; align-items:center; gap:8px;
                 padding:7px 0; border-bottom:0.5px solid #F0F4F8;
                 font-size:11px; }
    .eleve-row:last-child { border:none; }
    .eleve-av  { width:26px; height:26px; border-radius:50%; flex-shrink:0;
                 background:#EBF3FC; color:#185FA5; font-size:9px; font-weight:700;
                 display:flex; align-items:center; justify-content:center; }
    .eleve-info { flex:1; }
    .eleve-nom  { font-weight:600; }
    .eleve-sub  { color:#9CA3AF; font-size:10px; margin-top:1px; }
    .eleve-actions { display:flex; gap:4px; flex-shrink:0; }

    /* Pied carte */
    .fam-footer { display:flex; gap:6px; padding:10px 14px; flex-wrap:wrap;
                  background:#fafafa; border-top:0.5px solid rgba(0,0,0,.06); }

    /* Carte paiement enrichie */
    .pai-card { border:0.5px solid rgba(0,0,0,.09); border-radius:10px;
                margin-bottom:10px; overflow:hidden; }
    .pai-head { display:flex; align-items:center; gap:8px; padding:10px 14px;
                background:#f8f8f8; border-bottom:0.5px solid rgba(0,0,0,.07); }
    .pai-nom  { font-weight:600; font-size:13px; flex:1; }
    .pai-body { padding:12px 14px; }
    .pai-montant-row { display:flex; justify-content:space-between;
                        align-items:center; padding:5px 0;
                        border-bottom:0.5px solid #F0F4F8; font-size:12px; }
    .pai-montant-row:last-child { border:none; }
    .pai-lbl  { color:#555; }
    .pai-val  { font-weight:600; }
    .pai-val--vert  { color:#059669; }
    .pai-val--rouge { color:#DC2626; }
    .pai-val--amber { color:#D97706; }
    .prog-track { height:6px; background:#E5E7EB; border-radius:99px;
                   overflow:hidden; margin:8px 0; }
    .prog-fill  { height:100%; border-radius:99px; }
    .prog-fill--vert  { background:#059669; }
    .prog-fill--amber { background:#D97706; }
    .prog-fill--rouge { background:#DC2626; }
    .pai-footer { display:flex; gap:6px; padding:10px 14px;
                  background:#fafafa; border-top:0.5px solid rgba(0,0,0,.06); }

    .empty { text-align:center; padding:32px 16px; color:#ccc; font-size:13px; }
    .spinner { display:inline-block; width:13px; height:13px; border-radius:50%;
               border:2px solid rgba(0,0,0,.1); border-top-color:#185FA5;
               animation:sp .7s linear infinite; }
    @keyframes sp { to { transform:rotate(360deg); } }
  `],
  template: `
<div>

  <!-- ═ Barre principale ═ -->
  <div class="bar">
    <div class="bar-titre">Espace consultant</div>
    <input [formControl]="ctrlSearch" class="fi"
           placeholder="Rechercher…" style="width:180px">
    <input [formControl]="ctrlDate" class="fi" type="date">
    <button class="btn" (click)="recharger()">
      @if (chargement()) { <span class="spinner"></span> }
      Actualiser
    </button>
    @if (nbSelectionnes() > 0) {
      <button class="btn btn--del" (click)="supprimerSelectionnes()">
        🗑 Supprimer ({{ nbSelectionnes() }})
      </button>
    }
  </div>

  <!-- ═ Onglets ═ -->
  <div class="onglets">
    <button class="onglet" [class.onglet--on]="onglet() === 'familles'"
            (click)="onglet.set('familles')">
      Inscriptions
      <span class="badge-nb" [class.badge-nb--warn]="nbAttente() > 0">
        {{ nbAttente() }}
      </span>
    </button>
    <button class="onglet" [class.onglet--on]="onglet() === 'paiements'"
            (click)="onglet.set('paiements')">
      Paiements
      <span class="badge-nb" [class.badge-nb--warn]="nbPaiementsAttente() > 0">
        {{ nbPaiementsAttente() }}
      </span>
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- ONGLET INSCRIPTIONS                                        -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  @if (onglet() === 'familles') {

    <div class="stats-row">
      <div class="chip chip--blue">{{ cache.getFamillesTampon().length }} famille(s)</div>
      <div class="chip chip--warn">{{ nbAttente() }} en attente</div>
      <div class="chip chip--ok">{{ nbValides() }} validée(s)</div>
    </div>

    @if (filteredFamilles().length > 0) {
      <div class="sel-bar">
        <label class="chk-wrap">
          <input type="checkbox" class="chk"
                 [checked]="toutSelectionne()"
                 (change)="toggleTout($event)">
          Tout sélectionner
        </label>
        @if (nbSelectionnes() > 0) {
          <span class="chip chip--blue">{{ nbSelectionnes() }} sélectionnée(s)</span>
        }
      </div>
    }

    @if (chargement() && cache.getFamillesTampon().length === 0) {
      <div class="empty">Chargement…</div>
    } @else if (filteredFamilles().length === 0) {
      <div class="empty">Aucune inscription en attente</div>
    } @else {
      @for (f of filteredFamilles(); track f.id_famille) {
        <div class="fam-card">

          <!-- En-tête famille -->
          <div class="fam-head">
            <input type="checkbox" class="chk"
                   [checked]="f.selectionne"
                   (change)="toggleFamille(f.id_famille, $event)">
            <div class="fam-nom">{{ f.nom_famille }}</div>
            <span [class]="'badge badge--' + f.statut_validation">
              {{ labelStatut(f.statut_validation) }}
            </span>
            <div class="fam-date">{{ fmtDate(f.date_enregistrement) }}</div>
          </div>

          <div class="fam-body">

            <!-- Coordonnées -->
            <div class="sec-lbl">Coordonnées</div>
            <div class="info-row">
              <span>📞 Père : <strong>{{ f.tel_pere || '—' }}</strong></span>
              @if (f.tel_mere) {
                <span>📞 Mère : <strong>{{ f.tel_mere }}</strong></span>
              }
              @if (f.adresse_texte) {
                <span>📍 <strong>{{ f.adresse_texte }}</strong></span>
              }
            </div>

            <!-- Pension -->
            @if (f.pension?.montant_total_attendu) {
              <div class="info-row" style="margin-top:4px">
                <span>💰 Pension : <strong>{{ fcfa(+f.pension!.montant_total_attendu) }} FCFA</strong></span>
                <span>📅 Année : <strong>{{ f.pension!.annee_scolaire }}</strong></span>
              </div>
            }

            <!-- Enfants avec validation individuelle -->
            @if (f.eleves.length > 0) {
              <div class="sec-lbl">
                Enfants ({{ f.eleves.length }}) —
                <span style="color:#059669;font-size:10px">
                  {{ nbElevesValides(f) }} validé(s)
                </span>
              </div>
              @for (e of f.eleves; track e.id_eleve) {
                <div class="eleve-row">
                  <div class="eleve-av">{{ e.nom[0] }}{{ e.prenom[0] }}</div>
                  <div class="eleve-info">
                    <div class="eleve-nom">{{ e.nom }} {{ e.prenom }}</div>
                    <div class="eleve-sub">
                      {{ classeNom(e.id_classe) }}
                      @if (e.date_naissance) { · né(e) {{ fmtDate(e.date_naissance) }} }
                      @if (e.sexe) { · {{ e.sexe === 'M' ? 'M' : 'F' }} }
                    </div>
                  </div>
                  <!-- Statut badge élève -->
                  <span [class]="'badge badge--' + e.statut_validation"
                        style="font-size:9px">
                    {{ labelStatut(e.statut_validation) }}
                  </span>
                  <!-- Actions élève -->
                  <div class="eleve-actions">
                    <button class="btn btn--edit"
                            style="height:26px;padding:0 8px;font-size:11px"
                            (click)="modifierEleve(f, e)"
                            title="Modifier">✏️</button>
                    @if (e.statut_validation === 'en_attente') {
                      <button class="btn btn--ok"
                              style="height:26px;padding:0 8px;font-size:11px"
                              [disabled]="validation()"
                              (click)="validerEleve(f, e)"
                              title="Valider cet élève">✅</button>
                      <button class="btn btn--del"
                              style="height:26px;padding:0 8px;font-size:11px"
                              [disabled]="validation()"
                              (click)="refuserEleve(f, e)"
                              title="Refuser cet élève">✕</button>
                    }
                  </div>
                </div>
              }
            }

          </div>

          <!-- Actions globales famille -->
          @if (f.statut_validation !== 'refuse') {
            <div class="fam-footer">
              <button class="btn btn--edit" (click)="modifierFamille(f)">
                ✏️ Modifier famille
              </button>
              @if (f.statut_validation === 'en_attente') {
                <button class="btn btn--ok" (click)="validerFamille(f)"
                        [disabled]="validation()">
                  ✅ Valider tout
                </button>
                <button class="btn btn--del" (click)="refuserFamille(f)"
                        [disabled]="validation()">
                  ❌ Refuser
                </button>
              }
            </div>
          }

        </div>
      }
    }
  }

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- ONGLET PAIEMENTS                                           -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  @if (onglet() === 'paiements') {

    <div class="stats-row">
      <div class="chip chip--blue">{{ demandes().length }} demande(s)</div>
      <div class="chip chip--warn">{{ nbPaiementsAttente() }} en attente</div>
      <div class="chip chip--ok">{{ nbPaiementsValides() }} validée(s)</div>
    </div>

    @if (filteredPaiements().length === 0) {
      <div class="empty">
        @if (chargement()) { Chargement… }
        @else { Aucune demande de paiement }
      </div>
    } @else {
      @for (d of filteredPaiements(); track d.id) {
        <div class="pai-card">

          <!-- En-tête : nom famille + badge statut -->
          <div class="pai-head">
            <div>
              <div class="pai-nom">{{ d.nom_famille }}</div>
              <div style="font-size:10px;color:#9CA3AF">
                {{ fmtDate(d.date_demande) }} · {{ d.mode_paiement }}
                @if (d.reference) { · Réf: {{ d.reference }} }
              </div>
            </div>
            <span [class]="'badge badge--' + d.statut">{{ labelStatut(d.statut) }}</span>
          </div>

          <!-- Corps : montants et projection -->
          <div class="pai-body">

            <!-- Montant de la demande -->
            <div class="pai-montant-row">
              <span class="pai-lbl">💵 Montant demandé</span>
              <span class="pai-val pai-val--amber">{{ fcfa(d.montant) }} FCFA</span>
            </div>

            <!-- Solde actuel -->
            <div class="pai-montant-row">
              <span class="pai-lbl">📊 Total attendu</span>
              <span class="pai-val">{{ fcfa(d.montant_attendu) }} FCFA</span>
            </div>
            <div class="pai-montant-row">
              <span class="pai-lbl">✅ Déjà payé</span>
              <span class="pai-val pai-val--vert">{{ fcfa(d.montant_actuel) }} FCFA</span>
            </div>

            <!-- Reste avant validation -->
            <div class="pai-montant-row">
              <span class="pai-lbl">⏳ Restant actuel</span>
              <span [class]="d.reste_avant > 0 ? 'pai-val pai-val--rouge' : 'pai-val pai-val--vert'">
                {{ fcfa(d.reste_avant) }} FCFA
              </span>
            </div>

            <!-- Barre progression actuelle -->
            <div class="prog-track">
              <div [class]="progCls(d.montant_actuel, d.montant_attendu)"
                   [style.width.%]="pct(d.montant_actuel, d.montant_attendu)">
              </div>
            </div>

            <!-- Projection après validation -->
            @if (d.statut === 'en_attente') {
              <div style="background:#F0F9F4;border-radius:8px;padding:8px 10px;
                          font-size:11px;color:#064E3B;margin-top:6px">
                Si validé → Restant : <strong>{{ fcfa(d.reste_apres) }} FCFA</strong>
                ({{ pct(d.montant_actuel + d.montant, d.montant_attendu) }}% réglé)
              </div>
            }

            @if (d.commentaire) {
              <div style="font-size:11px;color:#555;margin-top:6px;
                          font-style:italic">
                💬 {{ d.commentaire }}
              </div>
            }
          </div>

          @if (d.statut === 'en_attente') {
            <div class="pai-footer">
              <button class="btn btn--ok" (click)="validerPaiement(d)"
                      [disabled]="validation()">
                ✅ Valider le paiement
              </button>
              <button class="btn btn--del" (click)="refuserPaiement(d)"
                      [disabled]="validation()">
                ❌ Refuser
              </button>
            </div>
          }

        </div>
      }
    }
  }

</div>
  `
})
export class ConsultantComponent implements OnInit {

  private sheets = inject(GoogleSheetsService);
  readonly data  = inject(DataService);
  readonly cache = inject(CacheService);
  private dialog = inject(MatDialog);
  private cdr    = inject(ChangeDetectorRef);

  onglet      = signal<'familles' | 'paiements'>('familles');
  chargement  = signal(false);
  validation  = signal(false);

  // ── Données cache → computed réactifs ─────────────────────────

  famillesEnrichies = computed(() =>
    this.cache.famillesTamponEnrichies().map(f => ({
      ...f,
      selectionne: this._selection().has(f.id_famille),
    }))
  );

  // Demandes enrichies avec nom famille + calculs solde
  demandes = computed<DemandeEnrichie[]>(() => {
    const pais     = this.cache.getDemandesPaiement();
    const familles = this.cache.getFamilles();
    const soldes   = this.cache.getSoldes();
    const famTampon = this.cache.getFamillesTampon();

    return pais.map(d => {
      // Cherche d'abord dans les familles validées, puis dans le tampon
      const fam  = familles.find(f => f.id_famille === d.id_famille);
      const famT = famTampon.find(f => f.id_famille === d.id_famille);
      const nom  = fam?.nom_famille ?? famT?.nom_famille ?? d.id_famille;

      const solde   = soldes.find(s => s.id_famille === d.id_famille);
      const attendu = +(fam?.montant_total_attendu ?? famT?.montant_total_attendu ?? 0);
      const actuel  = +(solde?.total_verse ?? 0);
      const resteAv = Math.max(0, attendu - actuel);
      const resteAp = Math.max(0, resteAv - d.montant);

      return {
        ...d,
        nom_famille:    nom,
        montant_attendu:attendu,
        montant_actuel: actuel,
        reste_avant:    resteAv,
        reste_apres:    resteAp,
      };
    });
  });

  private _selection = signal<Set<string>>(new Set());
  ctrlSearch = new FormControl('');
  ctrlDate   = new FormControl('');
  private searchS = toSignal(this.ctrlSearch.valueChanges, { initialValue: '' });
  private dateS   = toSignal(this.ctrlDate.valueChanges,   { initialValue: '' });

  filteredFamilles = computed(() => {
    const q = (this.searchS() ?? '').toLowerCase();
    const d = this.dateS() ?? '';
    return this.famillesEnrichies().filter(f => {
      if (q && !f.nom_famille.toLowerCase().includes(q)) return false;
      if (d && !f.date_enregistrement.startsWith(d))     return false;
      return true;
    });
  });

  filteredPaiements = computed(() => {
    const q = (this.searchS() ?? '').toLowerCase();
    return this.demandes().filter(d =>
      !q || d.nom_famille.toLowerCase().includes(q) || d.id_famille.includes(q)
    );
  });

  nbAttente    = computed(() => this.cache.getFamillesTampon().filter(f => f.statut_validation === 'en_attente').length);
  nbValides    = computed(() => this.cache.getFamillesTampon().filter(f => f.statut_validation === 'valide').length);
  nbSelectionnes   = computed(() => this._selection().size);
  nbPaiementsAttente = computed(() => this.demandes().filter(d => d.statut === 'en_attente').length);
  nbPaiementsValides = computed(() => this.demandes().filter(d => d.statut === 'valide').length);

  toutSelectionne = computed(() =>
    this.filteredFamilles().length > 0 &&
    this.filteredFamilles().every(f => this._selection().has(f.id_famille))
  );

  nbElevesValides(f: FamilleTamponEnrichie): number {
    return f.eleves.filter(e => e.statut_validation === 'valide').length;
  }

  // ── Init ──────────────────────────────────────────────────────

  ngOnInit(): void { this.recharger(); }

  async recharger(): Promise<void> {
    this.chargement.set(true);
    try {
      const [fams, elvs, pens, pais] = await Promise.all([
        this.data.getFamillesTampon(),
        this.data.getElevesTampon(),
        this.data.getPensionsTampon(),
        this.data.getDemandePaiements(),
      ]);
      this.cache.setFamillesTampon(fams);
      this.cache.setElevesTampon(elvs);
      this.cache.setPensionsTampon(pens);
      this.cache.setDemandesPaiement(pais);
    } finally {
      this.chargement.set(false);
      this.cdr.markForCheck();
    }
  }

  // ── Sélection ─────────────────────────────────────────────────

  toggleFamille(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this._selection.update(s => { const n = new Set(s); checked ? n.add(id) : n.delete(id); return n; });
  }

  toggleTout(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this._selection.set(checked ? new Set(this.filteredFamilles().map(f => f.id_famille)) : new Set());
  }

  async supprimerSelectionnes(): Promise<void> {
    if (!confirm('Supprimer les familles sélectionnées du tampon ?')) return;
    [...this._selection()].forEach(id => {
      this.cache.removeFamilleTampon(id);
      this.cache.removeElevesTamponFamille(id);
    });
    this._selection.set(new Set());
    this.cdr.markForCheck();
  }

  // ── Validation FAMILLE entière ────────────────────────────────

  async validerFamille(f: FamilleTamponEnrichie): Promise<void> {
    if (!confirm(`Valider la famille "${f.nom_famille}" et tous ses enfants ?`)) return;
    this.validation.set(true);
    try {
      await this.data.validerFamilleTampon(f, f.eleves, f.pension);
      // Marquer tous les élèves comme validés dans le cache
      f.eleves.forEach(e => this.cache.upsertEleveTampon({ ...e, statut_validation: 'valide' }));
      this.cache.upsertFamilleTampon({ ...f, statut_validation: 'valide' });
    } finally {
      this.validation.set(false);
      this.cdr.markForCheck();
    }
  }

  async refuserFamille(f: FamilleTamponEnrichie): Promise<void> {
    if (!confirm(`Refuser la demande de "${f.nom_famille}" ?`)) return;
    await this.data.refuserFamilleTampon(f.id_famille);
    this.cache.upsertFamilleTampon({ ...f, statut_validation: 'refuse' });
    this.cdr.markForCheck();
  }

  // ── Validation ÉLÈVE individuel ───────────────────────────────

  async validerEleve(f: FamilleTamponEnrichie, e: EleveTampon): Promise<void> {
    if (!confirm(`Valider ${e.nom} ${e.prenom} et l'insérer dans les tables principales ?`)) return;
    this.validation.set(true);
    try {
      // Insérer uniquement cet élève dans les tables principales
      await this.data.addEleve({
        id_eleve:        e.id_eleve,
        id_famille:      f.id_famille,
        id_classe:       e.id_classe ?? '',
        nom:             e.nom,
        prenom:          e.prenom,
        date_naissance:  e.date_naissance ?? '',
        sexe:            e.sexe ?? 'M',
        statut:          'actif',
        matricule:       '',
      });

      // Mettre à jour le statut dans le tampon Sheets
      const rowEleve = await this.sheets.findRowById(SHEET_TAMPON.eleves, e.id_eleve);
      if (rowEleve !== -1) {
        const maj: EleveTampon = { ...e, statut_validation: 'valide' };
        this.data.addEleveTampon(maj);   // queue → updateRow via la feuille tampon
      }

      // Mettre à jour le cache tampon local
      this.cache.upsertEleveTampon({ ...e, statut_validation: 'valide' });

      // Si tous les élèves sont validés → valider aussi la famille
      const tous = this.cache.getElevesTampon()
        .filter(ev => ev.id_famille === f.id_famille)
        .every(ev => ev.statut_validation === 'valide');
      if (tous) {
        this.cache.upsertFamilleTampon({ ...f, statut_validation: 'valide' });
      }
    } finally {
      this.validation.set(false);
      this.cdr.markForCheck();
    }
  }

  async refuserEleve(f: FamilleTamponEnrichie, e: EleveTampon): Promise<void> {
    if (!confirm(`Refuser ${e.nom} ${e.prenom} ?`)) return;
    const maj: EleveTampon = { ...e, statut_validation: 'refuse' };
    this.cache.upsertEleveTampon(maj);
    this.data.addEleveTampon(maj);
    this.cdr.markForCheck();
  }

  // ── Modifier via les modaux existants ─────────────────────────

  modifierFamille(f: FamilleTamponEnrichie): void {
    const famPourModal: any = {
      id_famille:            f.id_famille,
      nom_famille:           f.nom_famille,
      tel_pere:              f.tel_pere,
      tel_mere:              f.tel_mere,
      tel_autre:             f.tel_autre,
      adresse_texte:         f.adresse_texte,
      montant_total_attendu: f.pension?.montant_total_attendu ?? 0,
      montant_reduction:     f.pension?.montant_reduction ?? 0,
      annee_scolaire:        f.pension?.annee_scolaire ?? '',
      commentaire:           f.pension?.commentaire ?? '',
    };
    this.dialog.open(FamilleModalComponent, {
      data: { famille: famPourModal } satisfies FamilleModalData,
      width: '520px', maxWidth: '96vw',
    }).afterClosed().subscribe((r?: { success: boolean; famille: Famille }) => {
      if (!r?.success) return;
      const maj: FamilleTampon = {
        ...f,
        nom_famille:   r.famille.nom_famille,
        tel_pere:      r.famille.tel_pere,
        tel_mere:      r.famille.tel_mere  ?? '',
        tel_autre:     r.famille.tel_autre ?? '',
        adresse_texte: r.famille.adresse_texte ?? '',
      };
      this.cache.upsertFamilleTampon(maj);
      this.data.addFamilleTampon(maj);
      this.cdr.markForCheck();
    });
  }

  modifierEleve(f: FamilleTamponEnrichie, e: EleveTampon): void {
    const famPourModal: Famille = {
      id_famille:  f.id_famille,
      nom_famille: f.nom_famille,
      tel_pere:    f.tel_pere,
      tel_mere:    f.tel_mere,
    };
    const elevePourModal: Eleve = {
      id_eleve:       e.id_eleve,
      id_famille:     e.id_famille,
      id_classe:      e.id_classe ?? '',
      nom:            e.nom,
      prenom:         e.prenom,
      date_naissance: e.date_naissance ?? '',
      sexe:           e.sexe ?? 'M',
      statut:         e.statut ?? 'actif',
      matricule:      '',
    };
    this.dialog.open(EleveModalComponent, {
      data: { famille: famPourModal, eleve: elevePourModal } satisfies EleveModalData,
      width: '480px', maxWidth: '96vw',
    }).afterClosed().subscribe((r?: { success: boolean; eleve: Eleve }) => {
      if (!r?.success) return;
      const maj: EleveTampon = {
        ...e,
        nom:            r.eleve.nom,
        prenom:         r.eleve.prenom,
        id_classe:      r.eleve.id_classe,
        date_naissance: r.eleve.date_naissance ?? '',
        sexe:           r.eleve.sexe ?? 'M',
        statut:         r.eleve.statut,
      };
      this.cache.upsertEleveTampon(maj);
      this.data.addEleveTampon(maj);
      this.cdr.markForCheck();
    });
  }

  // ── Validation PAIEMENTS ──────────────────────────────────────

  async validerPaiement(d: DemandeEnrichie): Promise<void> {
    if (!confirm(`Valider le paiement de ${this.fcfa(d.montant)} FCFA pour ${d.nom_famille} ?`)) return;
    this.validation.set(true);
    try {
      await this.data.validerDemandePaiement(d);
      this.cache.upsertDemandePaiement({ ...d, statut: 'valide' });
    } finally {
      this.validation.set(false);
      this.cdr.markForCheck();
    }
  }

  async refuserPaiement(d: DemandeEnrichie): Promise<void> {
    this.cache.upsertDemandePaiement({ ...d, statut: 'refuse' });
    this.cdr.markForCheck();
  }

  // ── Helpers ───────────────────────────────────────────────────

  classeNom(id: string): string {
    return this.cache.classesMap().get(id)?.nom_classe ?? id ?? '—';
  }

  labelStatut(s: string): string {
    return { en_attente:'En attente', valide:'Validé', refuse:'Refusé' }[s] ?? s;
  }

  pct(paye: number, attendu: number): number {
    if (!attendu) return 0;
    return Math.min(100, Math.round((paye / attendu) * 100));
  }

  progCls(paye: number, attendu: number): string {
    const t = this.pct(paye, attendu);
    if (t >= 100) return 'prog-fill prog-fill--vert';
    if (t >= 50)  return 'prog-fill prog-fill--amber';
    return 'prog-fill prog-fill--rouge';
  }

  fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR',
        { day:'2-digit', month:'short', year:'numeric' });
    } catch { return iso; }
  }
}