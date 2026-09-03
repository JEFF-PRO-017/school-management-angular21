
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-parent-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="parent-navbar d-flex bg-white shadow-sm border-bottom">
      @for (item of navItems; track item.route) {
        <a
          class="nav-item flex-fill d-flex flex-column align-items-center justify-content-center py-2 text-decoration-none text-secondary"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: false }">
          <i class="bi {{ item.icon }} fs-5"></i>
          <span class="nav-label small text-truncate">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .parent-navbar {
      position: sticky;
      top: 56px; /* hauteur approximative du header au-dessus */
      z-index: 1020;
    }
    .nav-item {
      transition: color .15s ease, background-color .15s ease;
      min-width: 0;
    }
    .nav-item.active {
      color: var(--bs-primary) !important;
      background-color: rgba(var(--bs-primary-rgb), 0.08);
      font-weight: 600;
    }
    .nav-label {
      max-width: 100%;
    }
  `],
})
export class ParentNavbarComponent {
  navItems: NavItem[] = [
    { label: 'Infos enfants', icon: 'bi-people', route: '/espace-parent/enfants' },
    { label: 'Moratoires', icon: 'bi-file-earmark-text', route: '/espace-parent/moratoires' },
    { label: 'Paiements', icon: 'bi-cash-coin', route: '/espace-parent/paiements' },
    { label: 'Notifications', icon: 'bi-bell', route: '/espace-parent/notifications' },
  ];
}