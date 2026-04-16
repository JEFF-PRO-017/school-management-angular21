// ─────────────────────────────────────────────────────────────────
// eleves-list.component.ts
// Template bulletins (bl-*) — même structure que familles-list
//
// Règles Angular respectées :
//  - Pas d'arrow functions dans le template
//  - Pas d'expressions complexes dans {{ }} ni [class]
//  - Filtres via setClasse() / setStatut() — pas de signal.set() direct
//  - Logique complexe dans des computed() ou méthodes TS
// ─────────────────────────────────────────────────────────────────
import {
  Component, inject, computed, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CacheService } from '../../../core/services/cache.service';
import { DataService } from '../../../core/services/data.service';
import { Eleve } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EleveModalComponent, EleveModalData } from '../modal/eleve-modal.component';

type FiltreStatut = '' | 'actif' | 'archive';

@Component({
  selector: 'app-eleves-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
<div class="bl-host">

  <!-- ══ BARRE PRINCIPALE ══ -->
  <div class="bl-bar">

    <input [formControl]="search" placeholder="Nom, prénom, famille…" class="bl-input">

    <span class="bl-sep"></span>

    <!-- Résumé filtres actifs -->
    <div class="bl-cfg-summary">
      <span class="bl-cfg-titre">{{ resumeTitre() }}</span>
      <span class="bl-cfg-seqs">{{ resumeSous() }}</span>
    </div>

    <button class="bl-btn bl-btn--outline" (click)="toggleFiltres()">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor"
              stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Filtres
    </button>

    <span class="bl-sep"></span>

    <!-- Nouvel élève — ouvre le modal sans navigation -->
    <button class="bl-btn bl-btn--primary" (click)="ouvrirModalEleve(null)">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Nouvel élève
    </button>
  </div>

  <!-- ══ BARRE CHIPS FILTRES ══ -->
  @if (showFiltres()) {
    <div class="bl-chips-bar">

      <span class="bl-chips-lbl">Classe</span>
      <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === ''"
              (click)="setClasse('')">Toutes</button>
      @for (c of classes(); track c.id_classe) {
        <button class="bl-chip" [class.bl-chip--on]="filtreClasse() === c.id_classe"
                (click)="setClasse(c.id_classe)">{{ c.nom_classe }}</button>
      }

      <span class="bl-sep"></span>

      <span class="bl-chips-lbl">Statut</span>
      @for (opt of optsStatut; track opt.val) {
        <button class="bl-chip" [class.bl-chip--on]="filtreStatut() === opt.val"
                (click)="setStatut(opt.val)">{{ opt.lbl }}</button>
      }

    </div>
  }

  <!-- ══ TABLEAU ══ -->
  @if (filtered().length > 0) {
    <div class="bl-table-wrap">
      <table class="bl-table">
        <thead>
          <tr>
            <th class="bl-th" style="text-align:left">Élève</th>
            <th class="bl-th">Classe</th>
            <th class="bl-th">Famille · contact</th>
            <th class="bl-th bl-th--trim">Solde pension</th>
            <th class="bl-th">Statut</th>
            <th class="bl-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (e of filtered(); track e.id_eleve) {
            <tr class="bl-tr">

              <!-- Nom + avatar -->
              <td class="bl-td bl-td--name">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="bl-av"
                       [style.background]="avBg(e.id_eleve)"
                       [style.color]="avTxt(e.id_eleve)">
                    {{ initiales(e.nom, e.prenom) }}
                  </div>
                  <div>
                    <div>{{ e.nom }} {{ e.prenom }}</div>
                    @if (e.matricule) {
                      <div style="font-size:10px;color:#aaa">{{ e.matricule }}</div>
                    }
                  </div>
                </div>
              </td>

              <!-- Classe -->
              <td class="bl-td bl-td--center">
                @if (nomClasse(e.id_classe)) {
                  <span class="bl-mention bl-mention--info">
                    {{ nomClasse(e.id_classe) }}
                  </span>
                } @else {
                  <span style="color:#bbb">—</span>
                }
              </td>

              <!-- Famille + contact père -->
              <td class="bl-td bl-td--center" style="font-size:11px">
                <div style="font-weight:500;color:#333">{{ nomFamille(e.id_famille) }}</div>
                <div style="color:#aaa">{{ telFamille(e.id_famille) }}</div>
              </td>

              <!-- Solde pension — colonne accentuée comme moy. trim. -->
              <td class="bl-td bl-td--center bl-td--trim"
                  [class.bl-ok]="soldeOk(e.id_eleve)"
                  [class.bl-bad]="soldeKo(e.id_eleve)">
                @if (soldeLabel(e.id_eleve)) {
                  <span [class]="soldeMentionCls(e.id_eleve)">
                    {{ soldeLabel(e.id_eleve) }}
                  </span>
                } @else {
                  <span style="color:#bbb">—</span>
                }
              </td>

              <!-- Statut actif / archivé -->
              <td class="bl-td bl-td--center">
                <span [class]="statutCls(e.statut)">{{ e.statut }}</span>
              </td>

              <!-- Actions -->
              <td class="bl-td bl-td--center">
                <div style="display:flex;gap:4px;justify-content:center">
 <!-- voir le detail de la famille? -->
                  <button [routerLink]="['/familles', e.id_famille]" class="bl-icon-btn" title="voir la famille">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="5" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                        <circle cx="11" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        <path d="M10 9.5c2.2 0 4 1.5 4 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                  </button>
              

                  <!-- Modifier élève -->
                  <button class="bl-icon-btn" title="Modifier"
                          (click)="ouvrirModalEleve(e)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>

                  <!-- Voir paiements famille -->
                  <a [routerLink]="['/familles']"
                     [queryParams]="{ selected: e.id_famille }"
                     class="bl-icon-btn" title="Voir la famille"
                     style="text-decoration:none">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="5" cy="5" r="2.5"
                              stroke="currentColor" stroke-width="1.3"/>
                      <circle cx="11" cy="5" r="2.5"
                              stroke="currentColor" stroke-width="1.3"/>
                      <path d="M1 13c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round"/>
                      <path d="M10 9.5c2.2 0 4 1.5 4 3.5"
                            stroke="currentColor" stroke-width="1.3"
                            stroke-linecap="round"/>
                    </svg>
                  </a>

                  <!-- Archiver / Réactiver -->
                  <button class="bl-icon-btn" [title]="e.statut === 'actif' ? 'Archiver' : 'Réactiver'"
                          [class.bl-icon-btn--warn]="e.statut === 'actif'"
                          (click)="toggleStatut(e)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="3" rx="1"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"
                            stroke="currentColor" stroke-width="1.3"/>
                      <path d="M6 9h4" stroke="currentColor"
                            stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                  </button>

                  <!-- Supprimer -->
                  <button class="bl-icon-btn bl-icon-btn--del" title="Supprimer"
                          (click)="confirmerSuppression(e)">
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
        {{ filtered().length }} élève(s)
        · {{ nbActifs() }} actif(s)
        · {{ nbArchives() }} archivé(s)
      </span>
      <span class="bl-foot-info">
        {{ nbClasses() }} classe(s) représentée(s)
      </span>
    </div>

  } @else if (hasFiltre()) {
    <div class="bl-empty">Aucun élève ne correspond à ces critères</div>
  } @else {
    <div class="bl-empty">
      Aucun élève enregistré —
      <span style="color:#185FA5;cursor:pointer"
            (click)="ouvrirModalEleve(null)">
        ajouter le premier
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
                background:white; outline:none; width:200px; }
    .bl-input:focus { border-color:#185FA5; }

    .bl-sep { width:0.5px; height:20px; background:rgba(0,0,0,.1); }

    .bl-cfg-summary { display:flex; flex-direction:column; gap:1px; }
    .bl-cfg-titre   { font-size:12px; font-weight:500; }
    .bl-cfg-seqs    { font-size:10px; color:#185FA5; }

    .bl-btn { height:32px; padding:0 14px; border-radius:6px;
              font-size:13px; cursor:pointer;
              display:inline-flex; align-items:center; gap:5px;
              text-decoration:none; white-space:nowrap;
              transition:opacity .1s; }
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

    /* Pills mentions — identiques familles-list */
    .bl-mention       { font-size:11px; padding:2px 7px; border-radius:99px; }
    .bl-mention--ok   { background:#EAF3DE; color:#27500A; }
    .bl-mention--warn { background:#FAEEDA; color:#633806; }
    .bl-mention--bad  { background:#FCEBEB; color:#791F1F; }
    .bl-mention--info { background:#EBF3FC; color:#0C447C; }
    .bl-mention--neu  { background:#f5f5f5; color:#555; }

    /* Boutons icône */
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
export class ElevesListComponent implements OnInit {

  private cache = inject(CacheService);
  private data = inject(DataService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  search = new FormControl('');
  filtreClasse = signal('');
  filtreStatut = signal<FiltreStatut>('actif');
  showFiltres = signal(true);

  optsStatut: { val: FiltreStatut; lbl: string }[] = [
    { val: '', lbl: 'Tous' },
    { val: 'actif', lbl: 'Actifs' },
    { val: 'archive', lbl: 'Archivés' },
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
    this.search.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  // ── Résumé pour la barre ──
  resumeTitre = computed<string>(() => {
    const c = this.filtreClasse();
    return c ? this.nomClasse(c) : 'Tous les élèves';
  });

  resumeSous = computed<string>(() => {
    const s = this.filtreStatut();
    const lbl = this.optsStatut.find(o => o.val === s)?.lbl ?? 'Tous';
    return `${this.filtered().length} résultat(s) · ${lbl}`;
  });

  hasFiltre(): boolean {
    return !!(this.search.value)
      || this.filtreClasse() !== ''
      || this.filtreStatut() !== 'actif';
  }

  // ── Setters filtres — méthodes TS, pas d'arrow functions dans le template ──
  toggleFiltres(): void { this.showFiltres.set(!this.showFiltres()); }
  setClasse(v: string): void { this.filtreClasse.set(v); }
  setStatut(v: FiltreStatut): void { this.filtreStatut.set(v); }

  // ── Données ──
  classes = computed(() => this.cache.getClasses() ?? []);

  filtered = computed(() => {
    const q = (this.search.value ?? '').toLowerCase();
    const classe = this.filtreClasse();
    const statut = this.filtreStatut();
    const fMap = this.cache.famillesMap();
    const cMap = this.cache.classesMap();

    return (this.cache.getEleves() ?? [])
      .filter(e => !statut || e.statut === statut)
      .filter(e => !classe || e.id_classe === classe)
      .filter(e => {
        if (!q) return true;
        const nom = `${e.nom} ${e.prenom}`.toLowerCase();
        const fam = fMap.get(e.id_famille)?.nom_famille?.toLowerCase() ?? '';
        return nom.includes(q) || fam.includes(q);
      })
      .map(e => ({ ...e, _famille: fMap.get(e.id_famille), _classe: cMap.get(e.id_classe) }));
  });

  // ── Totaux pied ──
  nbActifs = computed(() => this.filtered().filter(e => e.statut === 'actif').length);
  nbArchives = computed(() => this.filtered().filter(e => e.statut === 'archive').length);
  nbClasses = computed(() => new Set(this.filtered().map(e => e.id_classe)).size);

  // ── Helpers données ──

  nomClasse(id: string): string {
    return this.cache.classesMap().get(id)?.nom_classe ?? '';
  }

  nomFamille(idFamille: string): string {
    return this.cache.famillesMap().get(idFamille)?.nom_famille ?? '—';
  }

  telFamille(idFamille: string): string {
    return this.cache.famillesMap().get(idFamille)?.tel_pere ?? '—';
  }

  // ── Solde pension — depuis le cache soldes ──
  private getSolde(idEleve: string) {
    return (this.cache.getSoldes() ?? []).find(s => s.id_eleve === idEleve);
  }

  // Méthodes nommées pour éviter les expressions complexes dans le template
  soldeOk(idEleve: string): boolean {
    const s = this.getSolde(idEleve);
    return !!s && !s.statut_insolvable && s.reste_a_payer <= 0;
  }

  soldeKo(idEleve: string): boolean {
    const s = this.getSolde(idEleve);
    return !!s && s.statut_insolvable;
  }

  soldeLabel(idEleve: string): string {
    const s = this.getSolde(idEleve);
    if (!s) return '';
    if (s.reste_a_payer <= 0) return 'Soldé ✓';
    return `${new Intl.NumberFormat('fr-FR').format(Math.round(s.reste_a_payer))} FCFA`;
  }

  soldeMentionCls(idEleve: string): string {
    const s = this.getSolde(idEleve);
    if (!s) return '';
    if (s.reste_a_payer <= 0) return 'bl-mention bl-mention--ok';
    if (s.statut_insolvable) return 'bl-mention bl-mention--bad';
    return 'bl-mention bl-mention--warn';
  }

  // Statut pill class — méthode nommée, pas de ternaire dans [class]
  statutCls(statut: string): string {
    return statut === 'actif'
      ? 'bl-mention bl-mention--ok'
      : 'bl-mention bl-mention--neu';
  }

  // ── Avatar ──
  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }

  private hashIdx(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }

  avBg(id: string): string { return this.palette[this.hashIdx(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hashIdx(id)].txt; }

  // ── Actions ──

  ouvrirModalEleve(e: Eleve | null): void {
    // Trouve la famille de l'élève, ou null si nouvel élève
    const famille = e
      ? this.cache.famillesMap().get(e.id_famille) ?? null
      : null;

    if (!famille && e) {
      this.snack.open('Famille introuvable pour cet élève', 'OK', { duration: 3000 });
      return;
    }

    // Pour un nouvel élève sans famille connue, on ouvre le modal sans famille
    // L'utilisateur choisira la famille dans le formulaire
    this.dialog.open(EleveModalComponent, {
      data: { famille, eleve: e ?? undefined } as EleveModalData,
      width: '460px',
      maxWidth: '96vw',
    }).afterClosed().subscribe(r => {
      if (r?.success) this.cdr.markForCheck();
    });
  }

  toggleStatut(e: Eleve): void {
    const nouveau = e.statut === 'actif' ? 'archive' : 'actif';
    const maj = { ...e, statut: nouveau } as Eleve;
    this.data.updateEleve(maj).then(() => {
      this.data.updateEleve(maj);
      this.snack.open(
        `Élève ${nouveau === 'actif' ? 'réactivé' : 'archivé'}`,
        'OK',
        { duration: 3000 }
      );
      this.cdr.markForCheck();
    });
  }

  confirmerSuppression(e: Eleve): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer l\'élève',
        message: `Supprimer ${e.nom} ${e.prenom} ? Cette action est irréversible.`,
        confirm: 'Supprimer',
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.cache.removeEleve(e.id_eleve);
      this.data.deleteEleve(e.id_eleve);
      this.snack.open('Élève supprimé', 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    });
  }
}