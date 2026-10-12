// header.component.ts — barre supérieure : statut réseau, actions rapides, compte
import { Component, Output, EventEmitter, inject,  computed } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../core/services/auth.service';
import { titleApp } from '../../../app.component';
import { DataServiceBase } from '../../../core/services/@data/_data.base.service';
import { ReseauxComponent } from '../Reseaux/reseaux.composant';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FaIconComponent, ReseauxComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  private auth = inject(AuthService);
  readonly data = inject(DataServiceBase);
  titleApp = titleApp;

  // Icônes utilisées dans le template
  icons = { faBars, faClockRotateLeft, faTrash, faArrowsRotate, faRightFromBracket };

  user = this.auth.user;

  section = computed(() => this.auth.getSectionActive());

  // Initiales affichées dans l'avatar (2 premières lettres du nom)
  initiales = computed(() =>
    (this.user()?.nom ?? '')
      .split(' ').map((w: string) => w[0] ?? '')
      .join('').toUpperCase().slice(0, 2)
  );

  logout(): void { this.auth.logout(); }
}