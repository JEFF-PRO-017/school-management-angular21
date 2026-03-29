// layout.component.ts — coque principale de l'app
import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DataService } from '../../../core/services/data.service';

// Déclaration Bootstrap (disponible via CDN ou import dans angular.json)
declare const bootstrap: any;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent,
             MatProgressSpinnerModule],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {

  private data = inject(DataService);

  /** Indicateur de chargement initial */
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      // Lance le batchGet au démarrage (Groupe A + B + D)
      await this.data.initAppData();
    } finally {
      this.loading.set(false);
    }
  }

  /** Ouvre/ferme la sidebar offcanvas sur mobile */
  toggleSidebar(): void {
    const el = document.getElementById('sidebarOffcanvas');
    if (el) {
      const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(el);
      offcanvas.toggle();
    }
  }
}
