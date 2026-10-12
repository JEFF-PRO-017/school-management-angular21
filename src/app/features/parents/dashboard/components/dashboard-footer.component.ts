// dashboard-footer.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .nav-btn {
      position: relative;
      border: 0;
      background: transparent;
      transition: transform .12s ease, background-color .15s ease, color .15s ease;
    }
    .nav-btn:active {
      transform: scale(.88);
      background-color: rgba(var(--bs-primary-rgb), .12);
    }
    .nav-btn.active::before {
      content: '';
      position: absolute;
      top: 0; left: 30%; right: 30%;
      height: 3px;
      border-radius: 0 0 3px 3px;
      background: var(--bs-primary);
    }
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

      <!-- Dashboard -->
      <button class="nav-btn btn flex-fill py-3 rounded-0"
              [class.active]="active === 'dashboard'"
              [class.text-primary]="active === 'dashboard'"
              [class.text-secondary]="active !== 'dashboard'"
              aria-label="Dashboard" title="Dashboard"
              (click)="dashboardClick()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/>
          <rect x="3" y="16" width="7" height="5" rx="1"/>
        </svg>
      </button>

      <!-- Nouveau moratoire (calendrier + plus) -->
      <button class="nav-btn btn flex-fill py-3 rounded-0"
              [class.active]="active === 'moratoire'"
              [class.text-primary]="active === 'moratoire'"
              [class.text-secondary]="active !== 'moratoire'"
              aria-label="Nouveau moratoire" title="Nouveau moratoire"
              (click)="moratoireClick()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 2v4M16 2v4"/>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M3 10h18"/>
          <path d="M12 13v6M9 16h6"/>
        </svg>
      </button>

      <!-- Menu -->
      <button class="nav-btn btn flex-fill py-3 rounded-0"
              [class.active]="active === 'menu'"
              [class.text-primary]="active === 'menu'"
              [class.text-secondary]="active !== 'menu'"
              aria-label="Menu" title="Menu"
              (click)="menuClick()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Déconnexion -->
      <button class="nav-btn btn flex-fill py-3 rounded-0 text-danger"
              aria-label="Déconnexion" title="Déconnexion"
              (click)="logoutClick()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <path d="M16 17l5-5-5-5"/>
          <path d="M21 12H9"/>
        </svg>
      </button>
    </nav>

    <!-- Espaceur -->
    <div style="height:64px"></div>
  `,
})
export class DashboardFooterComponent {
  @Input() visible = true;
  @Input() active: 'dashboard' | 'moratoire' | 'menu' | null = 'dashboard';

  private router = inject(Router);
  dashboardClick() { this.router.navigate(['/espace-parent/dashboard']) };
  moratoireClick() { this.router.navigate(['/espace-parent/moratoires']) };
  menuClick() { this.router.navigate(['/espace-parent/enfants']) };
  logoutClick() { this.router.navigate(['/espace-parent/logout']) };
}