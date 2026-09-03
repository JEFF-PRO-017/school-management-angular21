// parent-dashboard.component.ts — Tableau de bord parent (index)
// Ce fichier ORCHESTRE uniquement : il calcule les données (via FamilleService et
// NoteService, les 2 services centralisés) et les distribue aux 4 composants visuels :
// header, résumé, mes-enfants, footer. Aucune logique de calcul ici, juste du câblage.
import {
  Component, inject, signal, computed, HostListener,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

import { ParentService } from '../../../core/services/parent.service';
import { GetServices } from '../../../core/services/@data';
import { SessionService } from '../../../core/services/@session/session.service';


import { DashboardHeaderComponent } from './components/dashboard-header.component';
import { DashboardResumeComponent } from './components/dashboard-resume.component';
import { DashboardEnfantsComponent } from './components/dashboard-enfants.component';
import { DashboardFooterComponent } from './components/dashboard-footer.component';
import { FamilleService, FamilleEnrichi, POURCENT_PENSION, Note } from '../../../core/models';
import { IconComponent } from './icon.component';
import { NoteService, BilanTrimestre } from './note.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent, DashboardHeaderComponent, DashboardResumeComponent,
    DashboardEnfantsComponent, DashboardFooterComponent,
  ],
  template: `
    <!-- Voile de chargement tant que les données famille ne sont pas encore arrivées -->
    @if (chargement()) {
      <div class="position-fixed top-0 start-0 w-100 h-100 bg-white bg-opacity-75
                  d-flex align-items-center justify-content-center" style="z-index:1050">
        <div class="spinner-border text-primary"></div>
      </div>
    }

    <app-dashboard-header
      [nomFamille]="nomFamille()" [dateAujourdhui]="dateAujourdhui()"
      [nbNotifs]="nbNotifs()" [rafraichissement]="rafraichissement()" [visible]="barresVisibles()"
      (notificationsClick)="allerNotifications()" (refreshClick)="rafraichir()" />

    <!-- Bandeau insolvable -->
    @if (insolvable()) {
      <div class="alert alert-danger border-start border-4 border-danger rounded-3 mx-3 mt-2 mb-0">
        <strong class="d-block"><app-icon name="triangle-exclamation" class="me-1"></app-icon> Solde impayé</strong>
        Votre solde est en retard. Contactez l'administration.
      </div>
    }

    <!-- Notifications urgentes -->
    @if (notifsUrgentes().length > 0) {
      <div class="d-flex flex-column gap-2 mx-3 mt-2">
        @for (n of notifsUrgentes(); track n.id) {
          <div class="alert d-flex align-items-start gap-2 mb-0 py-2" [class]="'alert-' + couleurNotif(n.type)">
            <app-icon [name]="iconeNotif(n.type)" class="fs-5"></app-icon>
            <div class="flex-fill">
              <div class="fw-semibold small">{{ n.titre }}</div>
              <div class="small opacity-75">{{ n.corps }}</div>
            </div>
            <button type="button" class="btn-close" style="font-size:11px" (click)="fermerNotif(n.id)"></button>
          </div>
        }
      </div>
    }

    <app-dashboard-resume
      [totalAbsences]="totalAbsences()" [notifications]="nbNotifs()"
      [montantRestant]="fcfa(financier().montantRestant)" [montantAttendu]="fcfa(financier().montantAttentu)"
      [montantVerse]="fcfa(financier().montantVerse)" [tauxPaiement]="tauxPaiement()"
      [insolvable]="insolvable()" [prochainRdv]="prochainRdvAffiche()" />

    <app-dashboard-enfants [eleves]="eleves()" [bilans]="bilans()" [noteAleatoireTrimestreEnCours]="noteAleatoireTrimestre()" />

    <app-dashboard-footer
      [rafraichissement]="rafraichissement()" [visible]="barresVisibles()"
      (refreshClick)="rafraichir()" (logoutClick)="logout()" />
  `,
})
export class ParentDashboardComponent implements OnInit, OnDestroy {

  private svc = inject(ParentService);
  private router = inject(Router);
  private get = inject(GetServices);
  private sessionService = inject(SessionService);
  private familleService = inject(FamilleService);
  private noteService = inject(NoteService);

  private session = this.sessionService.get();

  // ── Données académiques calculées via NoteService ───────────────
  noteAleatoireTrimestre = signal<{ [k: string]: Note | null; }>({});
  //variable setTimeout pour rafraichir les notes aléatoires toutes les 10 secondes
  private rafraichirNotesAleatoiresTimeout: any;

  ngOnInit(): void {
    this.rafraichirNotesAleatoires();
  }

  ngOnDestroy(): void {
    clearTimeout(this.rafraichirNotesAleatoiresTimeout);
  }

  private rafraichirNotesAleatoires(): void {
    console.log('Rafraichissement des notes aléatoires du trimestre en cours');
    this.noteAleatoireTrimestre.set(this.noteAleatoireTrimestreEnCours());
    this.rafraichirNotesAleatoiresTimeout = setTimeout(() => this.rafraichirNotesAleatoires(), 10000);
  }


  // ── Famille connectée (enrichie) ────────────────────────────────
  private famille = computed<FamilleEnrichi | null>(() =>
    this.get.getFamilles().find((f: FamilleEnrichi) => f.id_famille === this.session?.id_famille) ?? null
  );

  eleves = computed(() => this.famille()?.eleves ?? []);

  notifications = computed(() =>
    (this.famille()?.notifications ?? []).filter(n => !n.lue)
  );
  nbNotifs = computed(() => this.notifications().length);
  notifsUrgentes = computed(() =>
    this.notifications().filter(n => n.urgente || n.type === 'paiement')
  );

  // ── Financier : entièrement délégué à FamilleService (calcul centralisé) ──
  // Valeurs par défaut tant que la famille n'est pas encore arrivée (évite un plantage
  // de FamilleService.initService, qui suppose une famille déjà chargée).
  financier = computed(() => {
    const f = this.famille();
    if (!f) {
      return { anneeSvcEncours: undefined, montantAttentu: 0, montantVerse: 0, montantRestant: 0, dernierRdvFamille: null, reductionTotal: 0 };
    }
    return this.familleService.initService(f);
  });

  // Même règle que FamilleService.estInsolvable() (méthode privée, donc reproduite ici à l'identique)
  insolvable = computed(() => {
    const { montantAttentu, montantVerse } = this.financier();
    return montantAttentu > 0 && (montantVerse * 100) / montantAttentu < POURCENT_PENSION;
  });

  tauxPaiement = computed(() => {
    const { montantAttentu, montantVerse } = this.financier();
    return montantAttentu > 0 ? Math.round((montantVerse * 100) / montantAttentu) : 100;
  });

  prochainRdvAffiche = computed(() => {
    const date = this.financier().dernierRdvFamille;
    if (!date) return null;
    try {
      return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return date; }
  });

  // ── Académique : entièrement délégué à NoteService (calcul centralisé) ────
  bilans = computed<Record<string, BilanTrimestre>>(() =>
    Object.fromEntries(this.eleves().map(e => [e.id_eleve, this.noteService.bilanTrimestreEnCours(e)]))
  );

  noteAleatoireTrimestreEnCours(): ({ [k: string]: Note | null; }) {
    return Object.fromEntries(this.eleves().map(e => [e.id_eleve, this.noteService.noteAleatoireTrimestreEnCours(e)]));
  }


  // moyenneGlobale = computed(() => {
  //   const moyennes = Object.values(this.bilans())
  //     .map(b => b.moyenne)
  //     .filter((m): m is number => m !== null);
  //   if (!moyennes.length) return '—';
  //   return (moyennes.reduce((a, b) => a + b, 0) / moyennes.length).toFixed(1);
  // });

  totalAbsences = computed(() =>
    this.eleves().reduce((somme, e) => somme + (e.absences?.length ?? 0), 0)
  );

  // ── État page (chargement initial + actualisation) ──────────────
  chargement = this.svc.chargement;
  rafraichissement = signal(false);

  // ── Effet de disparition au scroll (header + footer synchronisés) ──
  barresVisibles = signal(true);
  private dernierScrollY = 0;

  @HostListener('window:scroll')
  onScroll(): void {
    const y = window.scrollY;
    const delta = y - this.dernierScrollY;
    // Ignore les petits mouvements pour éviter un clignotement au moindre scroll
    if (Math.abs(delta) < 8) return;
    this.barresVisibles.set(delta < 0 || y < 40);
    this.dernierScrollY = y;
  }

  // ── Actions ──────────────────────────────────────────────────
  nomFamille = computed(() => this.famille()?.nom_famille ?? 'Parent');

  dateAujourdhui(): string {
    return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  async rafraichir(): Promise<void> {
    this.rafraichissement.set(true);
    try {
      await this.svc.rafraichir();
    } finally {
      this.rafraichissement.set(false);
    }
  }

  logout(): void {
    this.svc.logout();
    this.router.navigate(['/espace-parent/login']);
  }

  allerNotifications(): void { this.router.navigate(['/espace-parent/notifications']); }

  fermerNotif(id: string): void { this.svc.marquerLue(id); }

  couleurNotif(type: string): string {
    return { absence: 'warning', note: 'success', paiement: 'danger', rdv: 'info', info: 'primary' }[type] ?? 'secondary';
  }

  // Retourne le nom d'icône (catalogue app-icon) selon le type de notification
  iconeNotif(type: string): string {
    return { absence: 'calendar-days', note: 'chart-line', paiement: 'sack-dollar', rdv: 'calendar-check', info: 'circle-info' }[type] ?? 'bell';
  }

  fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
}