// enfants-list.component.ts
// Page "Liste des enfants" — espace parent.
// Lecture : ParentService.famille()?.eleves (source centralisée).
//
// Règle : les enfants au statut 'NON-ACTIF' proposent "Supprimer" (fiche pas encore
// validée, on peut l'annuler) ; tous les autres statuts proposent "Modifier".
//
// ⚠️ Hypothèses à vérifier :
//  - Route de modification : '/espace-parent/enfants/:id/modifier'
//  - DeleteServices est bien exporté par le même barrel que ParentService ('../../../../core/services')
import { Component, ChangeDetectionStrategy, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EleveEnrichi } from '../../../../core/models';
import { ParentService } from '../../../../core/services';
import { ParentHeaderComponent } from '../../components/parent-header.component';
import { ParentNavbarComponent } from '../../components/parent-navbar.component';
import { DeleteServices } from '../../../../core/services/@data/_delete.services';

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
            <div class="d-flex align-items-center gap-2 border rounded-3 p-3 shadow-sm bg-white"
                 [class.border-success]="estActif(e)" [class.border-secondary-subtle]="!estActif(e)">

              <!-- Zone cliquable : ouvre la fiche détail -->
              <button type="button"
                      class="btn p-0 border-0 bg-transparent d-flex align-items-center gap-3 flex-grow-1 text-start overflow-hidden"
                      (click)="onOuvrir(e)">
                <div class="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
                     [class.bg-success]="estActif(e)" [class.bg-secondary]="!estActif(e)"
                     style="width:48px;height:48px;font-weight:600">
                  {{ initiales(e) }}
                </div>

                <div class="flex-grow-1 text-truncate">
                  <div class="fw-semibold">{{ e.prenom || '—' }} {{ e.nom || '' }}</div>
                  <div class="small text-muted">{{ e.classe?.nom_classe ?? 'Classe non renseignée' }}</div>
                  <span class="badge" [class.bg-success]="estActif(e)" [class.bg-secondary]="!estActif(e)">
                    {{ e.statut }}
                  </span>
                </div>
              </button>

              <!-- Action selon le statut -->
<!-- Actions : Modifier toujours visible, Supprimer en plus si NON-ACTIF -->
<div class="d-flex gap-2 flex-shrink-0">
  <button type="button" class="btn btn-outline-primary" (click)="onModifier(e)">
    <i class="bi bi-pencil"></i> Modifier
  </button>
  @if (e.statut === 'NON-ACTIF') {
    <button type="button" class="btn btn-outline-danger"
            [disabled]="suppressionEnCours() === e.id_eleve"
            (click)="onSupprimer(e)">
      @if (suppressionEnCours() === e.id_eleve) {
        <span class="spinner-border spinner-border-sm"></span>
      } @else {
        <i class="bi bi-trash"></i> Supprimer
      }
    </button>
  }
</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EnfantsListComponent implements OnInit {
  /** Lecture centralisée : famille() est la seule source, exposée par ParentService. */
  enfants = computed(() => this.parentService.famille()?.eleves ?? []);

  /** id_eleve en cours de suppression (pour désactiver uniquement son bouton). */
  suppressionEnCours = signal<string | null>(null);

  constructor(
    private parentService: ParentService,
    private deleteSvc: DeleteServices,
    private router: Router,
  ) { }

  ngOnInit(): void {
    console.log('enfants', this.enfants());
  }

  initiales(e: EleveEnrichi): string {
    return `${e.prenom?.charAt(0) ?? ''}${e.nom?.charAt(0) ?? ''}`.toUpperCase() || '?';
  }

  /** Tout ce qui n'est pas 'NON-ACTIF' est considéré actif (statuts futurs inclus). */
  estActif(e: EleveEnrichi): boolean {
    return e.statut !== 'NON-ACTIF';
  }

  onOuvrir(e: EleveEnrichi): void {
    this.router.navigate(['/espace-parent/enfants', e.id_eleve]);
  }

  onModifier(e: EleveEnrichi): void {
    this.router.navigate(['/espace-parent/enfants', e.id_eleve, 'edit']);
  }

  async onSupprimer(e: EleveEnrichi): Promise<void> {
    if (!confirm(`Supprimer définitivement ${e.prenom} ${e.nom} ?`)) return;

    this.suppressionEnCours.set(e.id_eleve);
    try {
      await this.deleteSvc.deleteEleve(e.id_eleve);
    } finally {
      this.suppressionEnCours.set(null);
    }
  }
}