// sidebar.component.ts — navigation latérale générée depuis une structure de données
import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faGaugeHigh, faPeopleGroup, faUserGraduate, faChalkboard, faBook,
  faMoneyBillWave, faTriangleExclamation, faPenToSquare, faFileLines,
  faCalendarXmark, faUserGear, faClipboardList, faComments, faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../core/services/auth.service';
import { titleApp } from '../../../app.component';

// Un lien de menu : libellé, route, icône Font Awesome et condition d'affichage
interface NavItem {
  label: string;
  route: string;
  icon?: any;  // absent pour les sous-liens (indent) sans icône
  indent?: boolean;        // affiché en retrait (sous-lien)
  external?: boolean;      // ouvre dans un nouvel onglet
  visible: () => boolean;
}

// Un groupe de liens sous un même titre de section (titre optionnel pour le premier bloc)
interface NavSection {
  title?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  // Le composant lui-même doit être un item flex qui grandit et se limite en hauteur,
  // sinon le h-100 du <nav> à l'intérieur n'a aucune hauteur de référence pour scroller.
  host: { class: 'd-flex flex-column flex-grow-1 overflow-hidden' },
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private auth = inject(AuthService);
  titleApp = titleApp;

  isAdmin = this.auth.isAdmin;
  private can = (p: string) => this.auth.hasPermission(p as any);

  sectionLabel = computed(() =>
    this.auth.getSectionActive() === 'primaire' ? 'Section primaire' : 'Section secondaire'
  );

  // Structure complète du menu.
  // Reclassement : "Paiement" et "Insolvables" sont réunis sous "Finances"
  // (avant, ils étaient dispersés entre "Référentiels" et "Transactions").
  private sections: NavSection[] = [
    {
      items: [
        { label: 'Tableau de bord', route: '/espace-administration/dashboard', icon: faGaugeHigh, visible: () => true },
      ],
    },
    {
      title: 'Référentiels',
      items: [
        { label: 'Familles', route: '/espace-administration/familles', icon: faPeopleGroup, visible: () => this.can('familles') },
        { label: 'Élèves', route: '/espace-administration/eleves', icon: faUserGraduate, visible: () => this.can('eleves') },
        { label: 'Classes', route: '/espace-administration/classes', icon: faChalkboard, visible: () => this.can('classes') },
        { label: 'Matières', route: '/espace-administration/matieres', icon: faBook, visible: () => this.can('matieres') },
      ],
    },
    {
      title: 'Finances',
      items: [
        { label: 'Paiement', route: '/espace-administration/paiement', icon: faMoneyBillWave, visible: () => this.can('paiement') },
        { label: 'Insolvables', route: '/espace-administration/insolvables', icon: faTriangleExclamation, visible: () => this.can('insolvables') },
      ],
    },
    {
      title: 'Pédagogie',
      items: [
        { label: 'Notes', route: '/espace-administration/notes/enregistrement', icon: faPenToSquare, visible: () => this.can('notes') },
        { label: 'Bulletins', route: '/espace-administration/notes/bulletins', icon: faFileLines, visible: () => this.can('bulletins') },
        { label: 'Absences', route: '/espace-administration/absences/enregistrement', icon: faCalendarXmark, visible: () => this.can('absences') },
        { label: 'Historique', route: '/espace-administration/absences/historique', icon: faClockRotateLeft, visible: () => this.can('historique_absences') },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'WhatsApp', route: '/espace-administration/whatsapp', icon: faComments, visible: () => this.can('whatsapp') },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Utilisateurs', route: '/espace-administration/users', icon: faUserGear, visible: () => this.can('users') },
      ],
    },
    {
      title: 'Espace parent',
      items: [
        {
          label: 'Inscriptions tampon', route: '/espace-administration/consultant', icon: faClipboardList,
          visible: () => this.can('validation_parents'),
        },
        {
          label: 'Aperçu espace parent', route: '/espace-parent/login', indent: true, external: true,
          visible: () => this.can('validation_parents'),
        },
      ],
    },
  ];

  // Filtre les items invisibles, puis retire les sections devenues vides
  visibleSections = computed(() =>
    this.sections
      .map(s => ({ ...s, items: s.items.filter(i => i.visible()) }))
      .filter(s => s.items.length > 0)
  );
}