
import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-parent-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="header d-flex align-items-center justify-content-between bg-primary text-white px-2 py-2 shadow-sm">

      <!-- Bouton retour -->
      @if (showBack) {
        <button class="btn-back btn btn-link text-white p-2" (click)="goBack()" aria-label="Retour">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="white"/>
          </svg>
        </button>
      } @else {
        <div style="width:40px"></div>
      }

      <!-- Titre -->
      <div class="header-titre flex-grow-1 text-center text-truncate fw-semibold text-capitalize px-2">
        {{ titreAffiche }}
      </div>

      <!-- Menu 3 points -->
      <div class="dropdown">
        <button
          class="btn btn-link text-white p-2"
          type="button"
          id="parentHeaderMenu"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="Menu actions">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2" fill="white"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
            <circle cx="12" cy="19" r="2" fill="white"/>
          </svg>
        </button>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="parentHeaderMenu">
          <li>
            <button class="dropdown-item d-flex align-items-center gap-2" (click)="onEcrireAdministration()">
              <i class="bi bi-envelope"></i> Écrire à l'administration
            </button>
          </li>
          <li>
            <button class="dropdown-item d-flex align-items-center gap-2" (click)="onInitierPaiement()">
              <i class="bi bi-cash-coin"></i> Initier un paiement
            </button>
          </li>
          <li>
            <button class="dropdown-item d-flex align-items-center gap-2" (click)="onDemandeMoratoire()">
              <i class="bi bi-file-earmark-text"></i> Demande moratoire
            </button>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 1030;
    }
    .btn-back, .dropdown > .btn {
      line-height: 1;
    }
  `],
})
export class ParentHeaderComponent implements OnInit {
  /** Titre affiché. Si non fourni, récupéré depuis les données de route. */
  @Input() titre = '';

  /** Affiche ou non le bouton retour. */
  @Input() showBack = true;

  titreAffiche = 'Tableau de bord';

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (this.titre) {
      this.titreAffiche = this.titre;
      return;
    }

    // Récupère le titre depuis les données de la route active
    // (à définir côté routes : { path: '...', data: { titre: '...' } })
    let currentRoute = this.route.snapshot;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    this.titreAffiche = currentRoute.data['titre'] ?? 'Tableau de bord';
  }

  /** Retour naturel vers la fenêtre précédente. */
  goBack(): void {
    // this.location.back();
    this.router.navigate(['/espace-parent/dashboard'])
  }

  // --- Actions du menu 3 points (routes provisoires) ---

  onEcrireAdministration(): void {
    this.router.navigate(['/espace-parent/administration']);
  }

  onInitierPaiement(): void {
    this.router.navigate(['/espace-parent/paiements/initier']);
  }

  onDemandeMoratoire(): void {
    this.router.navigate(['/espace-parent/moratoires/demande']);
  }
}