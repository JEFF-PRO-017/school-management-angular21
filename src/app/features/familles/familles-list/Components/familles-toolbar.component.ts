// ─────────────────────────────────────────────────────────────────
// familles-toolbar.component.ts
// Barre de recherche + chips filtres
// ─────────────────────────────────────────────────────────────────
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, signal, computed,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export type FiltreEtat = 'tous' | 'solde' | 'sans-gps';
export type FiltreEnfants = 0 | 1 | 2 | 3;

export interface ClasseOpt { id: string; nom: string; }

@Component({
  selector: 'app-familles-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
<!-- ══ BARRE PRINCIPALE ══ -->
<div class="d-flex align-items-center flex-wrap gap-2 pb-3 border-bottom">

  <input [formControl]="search"
         placeholder="Nom, téléphone…"
         class="form-control form-control-sm"
         style="width:180px"
         (input)="setSearch()"
         >

  <div class="vr mx-1"></div>

  <div class="d-flex flex-column lh-1">
    <span class="fw-medium" style="font-size:12px">{{ resumeTitre() }}</span>
    <span class="text-primary" style="font-size:10px">{{ resumeSous() }}</span>
  </div>

  <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          (click)="toggleFiltres()">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 8h6M7 12h2" stroke="currentColor"
            stroke-width="1.3" stroke-linecap="round"/>
    </svg>
    Filtres
  </button>

  <a routerLink="/familles/carte"
     class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z"
            stroke="currentColor" stroke-width="1.3"/>
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    Carte
  </a>

  <div class="vr mx-1"></div>

  <button class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
          (click)="nouvelleFamille.emit()">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    Nouvelle famille
  </button>
</div>

<!-- ══ CHIPS FILTRES ══ -->
@if (showFiltres()) {
  <div class="d-flex align-items-center flex-wrap gap-2 py-2 border-bottom">

    <span class="text-muted" style="font-size:11px">État</span>
    @for (opt of optsEtat; track opt.val) {
      <button class="btn btn-sm"
              [class.btn-outline-secondary]="filtreEtat() !== opt.val"
              [class.btn-primary]="filtreEtat() === opt.val"
              style="font-size:11px;padding:2px 10px"
              (click)="setEtat(opt.val)">{{ opt.lbl }}</button>
    }

    <div class="vr mx-1"></div>

    <span class="text-muted" style="font-size:11px">Classe</span>
    <button class="btn btn-sm"
            [class.btn-outline-secondary]="filtreClasse() !== ''"
            [class.btn-primary]="filtreClasse() === ''"
            style="font-size:11px;padding:2px 10px"
            (click)="setClasse('')">Toutes</button>
    @for (c of classes; track c.id) {
      <button class="btn btn-sm"
              [class.btn-outline-secondary]="filtreClasse() !== c.id"
              [class.btn-primary]="filtreClasse() === c.id"
              style="font-size:11px;padding:2px 10px"
              (click)="setClasse(c.id)">{{ c.nom }}</button>
    }

    <div class="vr mx-1"></div>

    <span class="text-muted" style="font-size:11px">Enfants</span>
    @for (opt of optsEnfants; track opt.val) {
      <button class="btn btn-sm"
              [class.btn-outline-secondary]="filtreEnfants() !== opt.val"
              [class.btn-primary]="filtreEnfants() === opt.val"
              style="font-size:11px;padding:2px 10px"
              (click)="setEnfants(opt.val)">{{ opt.lbl }}</button>
    }
  </div>
}
  `,
})
export class FamillesToolbarComponent {

  @Input() classes: ClasseOpt[] = [];

  /** Émet à chaque changement de filtre — le parent reconstruit filtered() */
  @Output() filtresChange = new EventEmitter<{
    search: string;
    etat: FiltreEtat;
    classe: string;
    enfants: FiltreEnfants;
  }>();
  @Output() nouvelleFamille = new EventEmitter<void>();

  search = new FormControl('');
  filtreEtat = signal<FiltreEtat>('tous');
  filtreClasse = signal('');
  filtreEnfants = signal<FiltreEnfants>(0);
  showFiltres = signal(true);

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

  resumeTitre = computed<string>(() => {
    const e = this.filtreEtat();
    if (e === 'solde') return 'Avec solde dû';
    if (e === 'sans-gps') return 'Sans GPS';
    return 'Toutes les familles';
  });

  resumeSous = computed<string>(() => {
    const c = this.filtreClasse();
    const nb = this.filtreEnfants();
    const cls = c ? (this.classes.find(x => x.id === c)?.nom ?? c) : 'Toutes classes';
    const enf = this.optsEnfants.find(o => o.val === nb)?.lbl ?? 'Tous';
    return `${cls} · ${enf}`;
  });

  toggleFiltres(): void { this.showFiltres.set(!this.showFiltres()); }

  setSearch() {
    this.emit();
  }
  setEtat(v: FiltreEtat): void {
    this.filtreEtat.set(v);
    this.emit();
  }

  setClasse(v: string): void {
    this.filtreClasse.set(v);
    this.emit();
  }

  setEnfants(v: FiltreEnfants): void {
    this.filtreEnfants.set(v);
    this.emit();
  }

  /** Appelé aussi par le parent via ngOnInit → subscription valueChanges */
  emit(): void {
    this.filtresChange.emit({
      search: this.search.value ?? '',
      etat: this.filtreEtat(),
      classe: this.filtreClasse(),
      enfants: this.filtreEnfants(),
    });
  }
}