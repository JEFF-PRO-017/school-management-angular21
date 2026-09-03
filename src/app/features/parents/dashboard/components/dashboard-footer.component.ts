// dashboard-footer.component.ts
// Pied de page flottant façon barre de navigation Android (fixe en bas de l'écran).
// Se cache/réapparaît EN MÊME TEMPS que le header (même signal "visible" transmis par le parent).
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-dashboard-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="bg-white border-top shadow-lg position-fixed bottom-0 start-0 w-100 d-flex"
         style="z-index:1030; transition:transform .25s ease"
         [style.transform]="visible ? 'translateY(0)' : 'translateY(100%)'">

      <button class="btn flex-fill py-3 rounded-0 text-secondary d-flex flex-column align-items-center gap-1"
              (click)="refreshClick.emit()" [disabled]="rafraichissement">
        <app-icon name="arrow-rotate-right" [spin]="rafraichissement"></app-icon>
        <span class="small">Actualiser</span>
      </button>

      <button class="btn flex-fill py-3 rounded-0 text-danger d-flex flex-column align-items-center gap-1"
              (click)="logoutClick.emit()">
        <app-icon name="right-from-bracket"></app-icon>
        <span class="small">Déconnexion</span>
      </button>
    </div>

    <!-- Espaceur : le footer est en position fixed, ce bloc réserve sa hauteur dans le flux -->
    <div style="height:64px"></div>
  `,
})
export class DashboardFooterComponent {
  @Input() rafraichissement = false;
  @Input() visible = true;

  @Output() refreshClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
}