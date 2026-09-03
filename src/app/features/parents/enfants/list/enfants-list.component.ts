// enfants-list.component.ts
// Page "Liste des enfants" — espace parent.
// Interface adaptée mobile : cartes empilées, cliquables vers le détail.

import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EleveEnrichi } from '../../../../core/models';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { EleveService } from '../eleve.service';



@Component({
  selector: 'app-enfants-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ParentHeaderComponent, ParentNavbarComponent],
  template: `
    <app-parent-header titre="Mes enfants"></app-parent-header>
    <app-parent-navbar></app-parent-navbar>

    <div class="container-fluid p-3">
      @if (enfants().length === 0) {
        <div class="text-center text-muted py-5">Aucun enfant enregistré</div>
      } @else {
        <div class="d-flex flex-column gap-2">
          @for (e of enfants(); track e.id_eleve) {
            <button
              type="button"
              class="btn btn-white border rounded-3 d-flex align-items-center gap-3 p-3 text-start shadow-sm"
              (click)="onOuvrir(e)">

              <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                   style="width:48px;height:48px;font-weight:600">
                {{ initiales(e) }}
              </div>

              <div class="flex-grow-1">
                <div class="fw-semibold">{{ e.prenom }} {{ e.nom }}</div>
                <div class="small text-muted">
                  {{ e.classe?.nom_classe ?? 'Classe non renseignée' }}
                </div>
              </div>

              <i class="bi bi-chevron-right text-muted"></i>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class EnfantsListComponent {
  enfants = computed(() => this.eleveService.enfantsFamille());

  constructor(
    private eleveService: EleveService,
    private router: Router,
  ) {}

  initiales(e: EleveEnrichi): string {
    return `${e.prenom?.charAt(0) ?? ''}${e.nom?.charAt(0) ?? ''}`.toUpperCase();
  }

  onOuvrir(e: EleveEnrichi): void {
    this.router.navigate(['/espace-parent/enfants', e.id_eleve]);
  }
}