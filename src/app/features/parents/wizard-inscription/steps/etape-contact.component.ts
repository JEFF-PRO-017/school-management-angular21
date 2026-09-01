// etape-contact.component.ts
// Étape 1 : téléphones de la famille.
// Le FormGroup est fourni par le parent (référence partagée),
// ce composant se contente de l'afficher et de valider la saisie.
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-etape-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card m-3 shadow-sm rounded-4 p-3">
      <h2 class="h6 fw-bold mb-0">📞 Coordonnées</h2>
      <p class="text-muted small mb-3">Numéros de téléphone de la famille</p>

      <form [formGroup]="form">
        <div class="mb-3">
          <label class="form-label small fw-semibold text-uppercase">Téléphone père *</label>
          <input class="form-control"
                 [class.is-invalid]="tel_pere.invalid && tel_pere.touched"
                 formControlName="tel_pere" type="tel" inputmode="numeric"
                 placeholder="6XX XXX XXX">
          @if (tel_pere.invalid && tel_pere.touched) {
            <div class="invalid-feedback">9 chiffres requis</div>
          }
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold text-uppercase">Téléphone mère</label>
          <input class="form-control" formControlName="tel_mere" type="tel"
                 inputmode="numeric" placeholder="6XX XXX XXX (optionnel)">
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold text-uppercase">Téléphone autre</label>
          <input class="form-control" formControlName="tel_autre" type="tel"
                 inputmode="numeric" placeholder="Optionnel">
        </div>
      </form>

      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-primary flex-fill" (click)="suivant.emit()" [disabled]="form.invalid">
          Suivant →
        </button>
      </div>
    </div>
  `,
})
export class EtapeContactComponent {
  @Input({ required: true }) form!: FormGroup;
  @Output() suivant = new EventEmitter<void>();

  // Raccourci pour accéder au contrôle dans le template
  get tel_pere() { return this.form.controls['tel_pere']; }
}