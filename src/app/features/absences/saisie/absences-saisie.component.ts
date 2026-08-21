// absences-saisie.component.ts
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { CacheService } from '../../../core/services/cache.service';
import { AuthService } from '../../../core/services/auth.service';
import { FamilleService, PointageModalData, PointageResult, Absence, Classe } from '../../../core/models';
import { EleveData } from '../../insolvables/insolvables-list/insolvables-list.component';
import { PointageModalComponent } from './components/pointage-modal.component';
import { AddServices, GetServices } from '../../../core/services/@data';

type ViewMode = 'grille' | 'liste';

@Component({
  selector: 'app-absences-saisie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
<div class="d-flex flex-column gap-3" style="font-size:13px">

  <!-- ══ BARRE OUTILS ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <div class="d-flex flex-column" style="gap:1px">
      <span class="fw-medium" style="font-size:12px">Saisie des absences</span>
      <span class="text-primary" style="font-size:10px">{{ resumeSous() }}</span>
    </div>

    <div class="vr mx-1"></div>
    <span class="badge text-bg-light border">{{ dateAuj }} · {{ heureAuj }}</span>
    <div class="vr mx-1"></div>

    <div class="btn-group btn-group-sm" role="group">
      <button type="button" class="btn"
              [class.btn-primary]="mode() === 'grille'"
              [class.btn-outline-secondary]="mode() !== 'grille'"
              (click)="mode.set('grille')" title="Vue grille">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
          <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
          <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        Grille
      </button>
      <button type="button" class="btn"
              [class.btn-primary]="mode() === 'liste'"
              [class.btn-outline-secondary]="mode() !== 'liste'"
              (click)="mode.set('liste')" title="Vue liste">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M4 4h9M4 8h9M4 12h9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="1.5" cy="4"  r="1" fill="currentColor"/>
          <circle cx="1.5" cy="8"  r="1" fill="currentColor"/>
          <circle cx="1.5" cy="12" r="1" fill="currentColor"/>
        </svg>
        Liste
      </button>
    </div>

    <div class="vr mx-1"></div>

    <button class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" (click)="enregistrer()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 8l4 4 6-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Enregistrer ({{ absents().size }})
    </button>
  </div>

  <!-- ══ CHIPS CLASSES ══ -->
  <div class="d-flex align-items-center flex-wrap gap-2 pb-2 border-bottom">
    <span class="text-muted" style="font-size:11px">Classe</span>
    @for (c of classes(); track c.id_classe) {
      <button class="btn btn-sm position-relative"
              [class.btn-primary]="classeId() === c.id_classe"
              [class.btn-outline-secondary]="classeId() !== c.id_classe"
              style="font-size:11px;padding:2px 10px"
              (click)="setClasse(c.id_classe)">
        {{ c.nom_classe }}
        @if (nbAbsentsClasse(c.id_classe) > 0) {
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:9px">
            {{ nbAbsentsClasse(c.id_classe) }}
          </span>
        }
      </button>
    }
  </div>

  <!-- ══ CONTENU ══ -->
  @if (!classeId()) {
    <div class="d-flex flex-column align-items-center justify-content-center py-5 text-muted gap-2">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="color:#ddd">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Sélectionnez une classe pour commencer
    </div>

  } @else if (eleves().length === 0) {
    <div class="text-center text-muted py-5">Aucun élève actif dans cette classe</div>

  } @else {

    <div class="d-flex align-items-center flex-wrap gap-3 py-1">
      <div class="form-check mb-0">
        <input type="checkbox" class="form-check-input" id="chkTout"
               [checked]="toutSelectionne()"
               [indeterminate]="selectionPartielle()"
               (change)="toggleTout($event)">
        <label class="form-check-label" for="chkTout" style="font-size:12px">Tout marquer absent</label>
      </div>

      @if (absents().size > 0) {
        <span class="badge text-bg-danger">{{ absents().size }} absent(s)</span>
        <button class="btn btn-sm btn-outline-secondary" style="font-size:11px;padding:1px 8px"
                (click)="absents.set(emptySet())">Tout décocher</button>
      } @else {
        <span class="text-muted" style="font-size:11px">Cochez les élèves absents</span>
      }

      <span class="ms-auto text-muted" style="font-size:11px">{{ eleves().length }} élève(s)</span>
    </div>

    @if (mode() === 'grille') {
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px">
        @for (e of eleves(); track e.id_eleve) {
          <label class="d-flex align-items-center gap-2 p-2 rounded border position-relative"
                 style="cursor:pointer;transition:all .15s;user-select:none"
                 [style.background]="estAbsent(e.id_eleve) ? '#fff5f5' : 'white'"
                 [style.border-color]="estAbsent(e.id_eleve) ? '#dc3545' : 'rgba(0,0,0,.09)'">

            <input type="checkbox" class="position-absolute opacity-0" style="width:0;height:0"
                   [checked]="estAbsent(e.id_eleve)"
                   (change)="toggleAbsent(e.id_eleve, $event)">

            <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                 style="width:36px;height:36px;font-size:12px;font-weight:600"
                 [style.background]="avBg(e.id_eleve)" [style.color]="avTxt(e.id_eleve)">
              {{ initiales(e.nom, e.prenom) }}
            </div>

            <div class="flex-fill" style="min-width:0">
              <div class="text-truncate fw-medium" style="font-size:12px"
                   [style.color]="e.insolvable ? '#dc3545' : '#333'">
                {{ e.nom }} {{ e.prenom }}
              </div>
              @if (e.insolvable) {
                <div class="text-danger fw-medium" style="font-size:10px">Pension en retard</div>
              }
            </div>

            @if (estAbsent(e.id_eleve)) {
              <div class="rounded-circle bg-danger d-flex align-items-center justify-content-center flex-shrink-0"
                   style="width:22px;height:22px">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            }
          </label>
        }
      </div>
    }

    @if (mode() === 'liste') {
      <div class="table-responsive border rounded">
        <table class="table table-sm table-hover mb-0" style="font-size:12px">
          <thead class="table-light">
            <tr>
              <th style="width:36px">
                <input type="checkbox" class="form-check-input"
                       [checked]="toutSelectionne()"
                       [indeterminate]="selectionPartielle()"
                       (change)="toggleTout($event)">
              </th>
              <th class="text-start">Élève</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Pension</th>
            </tr>
          </thead>
          <tbody>
            @for (e of eleves(); track e.id_eleve) {
              <tr [style.background]="estAbsent(e.id_eleve) ? '#fff5f5' : ''">
                <td class="text-center align-middle">
                  <input type="checkbox" class="form-check-input"
                         [checked]="estAbsent(e.id_eleve)"
                         (change)="toggleAbsent(e.id_eleve, $event)">
                </td>
                <td class="align-middle">
                  <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                         style="width:28px;height:28px;font-size:10px;font-weight:600"
                         [style.background]="avBg(e.id_eleve)" [style.color]="avTxt(e.id_eleve)">
                      {{ initiales(e.nom, e.prenom) }}
                    </div>
                    <div>
                      <div class="fw-medium">{{ e.nom }} {{ e.prenom }}</div>
                      @if (e.matricule) { <div class="text-muted" style="font-size:10px">{{ e.matricule }}</div> }
                    </div>
                  </div>
                </td>
                <td class="text-center align-middle">
                  @if (estAbsent(e.id_eleve)) {
                    <span class="badge text-bg-danger">Absent(e)</span>
                  } @else {
                    <span class="badge text-bg-success">Présent(e)</span>
                  }
                </td>
                <td class="text-center align-middle">
                  @if (e.insolvable) {
                    <span class="badge text-bg-warning">En retard</span>
                  } @else {
                    <span class="text-muted" style="font-size:11px">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="d-flex justify-content-between flex-wrap gap-2">
      <span class="text-muted" style="font-size:11px">
        @if (mode() === 'grille') {
          🟥 Fond rouge = absent · 🔴 Nom rouge = pension en retard
        } @else {
          Cochez les élèves absents dans la colonne de gauche
        }
      </span>
      <span class="text-muted" style="font-size:11px">{{ absents().size }} absent(s) / {{ eleves().length }} élève(s)</span>
    </div>
  }

</div>
  `,
})
export class AbsencesSaisieComponent implements OnInit {

  private cache  = inject(CacheService);
  private add   = inject(AddServices);
  private get  = inject(GetServices)
  private auth   = inject(AuthService);
  private fas    = inject(FamilleService);
  private snack  = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly dateAuj  = new Date().toISOString().slice(0, 10);
  readonly heureAuj = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  classeId = signal('');
  absents  = signal<Set<string>>(new Set());
  mode     = signal<ViewMode>('grille');
  private elevesData: EleveData[] = [];

  ngOnInit(): void {
    const classes = this.classes();
    if (classes.length) this.classeId.set(classes[0].id_classe);
    this.elevesData = this.fas.construireElevesDataAvecFamille(this.get.getFamilles());
  }

  emptySet(): Set<string> { return new Set(); }

  userCourant = computed(() => this.auth.user());
  isAdmin     = computed(() => this.auth.isAdmin());

  classes = computed<Classe[]|any[]>(() => {
    const all = this.cache.getClasses();
    if (this.isAdmin()) return all;
    const user = this.userCourant();
    if (!user) return [];
    // .some() → booléen (bug corrigé : .filter() renvoyait toujours un tableau truthy)
    return all.filter(c => c.matieres?.some(m => m.id_enseignant === user.id));
  });

  eleves = computed<EleveData[]>(() => {
    if (!this.classeId()) return [];
    return this.elevesData
      .filter(e => e.id_classe === this.classeId())
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  resumeSous = computed(() => {
    const c = this.cache.classesMap().get(this.classeId());
    if (!c) return 'Choisir une classe';
    return `${c.nom_classe} · ${this.absents().size} absent(s) / ${this.eleves().length} élève(s)`;
  });

  nbAbsentsClasse(idClasse: string): number {
    return this.elevesData.filter(e => e.id_classe === idClasse && this.absents().has(e.id_eleve)).length;
  }

  // ── Sélection ────────────────────────────────────────────────
  toutSelectionne    = computed(() => this.eleves().length > 0 && this.eleves().every(e => this.absents().has(e.id_eleve)));
  selectionPartielle = computed(() => this.absents().size > 0 && !this.toutSelectionne());

  estAbsent(idEleve: string): boolean { return this.absents().has(idEleve); }

  toggleAbsent(idEleve: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.absents.update(s => { const n = new Set(s); checked ? n.add(idEleve) : n.delete(idEleve); return n; });
  }

  toggleTout(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.absents.set(checked ? new Set(this.eleves().map(e => e.id_eleve)) : new Set());
  }

  setClasse(id: string): void { this.classeId.set(id); this.absents.set(new Set()); }

  // ── Enregistrement ─────────────────────────────────────────────
  // BUG CORRIGÉ : l'ancien code vidait `absents` juste après dialog.open(),
  // avant même que le modal soit fermé (subscribe() est async) → les
  // absences n'étaient jamais enregistrées. On capture un instantané
  // AVANT d'ouvrir le modal, et on ne vide la sélection qu'une fois
  // le pointage réellement confirmé.
  enregistrer(): void {
    const absentsSnapshot = new Set(this.absents());
    const classe = this.cache.classesMap().get(this.classeId());

    const modalData: PointageModalData = {
      id_classe: this.classeId(),
      nom_classe: classe?.nom_classe ?? '',
      date: this.dateAuj,
      heure_debut: this.heureAuj,
      nb_absents: absentsSnapshot.size,
    };

    this.dialog.open(PointageModalComponent, { data: modalData, width: '520px', maxWidth: '96vw' })
      .afterClosed()
      .subscribe((result: PointageResult | null) => {
        if (!result) return; // annulé → on garde la sélection intacte
        this.enregistrerPointage(result, absentsSnapshot);
        this.absents.set(new Set());
      });
  }

  private enregistrerPointage(result: PointageResult, absentsSnapshot: Set<string>): void {
    this.add.addPointage({
      id_pointage: result.id_pointage,
      id_matiere: result.id_matiere,
      id_enseignants: result.id_enseignants,
      date_debut: result.date_debut,
      date_fin: result.date_fin,
      duree: result.duree,
    });

    if (absentsSnapshot.size > 0) {
      this.add.addAbsencesBatch(this.construireAbsences(absentsSnapshot, result.id_pointage));
    }
    this.snack.open('Pointage enregistré ✓', 'OK', { duration: 3000 });
  }

  private construireAbsences(absentsSnapshot: Set<string>, idPointage: string): Absence[] {
    return [...absentsSnapshot].map(idEleve => {
      const eleve = this.cache.getEleves().find(e => e.id_eleve === idEleve);
      return {
        id: `ABS-${Date.now()}-${idEleve.slice(-4)}`,
        id_eleve: idEleve,
        id_famille: eleve?.id_famille ?? '',
        id_pointage: idPointage,
        id_classe: this.classeId(),
        date: this.dateAuj,
        heure: this.heureAuj,
        justifie: false,
      };
    });
  }

  // ── Avatar ───────────────────────────────────────────────────
  private readonly palette = [
    { bg: '#E8F5E9', txt: '#2E7D32' }, { bg: '#E3F2FD', txt: '#1565C0' },
    { bg: '#FFF8E1', txt: '#F57F17' }, { bg: '#F3E5F5', txt: '#6A1B9A' },
    { bg: '#E0F2F1', txt: '#00695C' }, { bg: '#FCE4EC', txt: '#C62828' },
    { bg: '#E8EAF6', txt: '#283593' }, { bg: '#FBE9E7', txt: '#BF360C' },
  ];

  initiales(nom: string, prenom: string): string {
    return `${nom[0] ?? ''}${prenom[0] ?? ''}`.toUpperCase();
  }
  private hashIdx(id: string): number {
    return [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % this.palette.length;
  }
  avBg(id: string): string { return this.palette[this.hashIdx(id)].bg; }
  avTxt(id: string): string { return this.palette[this.hashIdx(id)].txt; }
}