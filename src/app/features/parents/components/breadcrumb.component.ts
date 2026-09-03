// breadcrumb.component.ts
// Fil d'Ariane simple et réutilisable pour les pages de détail.
//
// Usage :
//   <app-breadcrumb [items]="[
//     { label: 'Moratoires', route: '/espace-parent/moratoires' },
//     { label: 'Nouveau moratoire' }
//   ]" />
//
// Le dernier élément (sans route) est affiché comme page active, non cliquable.

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <nav aria-label="breadcrumb" class="px-3 pt-2">
      <ol class="breadcrumb mb-2 small">
        @for (item of items; track item.label; let last = $last) {
          <li class="breadcrumb-item" [class.active]="last" [attr.aria-current]="last ? 'page' : null">
            @if (!last && item.route) {
              <a [routerLink]="item.route" class="text-decoration-none">{{ item.label }}</a>
            } @else {
              <span class="text-muted">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}