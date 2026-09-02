// parent-dashboard.component.ts — Tableau de bord parent
// Mobile-first (Bootstrap grid), cartes résumé, insolvable en rouge, notifications.
// Icônes : @fortawesome/angular-fontawesome + @fortawesome/free-solid-svg-icons
//
// ⚠️ PRÉ-REQUIS (si pas déjà fait) :
//   npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/angular-fontawesome
import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBell, faArrowRotateRight, faTriangleExclamation, faChartLine,
  faCalendarDays, faCreditCard, faCalendarCheck, faUserPlus,
  faRightFromBracket, faSackDollar, faCircleInfo, IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { ParentService } from '../../../core/services/parent.service';
import { GetServices } from '../../../core/services/@data';
import { SessionService } from '../../../core/services/@session/session.service';
import { FamilleEnrichi } from '../../../core/models';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FaIconComponent],
  template: `
<div class="pb-4" style="background:var(--bs-body-bg)">

  <!-- Overlay de chargement initial (premier chargement des données) -->
  @if (chargement()) {
    <div class="position-fixed top-0 start-0 w-100 h-100 bg-white bg-opacity-75
                d-flex align-items-center justify-content-center" style="z-index:1050">
      <div class="spinner-border text-primary"></div>
    </div>
  }

  <!-- ── En-tête ── -->
  <div class="bg-primary text-white p-3 sticky-top shadow-sm">
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <div class="fw-semibold fs-6">Bonjour, {{ nomFamille() }}</div>
        <div class="small opacity-75 text-capitalize">{{ dateAujourdhui() }}</div>
      </div>
      <div class="d-flex align-items-center gap-2">

        <!-- Notifications -->
        <div class="position-relative">
          <button class="btn btn-outline-light btn-sm rounded-circle p-2" (click)="allerNotifications()">
            <fa-icon [icon]="faBell"></fa-icon>
          </button>
          @if (nbNotifs() > 0) {
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {{ nbNotifs() }}
            </span>
          }
        </div>

        <!-- Actualiser -->
        <button class="btn btn-outline-light btn-sm rounded-circle p-2"
                (click)="rafraichir()" [disabled]="rafraichissement()">
          <fa-icon [icon]="faArrowRotateRight" [class.fa-spin]="rafraichissement()"></fa-icon>
        </button>
      </div>
    </div>

    <!-- Barre de chargement affichée pendant l'actualisation -->
    @if (rafraichissement()) {
      <div class="progress rounded-0 position-absolute bottom-0 start-0 w-100" style="height:3px">
        <div class="progress-bar progress-bar-striped progress-bar-animated bg-white" style="width:100%"></div>
      </div>
    }
  </div>

  <!-- ── Bandeau insolvable ── -->
  @if (insolvable()) {
    <div class="alert alert-danger border-start border-4 border-danger rounded-3 mx-3 mt-3 mb-0">
      <strong class="d-block"><fa-icon [icon]="faTriangleExclamation" class="me-1"></fa-icon> Solde impayé</strong>
      Votre solde est en retard. Contactez l'administration.
    </div>
  }

  <!-- ── Notifications urgentes ── -->
  @if (notifsUrgentes().length > 0) {
    <div class="d-flex flex-column gap-2 mx-3 mt-3">
      @for (n of notifsUrgentes(); track n.id) {
        <div class="alert d-flex align-items-start gap-2 mb-0 py-2" [class]="'alert-' + couleurNotif(n.type)">
          <fa-icon [icon]="iconeNotif(n.type)" class="fs-5"></fa-icon>
          <div class="flex-fill">
            <div class="fw-semibold small">{{ n.titre }}</div>
            <div class="small opacity-75">{{ n.corps }}</div>
          </div>
          <button type="button" class="btn-close" style="font-size:11px" (click)="fermerNotif(n.id)"></button>
        </div>
      }
    </div>
  }

  <!-- ── Résumé (4 cartes, 2 colonnes en mobile / 4 en desktop) ── -->
  <div class="mx-3 mt-4">
    <div class="text-uppercase text-muted small fw-semibold mb-2">Résumé</div>
    <div class="row row-cols-2 row-cols-md-4 g-2">

      <div class="col">
        <div class="card border-0 shadow-sm rounded-4 h-100 p-3">
          <fa-icon [icon]="faChartLine" class="fs-3 text-primary mb-2"></fa-icon>
          <div class="fs-4 fw-bold">{{ moyTrimResume() }}</div>
          <div class="small text-muted">Moy. trimestrielle</div>
        </div>
      </div>

      <div class="col">
        <div class="card border-0 shadow-sm rounded-4 h-100 p-3">
          <fa-icon [icon]="faCalendarDays" class="fs-3 text-warning mb-2"></fa-icon>
          <div class="fs-4 fw-bold" [class.text-danger]="totalAbsences() >= 3">
            {{ totalAbsences() }}
          </div>
          <div class="small text-muted">Absence(s)</div>
        </div>
      </div>

      <div class="col">
        <a class="card border-0 shadow-sm rounded-4 h-100 p-3 text-decoration-none text-reset"
           [routerLink]="['/espace-parent/paiement']">
          <fa-icon [icon]="faCreditCard" class="fs-3 text-danger mb-2"></fa-icon>
          <div class="fs-4 fw-bold" [class.text-danger]="insolvable()">{{ restePaiement() }}</div>
          <div class="small text-muted">Restant (FCFA)</div>
        </a>
      </div>

      <div class="col">
        <a class="card border-0 shadow-sm rounded-4 h-100 p-3 text-decoration-none text-reset"
           [routerLink]="['/espace-parent/paiement']">
          <fa-icon [icon]="faCalendarCheck" class="fs-3 text-success mb-2"></fa-icon>
          <div class="fs-4 fw-bold">{{ prochainRdv() ?? '—' }}</div>
          <div class="small text-muted">Prochain RDV</div>
        </a>
      </div>

    </div>
  </div>

  <!-- ── Paiement résumé ── -->
  @if (paiements()) {
    <div class="mx-3 mt-4">
      <div class="text-uppercase text-muted small fw-semibold mb-2">Pension</div>
      <div class="card border-0 shadow-sm rounded-4 p-3" [class.border]="insolvable()" [class.border-danger]="insolvable()">

        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Total attendu</span>
          <span class="fw-semibold">{{ fcfa(paiements()!.montant_attendu) }} FCFA</span>
        </div>
        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Payé</span>
          <span class="fw-semibold text-success">{{ fcfa(paiements()!.montant_paye) }} FCFA</span>
        </div>
        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Reste à payer</span>
          <span class="fw-semibold" [class.text-danger]="paiements()!.reste_a_payer > 0"
                                     [class.text-success]="paiements()!.reste_a_payer <= 0">
            {{ fcfa(paiements()!.reste_a_payer) }} FCFA
          </span>
        </div>

        <div class="progress my-2" style="height:10px">
          <div class="progress-bar" [class]="'bg-' + couleurProgress()"
               [style.width.%]="paiements()!.taux_paiement"></div>
        </div>
        <div class="text-end small text-muted">{{ paiements()!.taux_paiement }}% payé</div>

        @if (paiements()!.reste_a_payer > 0) {
          <a class="btn btn-primary w-100 mt-2" [routerLink]="['/espace-parent/paiement']">
            Initier un paiement
          </a>
        }
      </div>
    </div>
  }

  <!-- ── Élèves ── -->
  <div class="mx-3 mt-4">
    <div class="text-uppercase text-muted small fw-semibold mb-2">Mes enfants ({{ eleves().length }})</div>

    @if (eleves().length === 0) {
      <div class="text-center text-muted small py-4">Aucun enfant inscrit</div>
    } @else {
      @for (e of eleves(); track e.id_eleve) {
        <a class="card border-0 shadow-sm rounded-4 p-3 mb-2 text-decoration-none text-reset d-block"
           [routerLink]="['/espace-parent/eleve', e.id_eleve]">
          <div class="d-flex align-items-center gap-3">
            <div class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                 style="width:42px;height:42px">
              {{ e.nom[0] }}{{ e.prenom[0] }}
            </div>
            <div>
              <div class="fw-semibold">{{ e.prenom }} {{ e.nom }}</div>
              <div class="small text-muted">{{ e.nom_classe }} · {{ e.niveau }}</div>
            </div>
          </div>

          <div class="row row-cols-3 text-center mt-3 g-0">
            <div class="col">
              <div class="fw-bold" [class]="'text-' + moyenneCouleur(e.moy_trimestrielle)">
                {{ e.moy_trimestrielle !== null ? e.moy_trimestrielle.toFixed(1) : '—' }}
              </div>
              <div class="small text-muted">Moyenne</div>
            </div>
            <div class="col">
              <div class="fw-bold" [class]="'text-' + absencesCouleur(e.absences_count)">
                {{ e.absences_count }}
              </div>
              <div class="small text-muted">Absences</div>
            </div>
            <div class="col">
              <div class="fw-bold">
                {{ e.rang !== null ? e.rang + '/' + e.effectif_classe : '—' }}
              </div>
              <div class="small text-muted">Rang</div>
            </div>
          </div>
        </a>
      }
    }

    <a class="btn btn-outline-primary w-100 mt-1" [routerLink]="['/espace-parent/ajouter-enfant']">
      <fa-icon [icon]="faUserPlus" class="me-1"></fa-icon> Ajouter un enfant
    </a>
  </div>

  <!-- ── Actions bas de page ── -->
  <div class="d-flex gap-2 mx-3 mt-4">
    <button class="btn btn-outline-secondary flex-fill" (click)="rafraichir()" [disabled]="rafraichissement()">
      <fa-icon [icon]="faArrowRotateRight" [class.fa-spin]="rafraichissement()" class="me-1"></fa-icon> Actualiser
    </button>
    <button class="btn btn-outline-danger flex-fill" (click)="logout()">
      <fa-icon [icon]="faRightFromBracket" class="me-1"></fa-icon> Déconnexion
    </button>
  </div>

</div>
  `,
})
export class ParentDashboardComponent {

  private svc = inject(ParentService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private get = inject(GetServices);
  private sessionService = inject(SessionService);

  // ── Icônes FontAwesome utilisées dans le template ────────────────
  faBell = faBell;
  faArrowRotateRight = faArrowRotateRight;
  faTriangleExclamation = faTriangleExclamation;
  faChartLine = faChartLine;
  faCalendarDays = faCalendarDays;
  faCreditCard = faCreditCard;
  faCalendarCheck = faCalendarCheck;
  faUserPlus = faUserPlus;
  faRightFromBracket = faRightFromBracket;

  chargement = this.svc.chargement;
  // true uniquement pendant un clic sur "Actualiser" (affiche la barre de progression)
  rafraichissement = signal(false);

  private session = this.sessionService.get();

  // ── Données brutes (famille connectée, enrichie) ────────────────
  private dashboard = computed(() =>
    this.get.getFamilles().find((f: FamilleEnrichi) => f.id_famille === this.session?.id_famille) ?? null
  );

  eleves = computed(() => this.dashboard()?.eleves ?? []);
  paiements = computed(() => this.dashboard()?.paiement ?? null);
  moratoires = computed(() => this.dashboard()?.moratoires ?? []);

  notifications = computed(() =>
    (this.dashboard()?.notifications ?? []).filter((n: { lue: boolean }) => !n.lue)
  );

  // Insolvable = il reste un montant à payer sur la pension
  insolvable = computed(() => (this.paiements()?.reste_a_payer ?? 0) > 0);
  nbNotifs = computed(() => this.notifications().length);

  nomFamille = computed(() => this.dashboard()?.nom_famille ?? 'Parent');

  notifsUrgentes = computed(() =>
    this.notifications().filter((n: { urgente: boolean; type: string }) => n.urgente || n.type === 'paiement')
  );

  moyTrimResume = computed(() => {
    const moys = this.eleves()
      .map((e: any) => e.moy_trimestrielle)
      .filter((m: any): m is number => m !== null);
    if (!moys.length) return '—';
    const moy = moys.reduce((a: number, b: number) => a + b, 0) / moys.length;
    return moy.toFixed(1);
  });

  totalAbsences = computed(() =>
    this.eleves().reduce((s: number, e: { absences_count: number }) => s + e.absences_count, 0)
  );

  restePaiement = computed(() => {
    const p = this.paiements();
    return p ? this.fcfa(p.reste_a_payer) : '—';
  });

  prochainRdv = computed(() => {
    const rdv = this.paiements()?.prochain_rdv;
    if (!rdv) return null;
    try {
      return new Date(rdv).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return rdv; }
  });

  // ── Actions ──────────────────────────────────────────────────
  dateAujourdhui(): string {
    return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  // Actualisation : on attend la fin de l'appel avant de retirer la barre de chargement,
  // même en cas d'erreur (finally), pour ne jamais bloquer les boutons.
  async rafraichir(): Promise<void> {
    this.rafraichissement.set(true);
    try {
      await this.svc.rafraichir();
    } finally {
      this.rafraichissement.set(false);
      this.cdr.markForCheck();
    }
  }

  logout(): void {
    this.svc.logout();
    this.router.navigate(['/espace-parent/login']);
  }

  allerNotifications(): void { this.router.navigate(['/espace-parent/notifications']); }

  fermerNotif(id: string): void { this.svc.marquerLue(id); }

  // ── Aides d'affichage (icône FontAwesome / couleurs Bootstrap) ──
  // Retourne l'icône FontAwesome selon le type de notification
  iconeNotif(type: string): IconDefinition {
    return {
      absence: faCalendarDays,
      note: faChartLine,
      paiement: faSackDollar,
      rdv: faCalendarCheck,
      info: faCircleInfo,
    }[type] ?? faBell;
  }

  couleurNotif(type: string): string {
    return { absence: 'warning', note: 'success', paiement: 'danger', rdv: 'info', info: 'primary' }[type] ?? 'secondary';
  }

  couleurProgress(): string {
    const t = this.paiements()?.taux_paiement ?? 0;
    if (t >= 100) return 'success';
    if (t >= 50) return 'warning';
    return 'danger';
  }

  moyenneCouleur(m: number | null): string {
    if (m === null) return 'body';
    if (m >= 10) return 'success';
    if (m >= 8) return 'warning';
    return 'danger';
  }

  absencesCouleur(n: number): string {
    if (n === 0) return 'success';
    if (n < 3) return 'warning';
    return 'danger';
  }

  fcfa(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }
}