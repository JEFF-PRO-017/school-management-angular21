import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DataServiceBase } from '../../../core/services/@data/_data.base.service';

declare const bootstrap: any;

/** Breakpoint Bootstrap "md" */
const MD_BREAKPOINT = 768;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, MatProgressSpinnerModule],
  templateUrl: './layout.component.html',
  styles: [`
    .sidebar-desktop {
      flex-shrink: 0;
      overflow: hidden;
      transition: width .25s ease;
    }
  `],
})
export class LayoutComponent implements OnInit {

  private data = inject(DataServiceBase);
  private router = inject(Router);

  loading = signal(true);

  /** État de la sidebar sur grand écran (true = ouverte) */
  desktopOpen = signal(true);

  constructor() {
    // Ferme l'offcanvas à chaque navigation (sécurité supplémentaire)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.closeMobileSidebar());
  }

  async ngOnInit(): Promise<void> {
    try {
      // await this.data.initAppData();
    } finally {
      this.loading.set(false);
    }
  }

  private isDesktop(): boolean {
    return window.innerWidth >= MD_BREAKPOINT;
  }

  /** Bouton du header : agit selon la taille d'écran */
  toggleSidebar(): void {
    if (this.isDesktop()) {
      this.desktopOpen.update(v => !v);
    } else {
      const el = document.getElementById('sidebarOffcanvas');
      if (el) bootstrap.Offcanvas.getOrCreateInstance(el).toggle();
    }
  }

  /** Ferme l'offcanvas mobile */
  closeMobileSidebar(): void {
    const el = document.getElementById('sidebarOffcanvas');
    if (el) bootstrap.Offcanvas.getInstance(el)?.hide();
  }

  /** Clic dans l'offcanvas : si c'est un lien ou un bouton, on ferme */
  onMobileSidebarClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('a, button')) {
      this.closeMobileSidebar();
    }
  }

  /** Si on passe en grand écran avec l'offcanvas ouvert, on le ferme */
  @HostListener('window:resize')
  onResize(): void {
    if (this.isDesktop()) this.closeMobileSidebar();
  }
}