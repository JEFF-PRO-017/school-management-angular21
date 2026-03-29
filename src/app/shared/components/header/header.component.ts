// header.component.ts — barre supérieure avec statut queue + indicateur réseau
import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
import { SheetsQueueServiceService } from '../../../core/services/sheets-queue.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {

  @Output() toggleMenu = new EventEmitter<void>();

  private auth  = inject(AuthService);
  private queue = inject(SheetsQueueServiceService);

  user   = this.auth.user;
  online = navigator.onLine;

  /** Nombre d'éléments en attente dans la queue */
  queueSize(): number { return this.queue.size(); }

  logout(): void { this.auth.logout(); }

  constructor() {
    // Met à jour le statut réseau en temps réel
    window.addEventListener('online',  () => { this.online = true;  });
    window.addEventListener('offline', () => { this.online = false; });
  }
}
