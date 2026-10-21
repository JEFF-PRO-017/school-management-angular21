// dashboard-footer.component.ts
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .nav-btn {
      position: relative;
      border: 0;
      background: transparent;
      color: var(--bs-secondary);
      transition: transform .12s ease, background-color .15s ease, color .15s ease;
    }
    .nav-btn:active {
      transform: scale(.88);
      background-color: rgba(var(--bs-primary-rgb), .12);
    }
    .nav-btn.active { color: var(--bs-primary); }
    .nav-btn.active::before {
      content: '';
      position: absolute;
      top: 0; left: 30%; right: 30%;
      height: 3px;
      border-radius: 0 0 3px 3px;
      background: var(--bs-primary);
    }
    .nav-btn.logout { color: var(--bs-danger); }
    .nav-btn svg {
      width: 26px; height: 26px;
      fill: none; stroke: currentColor;
      stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    }
  `],
  template: `
    <nav class="bg-white border-top shadow-lg position-fixed bottom-0 start-0 w-100 d-flex"
         style="z-index:1030; transition:transform .25s ease"
         [style.transform]="visible ? 'translateY(0)' : 'translateY(100%)'">

      <a class="nav-btn btn flex-fill py-3 rounded-0"
         routerLink="/espace-parent/dashboard" routerLinkActive="active"
         ariaCurrentWhenActive="page" aria-label="Dashboard" title="Dashboard">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/>
          <rect x="3" y="16" width="7" height="5" rx="1"/>
        </svg>
      </a>

      <a class="nav-btn btn flex-fill py-3 rounded-0"
         routerLink="/espace-parent/enfants" routerLinkActive="active"
         ariaCurrentWhenActive="page" aria-label="Menu" title="Menu">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </a>
      <a class="nav-btn btn flex-fill py-3 rounded-0"
         routerLink="/espace-parent/moratoires" routerLinkActive="active"
         ariaCurrentWhenActive="page" aria-label="Nouveau moratoire" title="Nouveau moratoire">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 2v4M16 2v4"/>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M3 10h18"/>
          <path d="M12 13v6M9 16h6"/>
        </svg>
      </a>
            <!-- Paiements -->
      <a class="nav-btn btn flex-fill py-3 rounded-0"
        routerLink="/espace-parent/paiements" routerLinkActive="active"
        ariaCurrentWhenActive="page" aria-label="Paiements" title="Paiements">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
          <path d="M6 15h4"/>
        </svg>
      </a>

      <!-- Notifications -->
      <a class="nav-btn btn flex-fill py-3 rounded-0"
        routerLink="/espace-parent/notifications" routerLinkActive="active"
        ariaCurrentWhenActive="page" aria-label="Notifications" title="Notifications">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
        </svg>
      </a>

      <!-- <a class="nav-btn logout btn flex-fill py-3 rounded-0"
         routerLink="/espace-parent/logout" aria-label="Déconnexion" title="Déconnexion">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <path d="M16 17l5-5-5-5"/>
          <path d="M21 12H9"/>
        </svg>
      </a> -->
    </nav>

    <div style="height:64px"></div>
  `,
})
export class DashboardFooterComponent {
  @Input() visible = true;
}