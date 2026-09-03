// dashboard-resume.component.ts
// Bloc "Résumé" : moyenne globale, absences, reste à payer, prochain rendez-vous,
// puis le détail de la pension avec barre de progression.
// Toutes les valeurs sont déjà calculées par le parent (FamilleService / NoteService) :
// ce composant ne fait qu'afficher.
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-dashboard-resume',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="mx-3 mt-3">
      <div class="text-uppercase text-muted small fw-semibold mb-2">Résumé</div>

      <div class="row row-cols-2 row-cols-md-4 g-2">

        <div class="col">
          <div class="card border-0 shadow-sm rounded-4 h-100 p-3">
            <app-icon name="chart-line" class="fs-3 text-primary mb-2"></app-icon>
            <div class="fs-4 fw-bold">{{notifications}}</div>
            <div class="small text-muted">Notifications (N. Lue) </div>
          </div>
        </div>

        <div class="col">
          <div class="card border-0 shadow-sm rounded-4 h-100 p-3">
            <app-icon name="calendar-days" class="fs-3 text-warning mb-2"></app-icon>
            <div class="fs-4 fw-bold" [class.text-danger]="totalAbsences >= 3">{{ totalAbsences }}</div>
            <div class="small text-muted">Absence(s)</div>
          </div>
        </div>

        <div class="col">
          <a class="card border-0 shadow-sm rounded-4 h-100 p-3 text-decoration-none text-reset"
             [routerLink]="['/espace-parent/paiement']">
            <app-icon name="credit-card" class="fs-3 text-danger mb-2"></app-icon>
            <div class="fs-4 fw-bold" [class.text-danger]="insolvable">{{ montantRestant }}</div>
            <div class="small text-muted">Restant (FCFA)</div>
          </a>
        </div>

        <div class="col">
          <a class="card border-0 shadow-sm rounded-4 h-100 p-3 text-decoration-none text-reset"
             [routerLink]="['/espace-parent/paiement']">
            <app-icon name="calendar-check" class="fs-3 text-success mb-2"></app-icon>
            <div class="fs-4 fw-bold">{{ prochainRdv ?? '—' }}</div>
            <div class="small text-muted">Échéance moratoire</div>
          </a>
        </div>

      </div>
    </div>

    <!-- Détail pension -->
    <div class="mx-3 mt-4">
      <div class="text-uppercase text-muted small fw-semibold mb-2">Pension</div>
      <div class="card border-0 shadow-sm rounded-4 p-3" [class.border]="insolvable" [class.border-danger]="insolvable">

        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Total attendu</span>
          <span class="fw-semibold">{{ montantAttendu }} FCFA</span>
        </div>
        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Payé</span>
          <span class="fw-semibold text-success">{{ montantVerse }} FCFA</span>
        </div>
        <div class="d-flex justify-content-between small py-1">
          <span class="text-muted">Reste à payer</span>
          <span class="fw-semibold" [class.text-danger]="insolvable" [class.text-success]="!insolvable">
            {{ montantRestant }} FCFA
          </span>
        </div>

        <div class="progress my-2" style="height:10px">
          <div class="progress-bar" [class]="'bg-' + couleurTaux()" [style.width.%]="tauxPaiement"></div>
        </div>
        <div class="text-end small text-muted">{{ tauxPaiement }}% payé</div>

        @if (insolvable) {
          <a class="btn btn-primary w-100 mt-2" [routerLink]="['/espace-parent/paiement']">
            Initier un paiement
          </a>
        }
      </div>
    </div>
  `,
})
export class DashboardResumeComponent {
  @Input() totalAbsences = 0;
  @Input() montantRestant = '0';
  @Input() montantAttendu = '0';
  @Input() montantVerse = '0';
  @Input() tauxPaiement = 0;
  @Input() insolvable = false;
  @Input() prochainRdv: string | null = null;
  @Input() notifications: number = 0

  couleurTaux(): string {
    if (this.tauxPaiement >= 100) return 'success';
    if (this.tauxPaiement >= 50) return 'warning';
    return 'danger';
  }
}