// app.component.ts — composant racine minimal (standalone)
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // Le layout complet est dans LayoutComponent — ici juste le outlet racine
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent { }
export const titleApp = 'Berceau Du Savoir';

