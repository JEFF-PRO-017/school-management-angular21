// page-not-found.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
      <mat-icon style="font-size:72px;width:72px;height:72px;color:var(--bs-primary)">
        school
      </mat-icon>
      <h1 class="mt-3 text-primary">404</h1>
      <p class="text-muted">Page introuvable</p>
      <a routerLink="/espace-administration/dashboard" mat-raised-button color="primary">
        Retour à l'accueil
      </a>
    </div>
  `
})
export class PageNotFoundComponent {}
