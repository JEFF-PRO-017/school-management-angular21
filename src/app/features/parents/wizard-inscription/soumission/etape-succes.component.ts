// etape-succes.component.ts
// Écran affiché une fois l'inscription envoyée avec succès.
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-etape-succes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card m-3 shadow-sm rounded-4 p-4 text-center">
      <div style="font-size:52px" class="mb-3">🎉</div>
      <h2 class="h5 fw-bold text-success mb-2">Demande envoyée !</h2>
      <p class="text-secondary small">
        Votre inscription a bien été reçue.<br>
        Un administrateur validera vos informations sous <strong>24 à 48 heures</strong>.
      </p>
      <button class="btn btn-primary w-100 mt-3" (click)="retour.emit()">
        Retour à l'accueil
      </button>
    </div>
  `,
})
export class EtapeSuccesComponent {
  @Output() retour = new EventEmitter<void>();
}