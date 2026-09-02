// bulletins.component.ts — génération bulletins PDF + WhatsApp moyennes
// Logique WhatsApp : 100% dans WhatsappService
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog }  from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService }     from '../../../../core/services/auth.service';
import { WhatsappService } from '../../../../core/services/whatsapp.service';
import { Eleve, MatiereConfig, Sequence, EleveEnrichi } from '../../../../core/models/last_index';
import { BulletinConfigModal } from '../helper/bulletin-config.modal';
import {
  BulletinConfig, GroupeMatiere, BulletinData,
  NiveauClasse, PVData, PVLigne, FicheSaisieData
} from '../helper/bulletin.models';
import { toFloat, toNote } from '../helper/pdf-helpers';
import { BulletinPdfService } from '../../../../core/services/bulletin-pdf.service';
import { GetServices } from '../../../../core/services/@data';

@Component({
  selector: 'app-bulletins',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ── Barre ── -->
  <div class="bl-bar">

    <select [formControl]="ctrlClasse" class="bl-select"
            (change)="onChangerClasse()">
      <option value="" disabled>Classe…</option>
      @for (c of classesDisponibles(); track c.id_classe) {
        <option [value]="c.id_classe">{{ c.nom_classe }}</option>
      }
    </select>

    <span class="bl-sep"></span>

    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ config.titre }}</span>
      <span class="bl-cfg-seqs">{{ config.sequences.join(' + ') || '—' }}</span>
    </div>

    <button class="bl-btn bl-btn--outline" (click)="ouvrirConfig()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M8 5v3l2 1" stroke="currentColor" stroke-width="1.3"
              stroke-linecap="round"/>
      </svg>
      Configurer
    </button>

    <button class="bl-btn bl-btn--outline"
            [disabled]="!ctrlClasse.value || loading()"
            (click)="charger()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 8A5.5 5.5 0 112.6 5M2 2v4h4" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Charger
    </button>

    @if (rows().length > 0) {
      <span class="bl-sep"></span>

      <button class="bl-btn bl-btn--primary" [disabled]="genAll()"
              (click)="telechargerClasse()">
        @if (genAll()) { <span class="bl-spinner"></span> } @else {
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        }
        Bulletins ({{ rows().length }})
      </button>

      <button class="bl-btn bl-btn--outline" [disabled]="genPV()"
              (click)="telechargerPV()">
        @if (genPV()) {
          <span class="bl-spinner" style="border-top-color:#185FA5"></span>
        } @else {
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="1.5"
                  stroke="currentColor" stroke-width="1.3"/>
            <path d="M5 6h6M5 9h4" stroke="currentColor"
                  stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        }
        PV
      </button>

      <button class="bl-btn bl-btn--outline" (click)="telechargerFicheSaisie()">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Fiche saisie
      </button>

      <!-- WA — agit sur la sélection ou tout si rien sélectionné -->
      <button class="bl-btn bl-btn--wa"
              [disabled]="ciblesWA().length === 0 || envoisWA()"
              (click)="envoyerMoyennesWA()">
        @if (envoisWA()) { <span class="bl-spinner"></span> } @else {
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" stroke="currentColor"
                  stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
        }
        WA moyennes ({{ ciblesWA().length }})
      </button>
    }
  </div>

  <!-- Squelette -->
  @if (loading()) {
    <div class="bl-skeleton">
      @for (_ of [1,2,3,4,5]; track $index) {
        <div class="bl-sk-row">
          <div class="bl-sk-cell bl-sk-cell--wide"></div>
          <div class="bl-sk-cell"></div>
          <div class="bl-sk-cell"></div>
          <div class="bl-sk-cell"></div>
        </div>
      }
    </div>
  }

  <!-- Tableau -->
  @if (!loading() && rows().length > 0) {

    <div class="bl-sel-bar">
      <label class="bl-chk-wrap">
        <input type="checkbox" class="bl-chk"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <span>Tout sélectionner pour WhatsApp</span>
      </label>
      @if (selection().size > 0) {
        <span class="bl-mention bl-mention--info">
          {{ selection().size }} sélectionné(s)
        </span>
        <button class="bl-btn" style="height:26px;font-size:11px;padding:0 10px"
                (click)="viderSelection()">
          Désélectionner
        </button>
      }
    </div>

    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="width:32px"></th>
            <th class="bl-th" style="text-align:left">Élève</th>
            @for (s of config.sequences; track s) {
              <th class="bl-th">Moy. {{ s }}</th>
            }
            @if (config.sequences.length > 1) {
              <th class="bl-th bl-th--trim">Moy. trim.</th>
            }
            <th class="bl-th">Rang</th>
            <th class="bl-th">Mention</th>
            <th class="bl-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.eleve.id_eleve) {
            <tr class="bl-tr" [class.bl-tr--sel]="selection().has(row.eleve.id_eleve)">

              <td class="bl-td bl-td--center">
                <input type="checkbox" class="bl-chk"
                       [checked]="selection().has(row.eleve.id_eleve)"
                       (change)="toggleLigne(row.eleve.id_eleve, $event)">
              </td>

              <td class="bl-td bl-td--name">
                {{ row.eleve.nom }} {{ row.eleve.prenom }}
              </td>

              @for (moy of row.moySeqs; track $index) {
                <td class="bl-td bl-td--center"
                    [class.bl-ok]="(moy ?? -1) >= 10"
                    [class.bl-bad]="moy !== null && moy < 10">
                  {{ moy !== null ? moy.toFixed(2) : '—' }}
                </td>
              }

              @if (config.sequences.length > 1) {
                <td class="bl-td bl-td--center bl-td--trim"
                    [class.bl-ok]="(row.moyTrim ?? -1) >= 10"
                    [class.bl-bad]="row.moyTrim !== null && row.moyTrim < 10">
                  {{ row.moyTrim !== null ? row.moyTrim.toFixed(2) : '—' }}
                </td>
              }

              <td class="bl-td bl-td--center">
                {{ row.rang ?? '—' }}/{{ rows().length }}
              </td>

              <td class="bl-td bl-td--center">
                <span class="bl-mention"
                      [class]="mentionCls(row.moyTrim ?? row.moySeqs[0])">
                  {{ mention(row.moyTrim ?? row.moySeqs[0]) }}
                </span>
              </td>

              <td class="bl-td bl-td--actions">
                <button class="bl-icon-btn" title="Aperçu"
                        (click)="apercu(row.eleve)">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                          stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                </button>
                <button class="bl-icon-btn" title="Télécharger"
                        (click)="telecharger(row.eleve)">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor"
                          stroke-width="1.5" stroke-linecap="round"
                          stroke-linejoin="round"/>
                  </svg>
                </button>
              </td>

            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ rows().length }} élève(s) · {{ config.sequences.length }} séquence(s)
        · {{ config.annee }}
      </span>
    </div>
  }

  @if (!loading() && rows().length === 0 && ctrlClasse.value) {
    <div class="bl-empty">Aucun élève dans cette classe</div>
  }

</div>
  `,
  styles: [`
    .bl-host  { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar   { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-select{ height:32px; padding:0 10px; border:0.5px solid rgba(0,0,0,.18);
                border-radius:6px; font-size:13px; background:white; cursor:pointer; }
    .bl-select:focus { outline:none; border-color:#185FA5; }
    .bl-sep   { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }
    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              transition:opacity .1s; }
    .bl-btn:disabled { opacity:.35; cursor:default; }
    .bl-btn--outline { background:white; color:#333;
                       border:0.5px solid rgba(0,0,0,.18); }
    .bl-btn--outline:not(:disabled):hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:not(:disabled):hover { opacity:.88; }
    .bl-btn--wa { background:#25D366; color:#fff; border:none; }
    .bl-btn--wa:not(:disabled):hover { opacity:.88; }
    .bl-sel-bar  { display:flex; align-items:center; gap:10px; padding:4px 0; }
    .bl-chk-wrap { display:flex; align-items:center; gap:6px; cursor:pointer;
                   font-size:12px; color:#555; }
    .bl-chk      { width:14px; height:14px; cursor:pointer; accent-color:#185FA5; }
    .bl-skeleton { display:flex; flex-direction:column; gap:5px; }
    .bl-sk-row   { display:flex; gap:5px; }
    .bl-sk-cell  { height:30px; min-width:68px; border-radius:4px;
                   background:linear-gradient(90deg,#f0f0f0 25%,#e6e6e6 50%,#f0f0f0 75%);
                   background-size:200% 100%;
                   animation:shimmer 1.2s infinite; }
    .bl-sk-cell--wide { min-width:180px; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .bl-table-wrap { overflow-x:auto; border:0.5px solid rgba(0,0,0,.09);
                     border-radius:8px; }
    .bl-table { border-collapse:collapse; font-size:12px; min-width:100%; }
    .bl-th  { padding:7px 10px; font-weight:500; font-size:11px;
              background:#f8f8f8; color:#666;
              border-bottom:0.5px solid rgba(0,0,0,.08);
              text-align:center; white-space:nowrap; }
    .bl-th--trim { background:#EBF3FC; color:#0C447C; }
    .bl-td  { padding:7px 10px; border-bottom:0.5px solid rgba(0,0,0,.05);
              vertical-align:middle; }
    .bl-td--name    { font-weight:500; }
    .bl-td--center  { text-align:center; }
    .bl-td--trim    { background:#EBF3FC; font-weight:600; color:#0C447C; }
    .bl-td--actions { text-align:center; display:flex; gap:4px;
                      justify-content:center; }
    .bl-tr:last-child .bl-td { border-bottom:none; }
    .bl-tr:hover     .bl-td  { background:rgba(0,0,0,.015); }
    .bl-tr--sel      .bl-td  { background:#EBF3FC !important; }
    .bl-ok  { color:#0F6E56; font-weight:500; }
    .bl-bad { color:#993C1D; font-weight:500; }
    .bl-mention { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--none { color:#bbb; }
    .bl-icon-btn { width:28px; height:28px; padding:0;
                   border:0.5px solid rgba(0,0,0,.12); background:white;
                   cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555; }
    .bl-icon-btn:hover { background:#EBF3FC; color:#185FA5; border-color:#B5D4F4; }
    .bl-spinner { width:13px; height:13px; border-radius:50%;
                  border:2px solid rgba(255,255,255,.3);
                  border-top-color:#fff;
                  animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .bl-foot      { display:flex; justify-content:space-between; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px; color:#ccc; font-size:13px; }
  `],
})
export class BulletinsComponent implements OnInit {

  private auth   = inject(AuthService);
  private wa     = inject(WhatsappService);  // ← toute la logique WA est ici
  private pdfSvc = inject(BulletinPdfService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);
  private get  = inject(GetServices)

  ctrlClasse = new FormControl('');
  loading    = signal(false);
  genAll     = signal(false);
  genPV      = signal(false);
  envoisWA   = signal(false);   // spinner pendant les envois WA

  selection = signal<Set<string>>(new Set());

  config: BulletinConfig = {
    titre:     'BULLETIN TRIMESTRIEL 1',
    trimestre: 1,
    annee:     `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
    sequences: ['SEQ1', 'SEQ2'],
  };

  private _eleves   = signal<Eleve[]>([]);
  private _matieres = signal<MatiereConfig[]>([]);
  private _groupes  = signal<GroupeMatiere[]>([]);

  classesDisponibles = computed(() => {
    const all = this.get.getClasses() ?? [];
    return this.auth.isAdmin()
      ? all
      : all.filter(c => this.auth.getClassesAssignees().includes(c.id_classe));
  });

  rows = computed(() => {
    const eleves   = this._eleves();
    const matieres = this._matieres();
    if (!eleves.length || !matieres.length) return [];

    const withMoy = eleves.map(eleve => {
      const moySeqs = this.config.sequences.map(seq =>
        this._moySeq(eleve, seq, matieres)
      );
      const valides = moySeqs.filter((v): v is number => v !== null);
      const moyTrim = valides.length
        ? valides.reduce((a, b) => a + b, 0) / valides.length : null;
      return { eleve, moySeqs, moyTrim };
    });

    const sorted = [...withMoy]
      .map(r => r.moyTrim ?? r.moySeqs[0])
      .filter((v): v is number => v !== null)
      .sort((a, b) => b - a);

    return withMoy.map(r => {
      const moy  = r.moyTrim ?? r.moySeqs[0];
      const rang = moy !== null ? sorted.indexOf(moy) + 1 : null;
      return { ...r, rang };
    });
  });

  // ── Sélection ────────────────────────────────────────────────

  toutSelectionne = computed(() =>
    this.rows().length > 0 &&
    this.rows().every(r => this.selection().has(r.eleve.id_eleve))
  );
  selectionPartielle = computed(() =>
    this.selection().size > 0 && !this.toutSelectionne()
  );

  ciblesWA = computed(() =>
    this.selection().size > 0
      ? this.rows().filter(r => this.selection().has(r.eleve.id_eleve))
      : this.rows()
  );

  ngOnInit(): void {
    const classes = this.classesDisponibles();
    if (classes.length) {
      this.ctrlClasse.setValue(classes[0].id_classe);
      this.charger();
    }
  }

  onChangerClasse(): void { this.charger(); }

  ouvrirConfig(): void {
    this.dialog.open(BulletinConfigModal, {
      data: this.config, width: '440px', maxWidth: '95vw',
    }).afterClosed().subscribe((cfg: BulletinConfig | null) => {
      if (cfg) { this.config = cfg; this.cdr.markForCheck(); this.charger(); }
    });
  }

  async charger(): Promise<void> {
    if (!this.ctrlClasse.value) return;
    this.loading.set(true);
    await Promise.resolve();
    const classe   = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value);
    const matieres = classe?.matieres ?? [];
    this._matieres.set(matieres);
    this._eleves.set(
      (classe?.eleves ?? []).slice().sort((a, b) => a.nom.localeCompare(b.nom))
    );
    this._groupes.set(this._buildGroupes(matieres));
    this.selection.set(new Set());
    this.loading.set(false);
    this.cdr.markForCheck();
  }

  toggleLigne(idEleve: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.update(s => {
      const n = new Set(s); checked ? n.add(idEleve) : n.delete(idEleve); return n;
    });
  }
  toggleTout(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.set(
      checked ? new Set(this.rows().map(r => r.eleve.id_eleve)) : new Set()
    );
  }
  viderSelection(): void { this.selection.set(new Set()); }

  // ── WhatsApp — 100% délégué à WhatsappService ───────────────

  async envoyerMoyennesWA(): Promise<void> {
    const cibles  = this.ciblesWA();
    const classe  = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value);
    const periode = this.config.annee;

    this.envoisWA.set(true);
    let envoyes = 0, doublons = 0, echecs = 0;

    for (const row of cibles) {
      // Construit EleveEnrichi avec la classe courante
      const eleveEnrichi: EleveEnrichi = { ...row.eleve, classe };

      const moySeqsPayload = this.config.sequences.map((seq, i) => ({
        seq, moy: row.moySeqs[i] ?? null,
      }));

      const r = await this.wa.envoyerMoyennes(
        eleveEnrichi,
        this.config.titre,
        moySeqsPayload,
        row.moyTrim ?? null,
        row.rang    ?? null,
        this.rows().length,
        null,       // template — null = message par défaut du service
        periode
      );

      if (r === 'envoye')        envoyes++;
      else if (r === 'doublon')  doublons++;
      else                       echecs++;
    }

    this.envoisWA.set(false);
    this.snack.open(
      `${envoyes} envoyé(s) · ${doublons} doublon(s) · ${echecs} sans numéro/échec`,
      'OK', { duration: 4000 }
    );
    this.cdr.markForCheck();
  }

  // ── PDF ───────────────────────────────────────────────────────

  apercu(eleve: Eleve): void {
    this.pdfSvc.apercu(
      this.pdfSvc.genererBulletin(this._buildBulletinData(eleve))
    );
  }

  telecharger(eleve: Eleve): void {
    this.pdfSvc.telecharger(
      this.pdfSvc.genererBulletin(this._buildBulletinData(eleve)),
      `bulletin_${eleve.nom}_${this.config.sequences.join('-')}.pdf`
    );
    this.snack.open('Bulletin téléchargé', '', { duration: 2000 });
  }

  async telechargerClasse(): Promise<void> {
    this.genAll.set(true);
    await Promise.resolve();
    const bulletins = this._eleves().map(e => this._buildBulletinData(e));
    const cls = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value)?.nom_classe ?? '';
    this.pdfSvc.telecharger(
      this.pdfSvc.genererBulletinsClasse(bulletins),
      `bulletins_${cls}_${this.config.sequences.join('-')}.pdf`
    );
    this.genAll.set(false);
    this.snack.open(`${bulletins.length} bulletins générés`, 'OK', { duration: 3000 });
    this.cdr.markForCheck();
  }

  async telechargerPV(): Promise<void> {
    this.genPV.set(true);
    await Promise.resolve();
    const matieres = this._matieres();
    const cls = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value);

    const pvData: PVData = {
      nomClasse: cls?.nom_classe ?? '',
      config:    this.config,
      matieres,
      lignes: this.rows().map((row, i): PVLigne => {
        const moy = row.moyTrim ?? row.moySeqs[0];
        return {
          numero: i + 1,
          eleve:  row.eleve,
          notesParSeq: Object.fromEntries(
            this.config.sequences.map(seq => [
              seq,
              matieres.map(m =>
                toNote(row.eleve.sequences
                  ?.find(s => s.sequence === seq)
                  ?.notes_eleve?.find(n => n.matiere === m.nom_matiere)
                  ?.note_obtenue)
              ),
            ])
          ),
          moyParSeq: Object.fromEntries(
            this.config.sequences.map((seq, si) => [seq, row.moySeqs[si]])
          ),
          moyGlobale: moy,
          total: matieres.reduce((acc, m) => {
            const n = toNote(
              row.eleve.sequences
                ?.find(s => s.sequence === this.config.sequences[0])
                ?.notes_eleve?.find(n => n.matiere === m.nom_matiere)
                ?.note_obtenue
            );
            return acc + (n !== null ? n * toFloat(m.coefficient) : 0);
          }, 0),
          rang:     row.rang,
          decision: moy !== null ? (moy >= 10 ? 'ADMIS' : 'ECHEC') : '',
        };
      }),
    };

    this.pdfSvc.telecharger(
      this.pdfSvc.genererPV(pvData),
      `PV_${cls?.nom_classe}_${this.config.sequences.join('-')}.pdf`
    );
    this.genPV.set(false);
    this.snack.open('PV généré', 'OK', { duration: 2000 });
    this.cdr.markForCheck();
  }

  telechargerFicheSaisie(): void {
    const cls = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value);
    const fdata: FicheSaisieData = {
      nomClasse: cls?.nom_classe ?? '',
      nomEcole:  'CSB BERCEAU DU SAVOIR',
      sequences: this.config.sequences,
      annee:     this.config.annee,
      matieres:  this._matieres(),
      eleves:    this._eleves(),
    };
    this.pdfSvc.telecharger(
      this.pdfSvc.genererFicheSaisie(fdata),
      `fiche-saisie_${cls?.nom_classe}_${this.config.sequences.join('-')}.pdf`
    );
    this.snack.open('Fiche de saisie générée', '', { duration: 2000 });
  }

  // ── Helpers privés ───────────────────────────────────────────

  private _buildGroupes(matieres: MatiereConfig[]): GroupeMatiere[] {
    const map = new Map<string, MatiereConfig[]>();
    matieres.forEach(m => {
      const key = (m as any).groupe ?? 'Matières';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries()).map(([nom, mats]) => ({ nom, matieres: mats }));
  }

  private _moySeq(eleve: Eleve, seq: Sequence, matieres: MatiereConfig[]): number | null {
    const notes = eleve.sequences?.find(s => s.sequence === seq)?.notes_eleve ?? [];
    let pts = 0, coeff = 0, has = false;
    matieres.forEach(m => {
      const c = toFloat(m.coefficient);
      const n = toNote(notes.find(n => n.matiere === m.nom_matiere)?.note_obtenue);
      if (n !== null) { pts += n * c; has = true; }
      coeff += c;
    });
    return has && coeff > 0 ? pts / coeff : null;
  }

  private _buildBulletinData(eleve: Eleve): BulletinData {
    const classe = (this.get.getClasses() ?? [])
      .find(c => c.id_classe === this.ctrlClasse.value);
    const rws  = this.rows();
    const row  = rws.find(r => r.eleve.id_eleve === eleve.id_eleve);
    const moys = rws
      .map(r => r.moyTrim ?? r.moySeqs[0])
      .filter((v): v is number => v !== null);

    return {
      eleve,
      nomClasse:         classe?.nom_classe ?? '',
      niveau:            this._detectNiveau(classe?.nom_classe ?? ''),
      config:            this.config,
      groupes:           this._groupes(),
      rang:              row?.rang ?? null,
      effectif:          rws.length,
      moyPremier:        moys.length ? Math.max(...moys) : null,
      moyDernier:        moys.length ? Math.min(...moys) : null,
      tauxReussite:      moys.length
        ? (moys.filter(m => m >= 10).length / moys.length) * 100 : null,
      moyGeneraleClasse: moys.length
        ? moys.reduce((a, b) => a + b, 0) / moys.length : null,
      absJustifiees: 0, absNonJustifiees: 0, appreciations: '',
      avertissementConduite: false, blameConduite: false,
      consigne: 0, exclusion: 0, retards: 0, conseilDiscipline: false,
    };
  }

  private _detectNiveau(nomClasse: string): NiveauClasse {
    const n = nomClasse.toLowerCase();
    if (n.includes('tech') || n.includes('pro'))   return 'technique';
    if (n.includes('ang')  || n.includes('bil'))   return 'secondaire-ang';
    if (['cm','ce','cp'].some(x => n.includes(x))) return 'primaire';
    return 'secondaire-fr';
  }

  mention(moy: number | null): string {
    if (moy === null) return '—';
    if (moy >= 16) return 'Félicitations';
    if (moy >= 14) return 'Compliments';
    if (moy >= 12) return 'Encouragements';
    if (moy >= 10) return 'Admis(e)';
    return 'Avertissement';
  }

  mentionCls(moy: number | null): string {
    if (moy === null) return 'bl-mention--none';
    if (moy >= 10)    return 'bl-mention--ok';
    if (moy >= 8)     return 'bl-mention--warn';
    return 'bl-mention--bad';
  }
}