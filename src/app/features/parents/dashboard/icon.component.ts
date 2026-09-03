// icon.component.ts
// Composant icône unique pour toute l'appli : <app-icon name="bell"></app-icon>
// Évite d'importer une variable par icône dans chaque composant :
// on centralise le mapping "nom simple" → icône FontAwesome ici.
//
// ⚠️ Placer ce fichier dans un dossier partagé (ex: core/shared/ui/) et ajuster
// les imports des composants qui l'utilisent selon son emplacement réel.
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell, faArrowRotateRight, faTriangleExclamation, faChartLine,
  faCalendarDays, faCreditCard, faCalendarCheck, faUserPlus,
  faRightFromBracket, faSackDollar, faCircleInfo, faClipboardCheck,
  faWallet, faHouse, IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

// Ajouter ici une ligne à chaque fois qu'une nouvelle icône est nécessaire ailleurs.
const CATALOGUE_ICONES: Record<string, IconDefinition> = {
  'bell': faBell,
  'arrow-rotate-right': faArrowRotateRight,
  'triangle-exclamation': faTriangleExclamation,
  'chart-line': faChartLine,
  'calendar-days': faCalendarDays,
  'credit-card': faCreditCard,
  'calendar-check': faCalendarCheck,
  'user-plus': faUserPlus,
  'right-from-bracket': faRightFromBracket,
  'sack-dollar': faSackDollar,
  'circle-info': faCircleInfo,
  'clipboard-check': faClipboardCheck,
  'wallet': faWallet,
  'house': faHouse,
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule],
  template: `<fa-icon [icon]="icone()" [class.fa-spin]="spin"></fa-icon>`,
})
export class IconComponent {
  /** Nom simple de l'icône, ex: "bell". Voir CATALOGUE_ICONES ci-dessus. */
  @Input({ required: true }) name!: string;
  /** Anime l'icône en rotation (utile pour le bouton "actualiser" pendant le chargement) */
  @Input() spin = false;

  icone(): IconDefinition {
    const trouvee = CATALOGUE_ICONES[this.name];
    if (!trouvee) {
      console.warn(`[app-icon] Icône inconnue: "${this.name}" — pense à l'ajouter au catalogue.`);
      return faCircleInfo;
    }
    return trouvee;
  }
}