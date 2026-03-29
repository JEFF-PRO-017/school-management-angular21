// empty-state.component.ts — affiché quand une liste est vide
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="text-center py-5 text-muted">
      <mat-icon style="font-size:48px;width:48px;height:48px">{{ icon }}</mat-icon>
      <p class="mt-2 mb-1 fw-semibold">{{ title }}</p>
      <p class="small">{{ subtitle }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon     = 'inbox';
  @Input() title    = 'Aucun résultat';
  @Input() subtitle = '';
}
