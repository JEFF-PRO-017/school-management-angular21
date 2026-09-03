// dashboard-header.component.ts
// En-tête flottant du dashboard : nom de famille, date, notifications, actualiser.
// Se cache au scroll vers le bas et réapparaît au scroll vers le haut
// (l'état "visible" est calculé par le parent et simplement transmis ici).
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="bg-primary text-white p-3 position-fixed top-0 start-0 w-100 shadow-sm"
         style="z-index:1030; transition:transform .25s ease"
         [style.transform]="visible ? 'translateY(0)' : 'translateY(-100%)'">

      <div class="d-flex align-items-center justify-content-between">
        <div>
          <div class="fw-semibold fs-6">Bonjour, {{ nomFamille }}</div>
          <div class="small opacity-75 text-capitalize">{{ dateAujourdhui }}</div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <!-- Notifications -->
          <div class="position-relative">
            <button class="btn btn-outline-light btn-sm rounded-circle p-2" (click)="notificationsClick.emit()">
              <app-icon name="bell"></app-icon>
            </button>
            @if (nbNotifs > 0) {
              <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {{ nbNotifs }}
              </span>
            }
          </div>

          <!-- Actualiser -->
          <button class="btn btn-outline-light btn-sm rounded-circle p-2"
                  (click)="refreshClick.emit()" [disabled]="rafraichissement">
            <app-icon name="arrow-rotate-right" [spin]="rafraichissement"></app-icon>
          </button>
        </div>
      </div>

      <!-- Barre de progression pendant l'actualisation -->
      @if (rafraichissement) {
        <div class="progress rounded-0 position-absolute bottom-0 start-0 w-100" style="height:3px">
          <div class="progress-bar progress-bar-striped progress-bar-animated bg-white" style="width:100%"></div>
        </div>
      }
    </div>

    <!-- Espaceur : le header est en position fixed, ce bloc réserve sa hauteur dans le flux -->
    <div style="height:64px"></div>
  `,
})
export class DashboardHeaderComponent {
  @Input() nomFamille = 'Parent';
  @Input() dateAujourdhui = '';
  @Input() nbNotifs = 0;
  @Input() rafraichissement = false;
  @Input() visible = true;

  @Output() notificationsClick = new EventEmitter<void>();
  @Output() refreshClick = new EventEmitter<void>();
}