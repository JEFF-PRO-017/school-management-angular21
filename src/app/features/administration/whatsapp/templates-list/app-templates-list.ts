// templates-list.component.ts — liste des templates WhatsApp
// Modal intégré : création et modification via TemplateFormComponent
// Filtres : type + langue + statut actif/inactif (tous en signal() purs)
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MsgTemplate } from '../../../../core/models/last_index';
import { TemplateFormComponent, TemplateModalData } from '../template-form/template-form.component';
import { GetServices } from '../../../../core/services/@data';


type FiltreActif = 'tous' | 'actif' | 'inactif';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
<div class="bl-host">

  <!-- ══ BARRE ══ -->
  <div class="bl-bar">
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">Templates WhatsApp</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <span class="bl-sep"></span>

    <!-- Journal -->
    <a routerLink="/espace-administration/whatsapp/alertes" class="bl-btn">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 12V4l5 4 5-4v8H2z" stroke="currentColor"
              stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      Journal envois
    </a>

    <!-- Nouveau template — ouvre le modal -->
    <button class="bl-btn bl-btn--primary" (click)="ouvrirModal(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouveau template
    </button>
  </div>

  <!-- ══ CHIPS FILTRES ══ -->
  <div class="bl-chips-bar">

    <span class="bl-chips-lbl">Type</span>
    <button class="bl-chip" [class.bl-chip--on]="filtreType() === ''"
            (click)="setType('')">Tous</button>
    @for (t of typesDispos(); track t) {
      <button class="bl-chip" [class.bl-chip--on]="filtreType() === t"
              (click)="setType(t)">{{ t }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Langue</span>
    <button class="bl-chip" [class.bl-chip--on]="filtreLangue() === ''"
            (click)="setLangue('')">Toutes</button>
    @for (l of languesDispos(); track l) {
      <button class="bl-chip" [class.bl-chip--on]="filtreLangue() === l"
              (click)="setLangue(l)">{{ l === 'fr' ? 'Français' : 'Anglais' }}</button>
    }

    <span class="bl-sep"></span>

    <span class="bl-chips-lbl">Statut</span>
    @for (opt of optsActif; track opt.val) {
      <button class="bl-chip" [class.bl-chip--on]="filtreActif() === opt.val"
              (click)="setActif(opt.val)">{{ opt.lbl }}</button>
    }

  </div>

  <!-- ══ AIDE VARIABLES ══ -->
  <div class="bl-aide">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
      <circle cx="8" cy="8" r="6" stroke="#185FA5" stroke-width="1.2"/>
      <path d="M8 7v4M8 5.5v.5" stroke="#185FA5"
            stroke-width="1.3" stroke-linecap="round"/>
    </svg>
    Variables :
    <code>{{'{nom_eleve}'}}</code>
    <code>{{'{montant}'}}</code>
    <code>{{'{date}'}}</code>
    <code>{{'{classe}'}}</code>
    <code>{{'{nom_famille}'}}</code>
    <code>{{'{rdv}'}}</code>
    <code>{{'{restant}'}}</code>
  </div>

  <!-- ══ CONTENU ══ -->
  @if (loading()) {
    <div class="bl-empty">Chargement…</div>

  } @else if (filtered().length === 0) {
    <div class="bl-empty">
      @if (templates().length === 0) {
        Aucun template —
        <span style="color:#185FA5;cursor:pointer"
              (click)="ouvrirModal(null)">créer le premier</span>
      } @else {
        Aucun résultat pour ces filtres
      }
    </div>

  } @else {
    <div class="bl-grid">
      @for (t of filtered(); track t.id_template) {
        <div class="bl-card" [class.bl-card--off]="!t.actif">

          <!-- En-tête carte -->
          <div class="bl-card-head">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
              <span class="bl-card-title">{{ t.objet }}</span>
              <span class="bl-pill bl-pill--info">{{ t.type }}</span>
              @if (t.destinataire) {
                <span class="bl-pill bl-pill--neu">{{ t.destinataire }}</span>
              }
            </div>
            <!-- Toggle actif -->
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span style="font-size:10px;color:#aaa">
                {{ t.actif ? 'Actif' : 'Inactif' }}
              </span>
              <div class="tog" [class.on]="t.actif"
                   (click)="toggleActif(t)">
              </div>
            </div>
          </div>

          <!-- Aperçu contenu -->
          <div class="bl-card-body">
            <div class="bl-preview">{{ t.contenu }}</div>
          </div>

          <!-- Pied carte -->
          <div class="bl-card-foot">
            @if (t.langue) {
              <span class="bl-pill bl-pill--neu">
                {{ t.langue === 'fr' ? 'Français' : 'Anglais' }}
              </span>
            }
            <span style="flex:1"></span>

            <!-- Modifier → ouvre le modal avec les données existantes -->
            <button class="bl-icon-btn" title="Modifier"
                    (click)="ouvrirModal(t)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor"
                      stroke-width="1.3" stroke-linecap="round"
                      stroke-linejoin="round"/>
              </svg>
            </button>

            <!-- Supprimer -->
            <button class="bl-icon-btn bl-icon-btn--del" title="Supprimer"
                    (click)="supprimerTemplate(t)">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M3 5h10M6 5V3h4v2M6 8v4M10 8v4"
                      stroke="currentColor" stroke-width="1.3"
                      stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Pied liste -->
    <div class="bl-foot">
      <span class="bl-foot-info">
        {{ filtered().length }} template(s) affiché(s)
        · {{ nbActifs() }} actif(s)
        · {{ templates().length - nbActifs() }} inactif(s)
      </span>
    </div>
  }

</div>
  `,
  styles: [`
    .bl-host        { display:flex; flex-direction:column; gap:12px; font-size:13px; }
    .bl-bar         { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
                      padding-bottom:12px; border-bottom:0.5px solid rgba(0,0,0,.09); }
    .bl-sep         { width:0.5px; height:20px; background:rgba(0,0,0,.1); }
    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px; font-size:13px;
              cursor:pointer; display:inline-flex; align-items:center; gap:5px;
              border:0.5px solid rgba(0,0,0,.18); background:white; color:#333;
              text-decoration:none; white-space:nowrap; }
    .bl-btn:hover { background:#f5f5f5; }
    .bl-btn--primary { background:#185FA5; color:#fff; border:none; }
    .bl-btn--primary:hover { opacity:.88; }

    .bl-chips-bar { display:flex; align-items:center; flex-wrap:wrap; gap:6px;
                    padding-bottom:10px;
                    border-bottom:0.5px solid rgba(0,0,0,.06); }
    .bl-chips-lbl { font-size:11px; color:#aaa; }
    .bl-chip      { height:26px; padding:0 10px; border-radius:6px; font-size:11px;
                    cursor:pointer; border:0.5px solid rgba(0,0,0,.18);
                    background:white; color:#555; transition:all .12s; }
    .bl-chip--on  { background:#EBF3FC; color:#185FA5;
                    border-color:#B5D4F4; font-weight:500; }

    .bl-aide { display:flex; align-items:center; flex-wrap:wrap; gap:7px;
               background:#EBF3FC; border-radius:6px; padding:7px 11px;
               font-size:11px; color:#185FA5; }
    .bl-aide code { background:rgba(24,95,165,.12); border-radius:4px;
                    padding:1px 5px; font-size:10px; font-family:monospace; }

    /* Grille */
    .bl-grid { display:grid;
               grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
               gap:12px; }

    /* Carte */
    .bl-card { background:white; border:0.5px solid rgba(0,0,0,.09);
               border-radius:8px; overflow:hidden;
               display:flex; flex-direction:column; transition:opacity .15s; }
    .bl-card--off { opacity:.5; }
    .bl-card-head { display:flex; align-items:center; gap:7px;
                    padding:9px 12px;
                    border-bottom:0.5px solid rgba(0,0,0,.07);
                    background:#f8f8f8; }
    .bl-card-title { font-size:12px; font-weight:500; color:#333;
                     white-space:nowrap; overflow:hidden;
                     text-overflow:ellipsis; min-width:0; flex:1; }
    .bl-card-body  { padding:10px 12px; flex:1; }
    .bl-card-foot  { display:flex; align-items:center; gap:6px;
                     padding:7px 12px;
                     border-top:0.5px solid rgba(0,0,0,.07); }

    .bl-preview { font-size:11px; color:#666; line-height:1.5;
                  background:#f8f8f8; border-radius:5px; padding:8px 10px;
                  max-height:72px; overflow:hidden;
                  display:-webkit-box; -webkit-line-clamp:4;
                  -webkit-box-orient:vertical;
                  font-family:monospace; white-space:pre-wrap; }

    /* Pills */
    .bl-pill       { font-size:10px; padding:2px 6px; border-radius:99px;
                     white-space:nowrap; display:inline-block; flex-shrink:0; }
    .bl-pill--info { background:#EBF3FC; color:#0C447C; }
    .bl-pill--neu  { background:#f5f5f5; color:#555; }

    /* Toggle */
    .tog     { width:30px; height:17px; border-radius:9px; background:#ccc;
               position:relative; cursor:pointer; transition:background .2s;
               display:inline-block; flex-shrink:0; }
    .tog.on  { background:#185FA5; }
    .tog::after { content:''; position:absolute; top:2px; left:2px; width:13px;
                  height:13px; background:white; border-radius:50%;
                  transition:transform .2s; }
    .tog.on::after { transform:translateX(13px); }

    /* Boutons icône */
    .bl-icon-btn { width:28px; height:28px; border:0.5px solid rgba(0,0,0,.12);
                   background:white; cursor:pointer; border-radius:5px;
                   display:inline-flex; align-items:center;
                   justify-content:center; color:#555; }
    .bl-icon-btn:hover       { background:#EBF3FC; color:#185FA5;
                                border-color:#B5D4F4; }
    .bl-icon-btn--del:hover  { background:#FCEBEB; color:#A32D2D;
                                border-color:#F09595; }

    .bl-foot      { display:flex; justify-content:space-between;
                    align-items:center; flex-wrap:wrap; gap:8px; }
    .bl-foot-info { font-size:11px; color:#aaa; }
    .bl-empty     { text-align:center; padding:40px; color:#ccc; font-size:13px; }
  `],
})
export class TemplatesListComponent implements OnInit {

  private data = inject(GetServices);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  templates = signal<MsgTemplate[]>([]);
  loading = signal(true);

  // ── Filtres — tous en signal() purs ──────────────────────────────
  filtreType = signal('');
  filtreLangue = signal('');
  filtreActif = signal<FiltreActif>('tous');

  optsActif: { val: FiltreActif; lbl: string }[] = [
    { val: 'tous', lbl: 'Tous' },
    { val: 'actif', lbl: 'Actifs' },
    { val: 'inactif', lbl: 'Inactifs' },
  ];

  // Setters — méthodes TS, signal.set() jamais dans le template
  setType(v: string): void { this.filtreType.set(v); }
  setLangue(v: string): void { this.filtreLangue.set(v); }
  setActif(v: FiltreActif): void { this.filtreActif.set(v); }

  // ── Computed ──────────────────────────────────────────────────────

  typesDispos = computed<string[]>(() =>
    [...new Set(this.templates().map(t => t.type).filter(Boolean))]
  );

  languesDispos = computed<string[]>(() =>
    [...new Set(this.templates().map(t => t.langue).filter(Boolean))]
  );

  filtered = computed<MsgTemplate[]>(() => {
    const type = this.filtreType();
    const langue = this.filtreLangue();
    const actif = this.filtreActif();

    return this.templates().filter(t => {
      if (type && t.type !== type) return false;
      if (langue && t.langue !== langue) return false;
      if (actif === 'actif' && !t.actif) return false;
      if (actif === 'inactif' && t.actif) return false;
      return true;
    });
  });

  nbActifs = computed(() => this.templates().filter(t => t.actif).length);

  resumeSous = computed(() => {
    const f = this.filtered().length;
    const t = this.templates().length;
    return `${f} / ${t} template(s) · ${this.nbActifs()} actif(s)`;
  });

  // ── Init ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.templates.set(this.data.getTemplates());
    this.loading.set(false);
    this.cdr.markForCheck();
  }

  // ── Actions ──────────────────────────────────────────────────────

  /** Ouvre le modal création (tpl=null) ou modification (tpl=objet existant) */
  ouvrirModal(tpl: MsgTemplate | null): void {
    this.dialog.open(TemplateFormComponent, {
      data: { template: tpl ?? undefined } satisfies TemplateModalData,
      width: '560px',
      maxWidth: '96vw',
    }).afterClosed().subscribe((r: { success: boolean; template: MsgTemplate } | undefined) => {
      if (!r?.success) return;

      // Upsert local : remplace si modification, ajoute si création
      this.templates.update(list => {
        const idx = list.findIndex(x => x.id_template === r.template.id_template);
        return idx === -1
          ? [...list, r.template]
          : list.map((x, i) => i === idx ? r.template : x);
      });

      this.cdr.markForCheck();
    });
  }

  /** Bascule actif/inactif localement (persistance à implémenter via DataService) */
  toggleActif(t: MsgTemplate): void {
    const maj = { ...t, actif: !t.actif };
    this.templates.update(list =>
      list.map(x => x.id_template === t.id_template ? maj : x)
    );
    this.snack.open(
      `Template ${maj.actif ? 'activé' : 'désactivé'}`,
      '',
      { duration: 2000 }
    );
    this.cdr.markForCheck();
  }

  /** Supprime localement — la persistance Sheets est à câbler sur DataService */
  supprimerTemplate(t: MsgTemplate): void {
    this.templates.update(list =>
      list.filter(x => x.id_template !== t.id_template)
    );
    this.snack.open('Template supprimé', 'OK', { duration: 3000 });
    this.cdr.markForCheck();
  }
}