import { Component, inject } from '@angular/core';
import { UpdateService } from '../../core/services/update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  template: `
    @if (updateService.miseAJourDisponible()) {
      <div class="position-fixed bottom-0 start-50 translate-middle-x mb-3 px-3" style="z-index: 1080; width: max-content; max-width: 92vw;">
        <div class="alert alert-dark d-flex align-items-center justify-content-between gap-3 shadow-lg mb-0 py-2 px-3 rounded-3" role="alert">
          <span class="small">Une nouvelle version de l'application est disponible.</span>
          <div class="d-flex gap-2 flex-shrink-0">
            <button type="button" class="btn btn-sm btn-outline-light" (click)="updateService.ignorerPourInstant()">
              Plus tard
            </button>
            <button type="button" class="btn btn-sm btn-warning fw-semibold" (click)="updateService.appliquerMiseAJour()">
              Mettre à jour
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class UpdateBannerComponent {
  updateService = inject(UpdateService);
}