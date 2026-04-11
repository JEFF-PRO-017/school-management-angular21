// shell.component.ts — layout principal : sidebar + header + contenu
// La sidebar se cache sur mobile et s'ouvre via le hamburger du header.

import { Component, signal } from '@angular/core';
import { RouterOutlet }      from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';


@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
<div class="shell" [class.shell--open]="sidebarOpen()">

  <!-- Overlay mobile -->
  <div class="shell-overlay" (click)="sidebarOpen.set(false)"></div>

  <!-- Sidebar -->
  <app-sidebar class="shell-sidebar"></app-sidebar>

  <!-- Colonne principale -->
  <div class="shell-body">
    <app-header (toggleMenu)="sidebarOpen.update(v => !v)"></app-header>
    <main class="shell-main">
      <router-outlet></router-outlet>
    </main>
  </div>

</div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: 200px 1fr;
      grid-template-rows: 1fr;
      height: 100vh;
      overflow: hidden;
    }
    .shell-sidebar {
      grid-column: 1;
      grid-row: 1;
      overflow-y: auto;
    }
    .shell-body {
      grid-column: 2;
      grid-row: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .shell-main {
      flex: 1;
      overflow-y: auto;
      background: rgba(0,0,0,.02);
    }
    .shell-overlay { display: none; }

    /* Mobile : sidebar cachée par défaut, glisse depuis la gauche */
    @media (max-width: 767px) {
      .shell { grid-template-columns: 1fr; }

      .shell-sidebar {
        position: fixed; inset: 0 auto 0 0;
        width: 220px; z-index: 100;
        transform: translateX(-100%);
        transition: transform .2s ease;
        box-shadow: none;
      }
      .shell--open .shell-sidebar { transform: translateX(0); }

      .shell-body { grid-column: 1; }

      .shell-overlay {
        display: block; position: fixed; inset: 0; z-index: 99;
        background: rgba(0,0,0,.35);
        opacity: 0; pointer-events: none;
        transition: opacity .2s;
      }
      .shell--open .shell-overlay { opacity: 1; pointer-events: auto; }
    }
  `],
})
export class ShellComponent {
  sidebarOpen = signal(false);
}