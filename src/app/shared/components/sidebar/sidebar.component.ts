// sidebar.component.ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidebar.component.html',
  styles: [`
    .nav-link { color: var(--bs-gray-700); transition: background .15s; }
    .nav-link:hover, .nav-link.active {
      background: var(--bs-primary-bg-subtle);
      color: var(--bs-primary);
    }
  `]
})
export class SidebarComponent {
  private auth = inject(AuthService);

  isAdmin      = this.auth.isAdmin;
  canPaiements = () => this.auth.hasRole('admin', 'caissier');
  canNotes     = () => this.auth.hasRole('admin', 'enseignant');
}
