// wizard-stepper.component.ts
// Petit composant d'affichage : la barre de progression du wizard (1-2-3-4).
// Il ne contient aucune logique métier, juste de l'affichage.
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export interface EtapeWizard {
  n: 1 | 2 | 3 | 4;
  lbl: string;
}

@Component({
  selector: 'app-wizard-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border-bottom px-3 pt-3 pb-2">
      <!-- Ligne des ronds numérotés -->
      <div class="d-flex align-items-center">
        @for (s of etapes; track s.n; let i = $index) {
          <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
               style="width:26px;height:26px;font-size:11px"
               [class.bg-success]="etapeActuelle > s.n"
               [class.text-white]="etapeActuelle >= s.n"
               [class.bg-primary]="etapeActuelle === s.n"
               [class.bg-secondary-subtle]="etapeActuelle < s.n"
               [class.text-muted]="etapeActuelle < s.n">
            @if (etapeActuelle > s.n) { ✓ } @else { {{ s.n }} }
          </div>

          <!-- Trait de liaison entre deux ronds -->
          @if (i < etapes.length - 1) {
            <div class="flex-fill mx-1"
                 style="height:2px"
                 [class.bg-success]="etapeActuelle > s.n"
                 [class.bg-secondary-subtle]="etapeActuelle <= s.n"></div>
          }
        }
      </div>

      <!-- Ligne des libellés -->
      <div class="d-flex mt-1">
        @for (s of etapes; track s.n) {
          <div class="flex-fill text-center small"
               [class.text-primary]="etapeActuelle === s.n"
               [class.fw-semibold]="etapeActuelle === s.n"
               [class.text-muted]="etapeActuelle !== s.n">
            {{ s.lbl }}
          </div>
        }
      </div>
    </div>
  `,
})
export class WizardStepperComponent {
  @Input() etapes: EtapeWizard[] = [];
  @Input() etapeActuelle: 1 | 2 | 3 | 4 = 1;
}